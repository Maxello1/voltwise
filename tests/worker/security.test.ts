import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { contentHash, batchSize, type SyncEvent } from '../../src/sync/protocol'
import { resolveExercise } from '../../src/content/exercise-catalogue'
import { scheduleReview } from '../../src/domain/review'
import { testCloud, testAttempt, seedForeign, testOwner, type TestCloud } from './harness'

let cloud: TestCloud
beforeEach(async () => {
  cloud = await testCloud()
})
afterEach(async () => {
  await cloud.dispose()
})
function attempt(): SyncEvent {
  const event = testAttempt()
  if (event.kind === 'attempt')
    event.data.conceptIds = resolveExercise(event.data.exerciseId)!.conceptIds
  return event
}
describe('OAuth and private sessions', () => {
  it('uses S256, exact callback, empty scope, a bound HttpOnly cookie and a one-use state', async () => {
    const start = await cloud.begin()
    expect(start.url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(start.url.searchParams.get('code_challenge')).toHaveLength(43)
    expect(start.url.searchParams.get('scope')).toBe('')
    expect(start.url.searchParams.get('redirect_uri')).toBe(
      'https://voltwise.test/api/auth/callback',
    )
    const wrong = await cloud.request('auth/callback?code=x&state=wrong', {}, start.cookie)
    expect(wrong.status).toBe(400)
    cloud.mockIdentity()
    const reused = await cloud.request(
      `auth/callback?code=x&state=${start.url.searchParams.get('state')}`,
      {},
      start.cookie,
    )
    expect(reused.status).toBe(400)
    const valid = await cloud.login()
    const sessionHeader = valid.cookieHeaders.find((value) =>
      value.startsWith('__Host-vw_session='),
    )!
    expect(sessionHeader).toMatch(/HttpOnly/)
    expect(sessionHeader).toMatch(/Secure/)
    expect(sessionHeader).toMatch(/SameSite=Lax/)
    expect(sessionHeader).toMatch(/Path=\//)
    const codeRequest = cloud.tokenRequests.at(-1)!
    expect(codeRequest.get('code_verifier')).toHaveLength(43)
    const challenge = Buffer.from(
      await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(codeRequest.get('code_verifier')!),
      ),
    ).toString('base64url')
    expect(challenge).toBe(valid.authorizationUrl.searchParams.get('code_challenge'))
    expect(codeRequest.get('redirect_uri')).toBe('https://voltwise.test/api/auth/callback')
    expect(codeRequest.get('client_id')).toBe('test-client')
    expect(codeRequest.get('client_secret')).toBe('test-only-secret')
    const res = await cloud.request('auth/session', {}, valid.cookie)
    expect(res.headers.get('cache-control')).toContain('no-store')
    expect(await res.json()).toMatchObject({ authenticated: true, ownerId: testOwner })
    const sessionRows = await cloud.database.prepare('SELECT * FROM sessions').all()
    expect(JSON.stringify(sessionRows)).not.toContain('test-only-github-token')
  })
  it('rejects missing cookies, expired state and unauthorized stable GitHub IDs', async () => {
    expect((await cloud.request('v1/events?protocol=1&cursor=0')).status).toBe(401)
    expect((await cloud.request('auth/callback?code=x&state=x')).status).toBe(400)
    const expired = await cloud.begin()
    await cloud.database.prepare('UPDATE oauth_flows SET expires_at = 0').run()
    expect(
      (
        await cloud.request(
          `auth/callback?code=x&state=${expired.url.searchParams.get('state')}`,
          {},
          expired.cookie,
        )
      ).status,
    ).toBe(400)
    const start = await cloud.begin()
    cloud.mockIdentity(999999)
    expect(
      (
        await cloud.request(
          `auth/callback?code=x&state=${start.url.searchParams.get('state')}`,
          {},
          start.cookie,
        )
      ).status,
    ).toBe(403)
    expect((await cloud.database.prepare('SELECT * FROM sessions').all()).results).toHaveLength(0)
  })
  it('expires and revokes sessions, keeps device revocation sticky and logs out without deleting events', async () => {
    const a = await cloud.login(),
      b = await cloud.login()
    const expire = await cloud.login()
    await cloud.database
      .prepare('UPDATE sessions SET expires_at = 0 WHERE device_id = ?')
      .bind(expire.deviceId)
      .run()
    expect((await cloud.request('v1/events?protocol=1&cursor=0', {}, expire.cookie)).status).toBe(
      401,
    )
    const revoked = await cloud.request(
      'v1/devices/revoke',
      cloud.jsonOptions({ deviceId: b.deviceId }, a.session.csrf),
      a.cookie,
    )
    expect(revoked.status).toBe(200)
    expect((await cloud.request('v1/events?protocol=1&cursor=0', {}, b.cookie)).status).toBe(401)
    const start = await cloud.begin(b.deviceId)
    cloud.mockIdentity()
    expect(
      (
        await cloud.request(
          `auth/callback?code=x&state=${start.url.searchParams.get('state')}`,
          {},
          start.cookie,
        )
      ).status,
    ).toBe(403)
    await a.transport.upload([attempt()], a.session.csrf!)
    expect(
      (await cloud.request('auth/logout', cloud.jsonOptions({}, a.session.csrf), a.cookie)).status,
    ).toBe(200)
    expect((await cloud.request('v1/events?protocol=1&cursor=0', {}, a.cookie)).status).toBe(401)
    expect(
      (await cloud.database.prepare('SELECT COUNT(*) AS n FROM events').first<{ n: number }>())?.n,
    ).toBe(1)
  })
  it('rejects cross-site origins, missing CSRF, broad scopes and callback origin changes', async () => {
    const a = await cloud.login()
    expect(
      (
        await cloud.request(
          'v1/events',
          cloud.jsonOptions({ protocol: 1, events: [attempt()] }, '', 'https://evil.test'),
          a.cookie,
        )
      ).status,
    ).toBe(403)
    expect(
      (
        await cloud.request(
          'v1/events',
          cloud.jsonOptions({ protocol: 1, events: [attempt()] }),
          a.cookie,
        )
      ).status,
    ).toBe(403)
    expect((await cloud.request('v1/devices/revoke', { method: 'POST' }, a.cookie)).status).toBe(
      403,
    )
    const start = await cloud.begin()
    cloud.mockIdentity(Number(testOwner), 'repo')
    expect(
      (
        await cloud.request(
          `auth/callback?code=x&state=${start.url.searchParams.get('state')}`,
          {},
          start.cookie,
        )
      ).status,
    ).toBe(403)
    expect((await cloud.mf.dispatchFetch('https://evil.test/api/auth/callback')).status).toBe(403)
  })
})
describe('transactional event API', () => {
  it('accepts identical retries without duplication and rolls the whole batch back on different contents', async () => {
    const a = await cloud.login(),
      original = attempt()
    const first = await a.transport.upload([original], a.session.csrf!)
    expect(await a.transport.upload([original], a.session.csrf!)).toEqual(first)
    const altered = structuredClone(original)
    if (altered.kind === 'attempt') altered.data.answer = 'modified'
    const res = await cloud.request(
      'v1/events',
      cloud.jsonOptions({ protocol: 1, events: [attempt(), altered] }, a.session.csrf),
      a.cookie,
    )
    expect(res.status).toBe(409)
    expect(
      (await cloud.database.prepare('SELECT COUNT(*) AS n FROM events').first<{ n: number }>())?.n,
    ).toBe(1)
    expect(
      (
        await cloud.database
          .prepare('SELECT COUNT(*) AS n FROM session_history')
          .first<{ n: number }>()
      )?.n,
    ).toBe(1)
  })
  it('paginates without skip/duplicate across retries and isolates the verified owner', async () => {
    const a = await cloud.login()
    const foreign = await seedForeign(cloud)
    await a.transport.upload(Array.from({ length: batchSize }, attempt), a.session.csrf!)
    await a.transport.upload([attempt(), attempt()], a.session.csrf!)
    const first = await a.transport.download(0)
    expect(first.events).toHaveLength(batchSize)
    expect(first.hasMore).toBe(true)
    expect(await a.transport.download(0)).toEqual(first)
    const last = await a.transport.download(first.cursor)
    expect(last.events).toHaveLength(2)
    expect(last.hasMore).toBe(false)
    expect(new Set([...first.events, ...last.events].map((e) => e.eventId)).size).toBe(
      batchSize + 2,
    )
    expect(first.events.some((e) => e.eventId === foreign.eventId)).toBe(false)
    const ownerSpoof = await cloud.request(
      'v1/events',
      cloud.jsonOptions({ protocol: 1, ownerId: '999999', events: [attempt()] }, a.session.csrf),
      a.cookie,
    )
    expect(ownerSpoof.status).toBe(400)
    for (const e of first.events) expect(e.hash).toBe(await contentHash(e.event))
  })
  it('validates review dependencies transactionally and retains explicit ratings', async () => {
    const a = await cloud.login(),
      source = attempt()
    if (source.kind !== 'attempt') throw new Error('fixture')
    const scheduled = scheduleReview(undefined, 2, new Date(source.createdAt))
    const eventId = crypto.randomUUID()
    const review: SyncEvent = {
      schemaVersion: 1,
      kind: 'review',
      eventId,
      deviceId: source.deviceId,
      createdAt: source.createdAt,
      data: {
        eventId,
        attemptId: source.eventId,
        deviceId: source.deviceId,
        createdAt: source.createdAt,
        exerciseId: source.data.exerciseId,
        rating: 2,
        schedulerVersion: 'ts-fsrs@5.4.2',
        retention: 0.9,
        cardBefore: scheduled.before,
        cardAfter: scheduled.after,
        log: scheduled.log,
      },
    }
    const missing = await cloud.request(
      'v1/events',
      cloud.jsonOptions({ protocol: 1, events: [attempt(), review] }, a.session.csrf),
      a.cookie,
    )
    expect(missing.status).toBe(409)
    expect(
      (await cloud.database.prepare('SELECT COUNT(*) AS n FROM events').first<{ n: number }>())?.n,
    ).toBe(0)
    expect(await a.transport.upload([review, source], a.session.csrf!)).toHaveLength(2)
    const unsupported = structuredClone(review)
    ;(unsupported.data as unknown as { schedulerVersion: string }).schedulerVersion = 'future-fsrs'
    expect(
      (
        await cloud.request(
          'v1/events',
          cloud.jsonOptions({ protocol: 1, events: [unsupported] }, a.session.csrf),
          a.cookie,
        )
      ).status,
    ).toBe(400)
  })
  it('rejects unsupported/malformed versions and streaming oversized bodies; reports backend failure safely', async () => {
    const a = await cloud.login()
    for (const body of [
      { protocol: 2, events: [attempt()] },
      { protocol: 1, events: [{ ...attempt(), schemaVersion: 2 }] },
      { protocol: 1, events: Array.from({ length: 21 }, attempt) },
    ])
      expect(
        (await cloud.request('v1/events', cloud.jsonOptions(body, a.session.csrf), a.cookie))
          .status,
      ).toBe(400)
    const oversized = await cloud.request(
      'v1/events',
      {
        method: 'POST',
        headers: {
          Origin: 'https://voltwise.test',
          'X-CSRF-Token': a.session.csrf!,
          'Content-Type': 'application/json',
        },
        body: ' '.repeat(256 * 1024 + 1),
      },
      a.cookie,
    )
    expect(oversized.status).toBe(413)
    await cloud.database.prepare('DROP TABLE events').run()
    const failure = await cloud.request('v1/events?protocol=1&cursor=0', {}, a.cookie)
    expect(failure.status).toBe(503)
    expect(await failure.json()).toEqual({ error: 'backend_unavailable' })
    expect(failure.headers.get('access-control-allow-origin')).toBeNull()
  })
})
it('fails closed without configured credentials or with an invalid production callback origin', async () => {
  for (const bindings of [
    { GITHUB_CLIENT_SECRET: '' },
    { APP_ORIGIN: 'https://voltwise.test/redirect' },
    { APP_ORIGIN: 'http://unsafe.test' },
  ] as Record<string, string>[]) {
    const invalid = await testCloud(1000, 1000, bindings)
    try {
      const response = await invalid.request('auth/session')
      expect(response.status).toBe(503)
      expect(await response.json()).toEqual({ error: 'not_configured' })
    } finally {
      await invalid.dispose()
    }
  }
})
it('serializes concurrent identical uploads and rejects a foreign-owner session even with a valid token hash', async () => {
  const a = await cloud.login(),
    event = attempt()
  const [first, second] = await Promise.all([
    a.transport.upload([event], a.session.csrf!),
    a.transport.upload([event], a.session.csrf!),
  ])
  expect(first).toEqual(second)
  await seedForeign(cloud)
  const token = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')
  const deviceId = crypto.randomUUID()
  await cloud.database
    .prepare('INSERT INTO devices(owner_id,id,label,created_at) VALUES (?,?,?,?)')
    .bind('999999', deviceId, 'Foreign', '2026-10-25T10:00:00.000Z')
    .run()
  await cloud.database
    .prepare('INSERT INTO sessions VALUES (?,?,?,?,?,?)')
    .bind(
      await contentHash(token),
      '999999',
      deviceId,
      'untrusted-csrf',
      '2026-10-25T10:00:00.000Z',
      Date.now() + 100000,
    )
    .run()
  expect(
    (await cloud.request('v1/events?protocol=1&cursor=0', {}, `__Host-vw_session=${token}`)).status,
  ).toBe(401)
})
it('enforces platform rate limiting before creating OAuth flow rows', async () => {
  const limited = await testCloud(1)
  try {
    expect(
      (
        await limited.request(
          'auth/start',
          limited.jsonOptions({ deviceId: crypto.randomUUID(), label: 'A' }),
        )
      ).status,
    ).toBe(200)
    const response = await limited.request(
      'auth/start',
      limited.jsonOptions({ deviceId: crypto.randomUUID(), label: 'B' }),
    )
    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('60')
  } finally {
    await limited.dispose()
  }
})
