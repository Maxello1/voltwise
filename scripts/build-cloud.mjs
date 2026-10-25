import { spawnSync } from 'node:child_process'
const result = spawnSync(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    'build',
    ...(process.argv.includes('--test') ? ['--outDir', '.cache/cloud-dist'] : []),
  ],
  {
    stdio: 'inherit',
    windowsHide: true,
    env: { ...process.env, VITE_CLOUD_SYNC: 'true', VITE_BASE_PATH: '/' },
  },
)
process.exitCode = result.status ?? 1
