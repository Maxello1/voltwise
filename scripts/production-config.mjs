import { readFile, writeFile } from 'node:fs/promises'
const { CLOUDFLARE_DATABASE_ID, APP_ORIGIN, OWNER_GITHUB_ID, GITHUB_CLIENT_ID } = process.env
if (
  !CLOUDFLARE_DATABASE_ID ||
  !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(CLOUDFLARE_DATABASE_ID)
)
  throw new Error('Set the actual CLOUDFLARE_DATABASE_ID.')
const origin = new URL(APP_ORIGIN ?? '')
if (
  origin.protocol !== 'https:' ||
  origin.origin !== APP_ORIGIN ||
  origin.username ||
  origin.password
)
  throw new Error('APP_ORIGIN must be the exact HTTPS origin, without trailing slash.')
if (!/^[1-9]\d*$/.test(OWNER_GITHUB_ID ?? '') || !GITHUB_CLIENT_ID)
  throw new Error('Set OWNER_GITHUB_ID and GITHUB_CLIENT_ID.')
const source = await readFile('wrangler.jsonc', 'utf8')
const config = JSON.parse(source.replace(/^\s*\/\/.*$/gm, ''))
config.vars = { APP_ORIGIN, OWNER_GITHUB_ID, GITHUB_CLIENT_ID }
config.d1_databases[0].database_id = CLOUDFLARE_DATABASE_ID
await writeFile('wrangler.production.jsonc', JSON.stringify(config, null, 2) + '\n')
console.log('Created ignored production configuration. No OAuth secret was read or written.')
