import { z } from 'zod'
import { appOrigin, HttpError, json, privateResponse, readJson, requireOrigin } from './http'
import { authenticate, callback, cookie, requireCsrf, startLogin } from './auth'
import { download, upload } from './events'
import type { Env } from './types'

async function api(request: Request, env: Env) {
  const origin = appOrigin(env),
    url = new URL(request.url)
  if (url.origin !== origin.origin) throw new HttpError(403, 'origin_rejected')
  const path = url.pathname
  if (request.method === 'OPTIONS') throw new HttpError(403, 'origin_rejected')
  const incomingOrigin = request.headers.get('Origin')
  if (incomingOrigin && incomingOrigin !== origin.origin)
    throw new HttpError(403, 'origin_rejected')
  if (request.method !== 'GET') requireOrigin(request, origin.origin)
  // Bound unauthenticated database lookups too. Cloudflare supplies this header at the edge.
  const ipKey = `ip:${request.headers.get('CF-Connecting-IP') ?? 'local'}`
  if (!(await env.API_LIMITER.limit({ key: ipKey })).success)
    throw new HttpError(429, 'rate_limited')
  if (
    path.startsWith('/api/auth/') &&
    path !== '/api/auth/session' &&
    path !== '/api/auth/logout'
  ) {
    // Platform binding: per-location abuse protection, not an account-wide billing quota.
    const key = request.headers.get('CF-Connecting-IP') ?? 'local'
    if (!(await env.AUTH_LIMITER.limit({ key })).success) throw new HttpError(429, 'rate_limited')
    if (path === '/api/auth/start' && request.method === 'POST')
      return startLogin(request, env, origin)
    if (path === '/api/auth/callback' && request.method === 'GET')
      return callback(request, env, origin)
    throw new HttpError(404, 'not_found')
  }
  let session
  try {
    session = await authenticate(request, env, origin)
  } catch (error) {
    if (
      path === '/api/auth/session' &&
      request.method === 'GET' &&
      error instanceof HttpError &&
      error.status === 401
    )
      return json({ authenticated: false })
    throw error
  }
  if (!(await env.API_LIMITER.limit({ key: `${session.owner_id}:${session.device_id}` })).success)
    throw new HttpError(429, 'rate_limited')
  if (request.method !== 'GET') requireCsrf(request, session)
  if (path === '/api/auth/session' && request.method === 'GET')
    return json({
      authenticated: true,
      ownerId: session.owner_id,
      deviceId: session.device_id,
      csrf: session.csrf,
      expiresAt: new Date(session.expires_at).toISOString(),
    })
  if (path === '/api/auth/logout' && request.method === 'POST') {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(session.token_hash).run()
    return json({ ok: true }, 200, { 'Set-Cookie': cookie(origin, 'session', '', 0) })
  }
  if (path === '/api/v1/events' && request.method === 'POST') return upload(request, env, session)
  if (path === '/api/v1/events' && request.method === 'GET') return download(request, env, session)
  if (path === '/api/v1/devices' && request.method === 'GET') {
    const devices = await env.DB.prepare(
      `SELECT d.id, d.label, d.created_at AS createdAt, d.revoked_at AS revokedAt,
      (SELECT COUNT(*) FROM sessions s WHERE s.owner_id = d.owner_id AND s.device_id = d.id AND s.expires_at > ?) AS sessions
      FROM devices d WHERE d.owner_id = ? ORDER BY d.created_at`,
    )
      .bind(Date.now(), session.owner_id)
      .all()
    return json({ devices: devices.results })
  }
  if (path === '/api/v1/devices/revoke' && request.method === 'POST') {
    const { deviceId } = z
      .object({ deviceId: z.uuid() })
      .strict()
      .parse(await readJson(request))
    await env.DB.batch([
      env.DB.prepare('UPDATE devices SET revoked_at = ? WHERE owner_id = ? AND id = ?').bind(
        new Date().toISOString(),
        session.owner_id,
        deviceId,
      ),
      env.DB.prepare('DELETE FROM sessions WHERE owner_id = ? AND device_id = ?').bind(
        session.owner_id,
        deviceId,
      ),
    ])
    return json({ ok: true })
  }
  throw new HttpError(404, 'not_found')
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!new URL(request.url).pathname.startsWith('/api/'))
      return env.ASSETS.fetch(
        request as unknown as Parameters<Env['ASSETS']['fetch']>[0],
      ) as unknown as Promise<Response>
    try {
      return privateResponse(await api(request, env))
    } catch (error) {
      const status =
        error instanceof HttpError ? error.status : error instanceof z.ZodError ? 400 : 503
      const code =
        error instanceof HttpError
          ? error.code
          : status === 400
            ? 'invalid_record'
            : 'backend_unavailable'
      if (
        new URL(request.url).pathname === '/api/auth/callback' &&
        request.headers.get('Accept')?.includes('text/html')
      )
        return privateResponse(
          new Response(
            '<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Anmeldung nicht abgeschlossen · Voltwise</title><h1>Anmeldung nicht abgeschlossen</h1><p>Die Anmeldung ist abgelaufen, das Konto ist nicht freigegeben oder der Dienst ist vorübergehend nicht erreichbar. Deine lokalen Lerndaten bleiben erhalten.</p><p><a href="/#/einstellungen">Zurück zu den Einstellungen und erneut versuchen</a></p></html>',
            { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
          ),
        )
      // Do not log requests, bodies, OAuth codes, progress or database exception text.
      return privateResponse(
        json(
          { error: code },
          status,
          status === 429 || status === 503 ? { 'Retry-After': '60' } : undefined,
        ),
      )
    }
  },
}
