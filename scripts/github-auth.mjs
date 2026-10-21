import { spawnSync } from 'node:child_process'

// Repository maintenance only. Never import this module into frontend code.
export async function githubSession() {
  const credential = spawnSync(
    'git',
    ['-c', 'credential.interactive=never', 'credential', 'fill'],
    {
      input: 'protocol=https\nhost=github.com\n\n',
      encoding: 'utf8',
      windowsHide: true,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'Never' },
    },
  )
  if (credential.status !== 0)
    throw new Error('No existing GitHub credential is available. Sign into Git first.')
  const fields = Object.fromEntries(
    credential.stdout
      .trim()
      .split(/\r?\n/)
      .map((line) => {
        const separator = line.indexOf('=')
        return [line.slice(0, separator), line.slice(separator + 1)]
      }),
  )
  if (!fields.password) throw new Error('No usable GitHub credential.')
  const headers = {
    Authorization: `Bearer ${fields.password}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  }
  const response = await fetch('https://api.github.com/user', { headers })
  if (!response.ok) throw new Error(`Authentication failed (${response.status})`)
  const user = await response.json()
  return { headers, login: user.login }
}
