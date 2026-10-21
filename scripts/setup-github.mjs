// Local setup only. Credentials stay in memory and are never written or logged.
import { mkdir, writeFile } from 'node:fs/promises'
import { githubSession } from './github-auth.mjs'
const { headers, login } = await githubSession()
const repositories = []
for (const [name, isPrivate, description] of [
  ['voltwise', false, 'German-first offline electronics learning with interactive SVG schematics.'],
  ['voltwise-data', true, 'Private archive destination for future Voltwise learning-data backups.'],
]) {
  const lookup = await fetch(`https://api.github.com/repos/${login}/${name}`, { headers })
  if (lookup.status === 200) {
    const existing = await lookup.json()
    repositories.push({
      name,
      url: existing.html_url,
      cloneUrl: existing.clone_url,
      created: false,
      private: existing.private,
      size: existing.size,
    })
    continue
  }
  if (lookup.status !== 404) throw new Error(`Could not check repository name (${lookup.status})`)
  const response = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers,
    body: JSON.stringify({ name, private: isPrivate, description, auto_init: false }),
  })
  if (response.status !== 201)
    throw new Error(
      `Repository creation failed (${response.status}); no existing repository was changed.`,
    )
  const repository = await response.json()
  repositories.push({
    name,
    url: repository.html_url,
    cloneUrl: repository.clone_url,
    created: true,
    private: repository.private,
    size: repository.size,
  })
}
await mkdir('.publish', { recursive: true })
await writeFile('.publish/repos.json', JSON.stringify(repositories, null, 2))
console.log(JSON.stringify(repositories, null, 2))
