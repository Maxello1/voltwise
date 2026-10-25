import { readFile } from 'node:fs/promises'
import { Miniflare, Response as LocalResponse, type Request as LocalRequest } from 'miniflare'
import { contentHash, type SyncEvent, type Receipt } from '../../src/sync/protocol'
import type { SyncTransport } from '../../src/sync/engine'
import type { CloudSession } from '../../src/sync/types'
import { resolveExercise } from '../../src/content/exercise-catalogue'

export const testOrigin = 'https://voltwise.test'
export const testOwner = '123456'
export async function testCloud(
  authLimit = 1000,
  apiLimit = 1000,
  extraBindings: Record<string, string> = {},
) {
  const identities: { id: number; scope: string }[] = []
  const tokenRequests: URLSearchParams[] = []
  let currentIdentity: { id: number; scope: string } | undefined
  const mf = new Miniflare({
    modules: true,
    scriptPath: '.cache/worker/index.js',
    compatibilityDate: '2026-07-30',
    d1Databases: ['DB'],
    outboundService: async (request: LocalRequest) => {
      if (
        request.url === 'https://github.com/login/oauth/access_token' &&
        request.method === 'POST'
      ) {
        currentIdentity = identities.shift()
        if (!currentIdentity) return new LocalResponse('Unmocked identity', { status: 502 })
        tokenRequests.push(new URLSearchParams(await request.text()))
        return LocalResponse.json({
          access_token: 'test-only-github-token',
          token_type: 'bearer',
          scope: currentIdentity.scope,
        })
      }
      if (request.url === 'https://api.github.com/user' && currentIdentity)
        return LocalResponse.json({ id: currentIdentity.id, login: 'synthetic-owner' })
      return new LocalResponse('No external network is allowed in tests', { status: 502 })
    },
    bindings: {
      APP_ORIGIN: testOrigin,
      GITHUB_CLIENT_ID: 'test-client',
      GITHUB_CLIENT_SECRET: 'test-only-secret',
      OWNER_GITHUB_ID: testOwner,
      ...extraBindings,
    },
    ratelimits: {
      AUTH_LIMITER: { namespace_id: '1001', simple: { limit: authLimit, period: 60 } },
      API_LIMITER: { namespace_id: '1002', simple: { limit: apiLimit, period: 60 } },
    },
  })
  const database = await mf.getD1Database('DB')
  // Each complete CREATE block includes its trigger body. D1.exec splits on newlines.
  const sql = await readFile('worker/migrations/0001_sync.sql', 'utf8')
  await database.batch(
    sql
      .split(/\n(?=CREATE )/)
      .filter((s) => s.trim())
      .map((s) => database.prepare(s)),
  )
  async function request(path: string, options: RequestInit = {}, cookie = '') {
    return mf.dispatchFetch(`${testOrigin}/api/${path}`, {
      method: options.method,
      body: options.body as string | undefined,
      headers: { Cookie: cookie, ...Object.fromEntries(new Headers(options.headers)) },
      redirect: 'manual',
    })
  }
  function jsonOptions(body: unknown, csrf = '', origin = testOrigin): RequestInit {
    return {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin, 'X-CSRF-Token': csrf },
      body: JSON.stringify(body),
    }
  }
  async function begin(deviceId: string = crypto.randomUUID()) {
    const start = await request('auth/start', jsonOptions({ deviceId, label: 'Testgerät' }))
    const { url } = (await start.json()) as { url: string }
    return { deviceId, url: new URL(url), cookie: start.headers.get('set-cookie')!.split(';')[0]! }
  }
  function mockIdentity(id: number = Number(testOwner), scope = '') {
    identities.push({ id, scope })
  }
  async function login(deviceId: string = crypto.randomUUID()) {
    const start = await begin(deviceId)
    mockIdentity()
    const callback = await request(
      `auth/callback?code=test-code&state=${start.url.searchParams.get('state')}`,
      {},
      start.cookie,
    )
    if (callback.status !== 303)
      throw new Error(`Test OAuth failed: ${callback.status} ${await callback.text()}`)
    const sessionCookie = callback.headers
      .getSetCookie()
      .find((c) => c.startsWith('__Host-vw_session='))!
      .split(';')[0]!
    const session = (await (
      await request('auth/session', {}, sessionCookie)
    ).json()) as CloudSession
    const transport: SyncTransport = {
      async session() {
        return (await (await request('auth/session', {}, sessionCookie)).json()) as CloudSession
      },
      async upload(events, csrf) {
        const response = await request(
          'v1/events',
          jsonOptions({ protocol: 1, events }, csrf),
          sessionCookie,
        )
        if (response.status !== 200)
          throw new Error(`Upload: ${response.status} ${await response.text()}`)
        return ((await response.json()) as { receipts: Receipt[] }).receipts
      },
      async download(cursor) {
        const response = await request(`v1/events?protocol=1&cursor=${cursor}`, {}, sessionCookie)
        if (response.status !== 200) throw new Error(`Download: ${response.status}`)
        return (await response.json()) as Awaited<ReturnType<SyncTransport['download']>>
      },
    }
    return {
      cookie: sessionCookie,
      authorizationUrl: start.url,
      cookieHeaders: callback.headers.getSetCookie(),
      session,
      transport,
      deviceId,
    }
  }
  return {
    mf,
    database,
    request,
    begin,
    mockIdentity,
    tokenRequests,
    login,
    jsonOptions,
    dispose: () => mf.dispose(),
  }
}
export type TestCloud = Awaited<ReturnType<typeof testCloud>>
export function testAttempt(deviceId = crypto.randomUUID()): SyncEvent {
  const eventId = crypto.randomUUID(),
    sessionId = crypto.randomUUID(),
    createdAt = '2026-10-25T10:00:00.000Z'
  return {
    schemaVersion: 1,
    kind: 'attempt',
    eventId,
    deviceId,
    createdAt,
    data: {
      eventId,
      deviceId,
      sessionId,
      exerciseId: 'unit-current',
      exerciseVersion: 1,
      createdAt,
      conceptIds: resolveExercise('unit-current')!.conceptIds,
      correct: true,
      answer: 'a',
      normalizedAnswer: 'Ampere',
      hints: 0,
      durationMs: 500,
    },
    session: {
      id: sessionId,
      mode: 'practice',
      exerciseIds: ['unit-current'],
      startedAt: createdAt,
    },
  }
}
export async function seedForeign(cloud: TestCloud) {
  const event = testAttempt()
  await cloud.database
    .prepare('INSERT INTO owners VALUES (?, ?)')
    .bind('999999', event.createdAt)
    .run()
  await cloud.database
    .prepare('INSERT INTO session_history VALUES (?, ?, ?)')
    .bind(
      '999999',
      event.kind === 'attempt' ? event.session.id : '',
      JSON.stringify(event.kind === 'attempt' ? event.session : {}),
    )
    .run()
  await cloud.database
    .prepare(
      `INSERT INTO events(owner_id,event_id,kind,schema_version,device_id,hash,payload,created_at,received_at,session_id)
    VALUES (?,?,?,?,?,?,?,?,?,?)`,
    )
    .bind(
      '999999',
      event.eventId,
      event.kind,
      1,
      event.deviceId,
      await contentHash(event),
      JSON.stringify(event),
      event.createdAt,
      event.createdAt,
      event.kind === 'attempt' ? event.session.id : '',
    )
    .run()
  return event
}
