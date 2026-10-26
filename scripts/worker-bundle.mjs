import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
await mkdir('.cache/worker-assets', { recursive: true })
await writeFile(
  '.cache/worker-assets/index.html',
  '<!doctype html><title>Local Worker test</title>',
)
const result = spawnSync(
  process.execPath,
  [
    'node_modules/wrangler/bin/wrangler.js',
    'deploy',
    '--dry-run',
    '--outdir',
    '.cache/worker',
    '--assets',
    '.cache/worker-assets',
  ],
  {
    stdio: 'inherit',
    windowsHide: true,
    env: {
      ...process.env,
      CI: 'true',
      WRANGLER_SEND_METRICS: 'false',
      XDG_CONFIG_HOME: resolve('.cache/wrangler-config'),
      WRANGLER_LOG_PATH: resolve('.cache/wrangler.log'),
    },
  },
)
process.exitCode = result.status ?? 1
