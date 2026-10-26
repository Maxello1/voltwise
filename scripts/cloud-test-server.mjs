// Isolated browser-test infrastructure. No production authentication bypass exists.
import { Miniflare, createFetchMock } from 'miniflare'
import { readFile } from 'node:fs/promises'
const fetchMock = createFetchMock()
fetchMock.disableNetConnect()
fetchMock
  .get('https://github.com')
  .intercept({ path: '/login/oauth/access_token', method: 'POST' })
  .reply(
    200,
    { access_token: 'test-only-token', token_type: 'bearer', scope: '' },
    { headers: { 'content-type': 'application/json' } },
  )
  .persist()
fetchMock
  .get('https://api.github.com')
  .intercept({ path: '/user', method: 'GET' })
  .reply(200, { id: 123456 }, { headers: { 'content-type': 'application/json' } })
  .persist()
const mf = new Miniflare({
  modules: true,
  scriptPath: '.cache/worker/index.js',
  compatibilityDate: '2026-07-30',
  host: '127.0.0.1',
  port: 8787,
  cf: false,
  fetchMock,
  d1Databases: ['DB'],
  assets: {
    directory: '.cache/cloud-dist',
    binding: 'ASSETS',
    routerConfig: {
      has_user_worker: true,
      static_routing: { user_worker: ['/api/*'] },
    },
    assetConfig: { not_found_handling: 'single-page-application' },
  },
  bindings: {
    APP_ORIGIN: 'http://127.0.0.1:8787',
    GITHUB_CLIENT_ID: 'test-client',
    GITHUB_CLIENT_SECRET: 'test-only-secret',
    OWNER_GITHUB_ID: '123456',
  },
  ratelimits: {
    AUTH_LIMITER: { namespace_id: '1001', simple: { limit: 1000, period: 60 } },
    API_LIMITER: { namespace_id: '1002', simple: { limit: 1000, period: 60 } },
  },
})
const database = await mf.getD1Database('DB')
const sql = await readFile('worker/migrations/0001_sync.sql', 'utf8')
await database.batch(
  sql
    .split(/\n(?=CREATE )/)
    .filter((s) => s.trim())
    .map((s) => database.prepare(s)),
)
console.log(`Local synchronization test server: ${await mf.ready}`)
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    void mf.dispose().then(() => process.exit())
  })
