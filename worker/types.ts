import type { D1Database, Fetcher, RateLimit } from '@cloudflare/workers-types'

export interface Env {
  DB: D1Database
  ASSETS: Fetcher
  AUTH_LIMITER: RateLimit
  API_LIMITER: RateLimit
  APP_ORIGIN: string
  GITHUB_CLIENT_ID: string
  GITHUB_CLIENT_SECRET: string
  OWNER_GITHUB_ID: string
}
