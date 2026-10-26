import type { Env } from './types'
import { maxRequestBytes } from '../src/sync/protocol'

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code)
  }
}
export const json = (value: unknown, status = 200, headers?: HeadersInit) =>
  Response.json(value, { status, headers })
export function appOrigin(env: Env) {
  let url: URL
  try {
    url = new URL(env.APP_ORIGIN)
  } catch {
    throw new HttpError(503, 'not_configured')
  }
  if (
    url.origin !== env.APP_ORIGIN ||
    url.username ||
    url.password ||
    (url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))
  )
    throw new HttpError(503, 'not_configured')
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !/^[1-9]\d*$/.test(env.OWNER_GITHUB_ID))
    throw new HttpError(503, 'not_configured')
  return url
}
export function requireOrigin(request: Request, origin: string) {
  if (request.headers.get('Origin') !== origin) throw new HttpError(403, 'origin_rejected')
  const site = request.headers.get('Sec-Fetch-Site')
  if (site && site !== 'same-origin' && site !== 'none') throw new HttpError(403, 'origin_rejected')
}
export async function readJson(request: Request) {
  if (request.headers.get('Content-Type')?.split(';')[0]?.trim() !== 'application/json')
    throw new HttpError(415, 'json_required')
  if (Number(request.headers.get('Content-Length') ?? 0) > maxRequestBytes)
    throw new HttpError(413, 'payload_too_large')
  const reader = request.body?.getReader()
  if (!reader) throw new HttpError(400, 'invalid_json')
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > maxRequestBytes) {
        await reader.cancel()
        throw new HttpError(413, 'payload_too_large')
      }
      chunks.push(value)
    }
    const bytes = new Uint8Array(length)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.length
    }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown
  } catch (error) {
    if (error instanceof HttpError) throw error
    throw new HttpError(400, 'invalid_json')
  }
}
export function privateResponse(response: Response) {
  const headers = new Headers(response.headers)
  headers.set('Cache-Control', 'no-store, private')
  headers.set('Pragma', 'no-cache')
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('Referrer-Policy', 'no-referrer')
  headers.set('Vary', 'Cookie, Origin')
  return new Response(response.body, { status: response.status, headers })
}
