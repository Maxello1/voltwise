import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { expect, it } from 'vitest'

const script = resolve('scripts/production-config.mjs')
const synthetic = {
  CLOUDFLARE_DATABASE_ID: '60000000-0000-4000-8000-000000000001',
  APP_ORIGIN: 'https://voltwise.test',
  OWNER_GITHUB_ID: '123456',
  GITHUB_CLIENT_ID: 'test-client',
}
async function fixture() {
  await mkdir('.cache', { recursive: true })
  const path = await mkdtemp(resolve('.cache/deployment-test-'))
  const template = await readFile('wrangler.jsonc', 'utf8')
  await writeFile(resolve(path, 'wrangler.jsonc'), template)
  return { path, template }
}
it('generates an isolated production configuration from the actual commented/trailing-comma JSONC template', async () => {
  const { path, template } = await fixture()
  expect(template).toContain('//')
  expect(template).toMatch(/,\s*[}\]]/)
  const result = spawnSync(process.execPath, [script], {
    cwd: path,
    env: { ...process.env, ...synthetic },
    encoding: 'utf8',
    windowsHide: true,
  })
  expect(result.status, result.stderr).toBe(0)
  const output = JSON.parse(await readFile(resolve(path, 'wrangler.production.jsonc'), 'utf8'))
  expect(output.vars).toEqual({
    APP_ORIGIN: synthetic.APP_ORIGIN,
    OWNER_GITHUB_ID: synthetic.OWNER_GITHUB_ID,
    GITHUB_CLIENT_ID: synthetic.GITHUB_CLIENT_ID,
  })
  expect(output.d1_databases[0].database_id).toBe(synthetic.CLOUDFLARE_DATABASE_ID)
  expect(output.assets.run_worker_first).toEqual(['/api/*'])
  expect(output.vars).not.toHaveProperty('GITHUB_CLIENT_SECRET')
})
it('rejects malformed JSONC and insecure origins before writing any production configuration', async () => {
  const { path } = await fixture()
  for (const testCase of [
    { template: '{"broken": ', vars: {} },
    {
      template: await readFile('wrangler.jsonc', 'utf8'),
      vars: { APP_ORIGIN: 'http://unsafe.test' },
    },
  ]) {
    await writeFile(resolve(path, 'wrangler.jsonc'), testCase.template)
    const result = spawnSync(process.execPath, [script], {
      cwd: path,
      env: { ...process.env, ...synthetic, ...testCase.vars },
      encoding: 'utf8',
      windowsHide: true,
    })
    expect(result.status).not.toBe(0)
    await expect(readFile(resolve(path, 'wrangler.production.jsonc'))).rejects.toThrow()
  }
})
