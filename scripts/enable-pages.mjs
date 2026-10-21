import { githubSession } from './github-auth.mjs'
const { headers, login } = await githubSession()
const endpoint = `https://api.github.com/repos/${login}/voltwise/pages`
const lookup = await fetch(endpoint, { headers })
if (lookup.ok) {
  const current = await lookup.json()
  console.log(
    JSON.stringify({
      configured: true,
      buildType: current.build_type,
      url: current.html_url,
      status: current.status,
    }),
  )
} else {
  if (lookup.status !== 404) throw new Error(`Pages lookup failed (${lookup.status})`)
  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ build_type: 'workflow' }),
  })
  if (response.status !== 201)
    throw new Error(
      `Pages activation failed (${response.status}). Use Settings → Pages → GitHub Actions.`,
    )
  const current = await response.json()
  console.log(
    JSON.stringify({
      configured: true,
      buildType: current.build_type,
      url: current.html_url,
      status: current.status,
    }),
  )
}
