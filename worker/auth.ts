import * as oauth from 'oauth4webapi'
import { z } from 'zod'
import { contentHash } from '../src/sync/protocol'
import { HttpError, json, readJson, requireOrigin } from './http'
import type { Env } from './types'

const server: oauth.AuthorizationServer = {
  issuer: 'https://github.com',
  authorization_endpoint: 'https://github.com/login/oauth/authorize',
  token_endpoint: 'https://github.com/login/oauth/access_token',
  code_challenge_methods_supported: ['S256'],
}
function cookieName(origin: URL, kind: string) {
  return `${origin.protocol === 'https:' ? '__Host-' : ''}vw_${kind}`
}
function readCookie(request: Request, name: string) {
  const found = (request.headers.get('Cookie') ?? '')
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${name}=`))
  return found.length === 1 ? found[0]!.slice(name.length + 1) : undefined
}
export function cookie(origin: URL, kind: string, value: string, age: number) {
  return `${cookieName(origin, kind)}=${value}; Path=/; HttpOnly; ${origin.protocol === 'https:' ? 'Secure; ' : ''}SameSite=Lax; Max-Age=${age}`
}
export interface AuthSession {
  token_hash: string
  owner_id: string
  device_id: string
  csrf: string
  expires_at: number
}
export async function authenticate(request: Request, env: Env, origin: URL): Promise<AuthSession> {
  const token = readCookie(request, cookieName(origin, 'session'))
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw new HttpError(401, 'login_required')
  const session = await env.DB.prepare(
    `SELECT s.* FROM sessions s JOIN devices d
    ON d.owner_id = s.owner_id AND d.id = s.device_id
    WHERE s.token_hash = ? AND s.owner_id = ? AND s.expires_at > ? AND d.revoked_at IS NULL`,
  )
    .bind(await contentHash(token), env.OWNER_GITHUB_ID, Date.now())
    .first<AuthSession>()
  if (!session) throw new HttpError(401, 'session_expired')
  return session
}
export function requireCsrf(request: Request, session: AuthSession) {
  if (request.headers.get('X-CSRF-Token') !== session.csrf)
    throw new HttpError(403, 'csrf_rejected')
}
export async function startLogin(request: Request, env: Env, origin: URL) {
  requireOrigin(request, origin.origin)
  const { deviceId, label } = z
    .object({ deviceId: z.uuid(), label: z.string().trim().min(1).max(60) })
    .strict()
    .parse(await readJson(request))
  const flow = oauth.generateRandomState(),
    state = oauth.generateRandomState(),
    verifier = oauth.generateRandomCodeVerifier()
  await env.DB.batch([
    env.DB.prepare('DELETE FROM oauth_flows WHERE expires_at < ?').bind(Date.now()),
    env.DB.prepare('INSERT INTO oauth_flows VALUES (?, ?, ?, ?, ?, ?)').bind(
      await contentHash(flow),
      state,
      verifier,
      deviceId,
      label,
      Date.now() + 600_000,
    ),
  ])
  const url = new URL(server.authorization_endpoint!)
  url.search = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: `${origin.origin}/api/auth/callback`,
    response_type: 'code',
    scope: '',
    state,
    code_challenge: await oauth.calculatePKCECodeChallenge(verifier),
    code_challenge_method: 'S256',
    allow_signup: 'false',
  }).toString()
  return json({ url: url.href }, 200, { 'Set-Cookie': cookie(origin, 'oauth', flow, 600) })
}
export async function callback(request: Request, env: Env, origin: URL) {
  const flow = readCookie(request, cookieName(origin, 'oauth'))
  if (!flow || !/^[A-Za-z0-9_-]{43}$/.test(flow)) throw new HttpError(400, 'oauth_state_invalid')
  const stored = await env.DB.prepare(
    'DELETE FROM oauth_flows WHERE token_hash = ? AND expires_at > ? RETURNING *',
  )
    .bind(await contentHash(flow), Date.now())
    .first<{ state: string; verifier: string; device_id: string; label: string }>()
  if (!stored) throw new HttpError(400, 'oauth_state_invalid')
  const client: oauth.Client = { client_id: env.GITHUB_CLIENT_ID }
  try {
    const parameters = oauth.validateAuthResponse(
      server,
      client,
      new URL(request.url),
      stored.state,
    )
    const response = await oauth.authorizationCodeGrantRequest(
      server,
      client,
      oauth.ClientSecretPost(env.GITHUB_CLIENT_SECRET),
      parameters,
      `${origin.origin}/api/auth/callback`,
      stored.verifier,
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15_000) },
    )
    const token = await oauth.processAuthorizationCodeResponse(server, client, response)
    // A dedicated identity-only OAuth app must never reuse a broad repository grant.
    if (token.scope?.trim()) throw new HttpError(403, 'oauth_scope_rejected')
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Voltwise',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      signal: AbortSignal.timeout(15_000),
      redirect: 'manual',
    })
    if (!userResponse.ok) throw new HttpError(502, 'identity_unavailable')
    const user = z
      .object({ id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER) })
      .parse(await userResponse.json())
    if (String(user.id) !== env.OWNER_GITHUB_ID) throw new HttpError(403, 'owner_rejected')
    // Deliberately no storage of GitHub access/refresh tokens, even server-side.
    const tokenValue = oauth.generateRandomState(),
      csrf = oauth.generateRandomState()
    const now = new Date().toISOString(),
      expiresAt = Date.now() + 30 * 24 * 3600_000
    const existing = await env.DB.prepare(
      'SELECT revoked_at FROM devices WHERE owner_id = ? AND id = ?',
    )
      .bind(env.OWNER_GITHUB_ID, stored.device_id)
      .first<{ revoked_at: string | null }>()
    // Revocation is sticky: re-authorizing the revoked browser ID does not undo it.
    if (existing?.revoked_at) throw new HttpError(403, 'device_revoked')
    await env.DB.batch([
      env.DB.prepare('INSERT OR IGNORE INTO owners VALUES (?, ?)').bind(env.OWNER_GITHUB_ID, now),
      env.DB.prepare(
        'INSERT INTO devices(owner_id,id,label,created_at) VALUES (?,?,?,?) ON CONFLICT(owner_id,id) DO UPDATE SET label = excluded.label',
      ).bind(env.OWNER_GITHUB_ID, stored.device_id, stored.label, now),
      env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(Date.now()),
      env.DB.prepare('INSERT INTO sessions VALUES (?,?,?,?,?,?)').bind(
        await contentHash(tokenValue),
        env.OWNER_GITHUB_ID,
        stored.device_id,
        csrf,
        now,
        expiresAt,
      ),
    ])
    const headers = new Headers({ Location: `${origin.origin}/#/einstellungen` })
    headers.append('Set-Cookie', cookie(origin, 'session', tokenValue, 30 * 24 * 3600))
    headers.append('Set-Cookie', cookie(origin, 'oauth', '', 0))
    return new Response(null, { status: 303, headers })
  } catch (error) {
    if (error instanceof HttpError) throw error
    throw new HttpError(400, 'oauth_failed')
  }
}
