# Cloudflare deployment and local verification

Status: implementation and local infrastructure tests only. No production Cloudflare account, D1 database ID, OAuth app/client secret or live application domain was supplied for this delivery. Nothing has been deployed to Cloudflare. The existing GitHub Pages site remains functional and is not redirected. No paid plan or third-party content service is required.

## Prerequisites and configuration

Use a Cloudflare account on Workers Free with D1 available, a GitHub account, Node 24.14+ and the repository's pinned pnpm. Use a dedicated GitHub **OAuth App**, not a PAT or a GitHub repository permission grant. The OAuth App must have no prior broad scopes. The API requests empty scope and rejects a returned nonempty scope. It needs only the public identity returned by GitHub `/user`.

| Configuration                              | Placement                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------- |
| `APP_ORIGIN`                               | Exact application HTTPS origin, without trailing slash/path, in Worker vars     |
| `OWNER_GITHUB_ID`                          | Numeric stable GitHub account ID, in Worker vars; not the changeable login name |
| `GITHUB_CLIENT_ID`                         | Dedicated OAuth App client ID, in Worker vars                                   |
| `GITHUB_CLIENT_SECRET`                     | Wrangler secret in production, ignored `.dev.vars` for local OAuth              |
| D1 `database_id`                           | Actual returned D1 UUID in ignored production config                            |
| `VITE_CLOUD_SYNC=true`, `VITE_BASE_PATH=/` | Nonsecret build settings set by `pnpm build:cloud`                              |
| Cloudflare deploy token/account ID         | Local Wrangler login or protected workflow secrets; never frontend code         |

Never put any secret in a `VITE_` variable, `.env.example`, tracked config, URL, export or public log. `.env.example` defaults to the local-only frontend. Production/preview hosts must not share a session domain: cookies use the host-only `__Host-` prefix, Path `/`, HttpOnly, Secure and SameSite=Lax. Sessions expire after 30 days; OAuth flows expire after ten minutes. Choose a separate OAuth app for each different callback origin.

## Local automated infrastructure

No account or secrets are needed for the automated checks:

```text
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

`pnpm test` runs ordinary domain/IndexedDB checks and Worker/D1 tests. `worker:bundle` is an offline Wrangler dry-run using a tiny isolated test asset directory, so tests do not require an existing frontend build. Tests use real Miniflare/workerd and SQLite-backed local D1; outbound GitHub requests are intercepted with synthetic identities, never real credentials. Miniflare's pinned stable workerd uses compatibility date 2026-07-30; production configuration uses 2026-10-25 with the newer Wrangler runtime. Refresh the local runtime and rerun before production adoption of newer platform features. No platform CPU billing/real latency claim is made.

`pnpm test:e2e` first tests the Pages/local frontend, then builds the synchronized edition into ignored `.cache/cloud-dist` and tests it with a separate local Worker/D1 server. This deliberately preserves `dist` for the Pages artifact. Browser OAuth redirects and GitHub identity are synthetic; cookies, state, PKCE exchange, API, D1, outbox, persistence and reconnect behavior use the actual application paths. The test server is loopback-only and its code is never part of the production Worker.

For real local OAuth development:

1. Register a separate development OAuth App at GitHub Settings → Developer settings → OAuth Apps. Set homepage to `http://127.0.0.1:8787` and the **exact callback** to `http://127.0.0.1:8787/api/auth/callback`.
2. Create ignored `.dev.vars` with `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` and `OWNER_GITHUB_ID` from that app/account. The checked configuration already sets the loopback `APP_ORIGIN`. Retrieve the numeric owner ID from the GitHub API's user response; do not substitute the login name.
3. Run `pnpm build:cloud`, `pnpm worker:migrate`, then `pnpm worker:dev`. These commands use local D1 unless you explicitly request `--remote`.
4. Open the loopback app, sign in and explicitly enable synchronization. Core learning remains available if any configuration is missing. Only loopback HTTP origins may use development cookies; production origins must use HTTPS.

Development Vite alone is the local-only app unless explicitly built/enabled and paired with a same-origin API. Do not point a GitHub Pages build at a separate API: Safari cross-site cookies are avoided by hosting the synchronized edition under one Worker origin.

## Production setup — deliberate user actions

1. Authenticate Wrangler with your Cloudflare account (`pnpm exec wrangler login`) or use a scoped Cloudflare API token. Do this only when ready to authorize deployment. Create the database with `pnpm exec wrangler d1 create voltwise`; record the actual returned UUID privately.
2. Choose your actual Worker HTTPS origin from the Cloudflare dashboard/account subdomain or an owned custom domain. The repository intentionally contains no invented production domain or database ID. Set up the Worker route/name in that account as needed. Do not redirect the existing Pages origin.
3. Register the production GitHub OAuth App. Homepage: your actual `APP_ORIGIN`. Callback: **exactly `APP_ORIGIN + /api/auth/callback`**. No private repository scopes are needed. If a broad grant already exists, revoke it and use a dedicated identity-only app.
4. Set the four nonsecret process variables `CLOUDFLARE_DATABASE_ID`, `APP_ORIGIN`, `OWNER_GITHUB_ID`, `GITHUB_CLIENT_ID`, then run `node scripts/production-config.mjs`. This validates the actual ID/origin and writes ignored `wrangler.production.jsonc`. Do not commit that generated account-specific file. The checked config routes `/api/*` to the Worker before static assets and serves the root PWA under the same origin.
5. Configure the secret with `pnpm exec wrangler secret put GITHUB_CLIENT_SECRET --config wrangler.production.jsonc`. Enter the value through Wrangler's prompt, not a shell command saved in history. When setting up a new Worker, Wrangler may ask to create it before storing the secret; that is a deliberate production account action.
6. Preserve a private D1 export/Time Travel recovery point before changing an existing database. Apply numbered migrations with `pnpm exec wrangler d1 migrations apply voltwise --remote --config wrangler.production.jsonc`.
7. Run the complete checks, then `pnpm build:cloud`. Review the configuration and deploy deliberately using `pnpm exec wrangler deploy --config wrangler.production.jsonc`. Missing authentication configuration fails closed; there is no generated default identity or password.
8. At the real URL, test allowed and disallowed GitHub accounts, cookie flags, logout, device revocation, complete initial upload and a fresh-device download. Install/open on physical iPhone Safari, Windows and macOS, then verify offline/reconnect and PWA updates with a pending rating. These live acceptance steps were not performed here.
9. Move existing progress by [deliberate JSON migration](DATA_MIGRATION.md). Keep independent backups.

The manual `.github/workflows/cloudflare.yml` workflow performs checks, root cloud build, generated configuration, additive migration and deployment only on explicit workflow dispatch with its deployment input selected. It uses the protected `cloudflare-production` environment. Configure required reviewers and approved branch rules there before use. Set its nonsecret environment variables from the table and secrets `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID`; store the OAuth secret on the Worker first. Give the token only necessary Workers/D1 account permissions. This workflow was prepared, not run. Newly added workflow dispatches become available after the workflow is present on the default branch. The existing Pages workflow remains unchanged in purpose and builds with cloud disabled.

## Free limits, recovery and operations

Cloudflare's published Free allowance checked on 25 October 2026 is 100,000 Worker requests/day with a 10 ms CPU budget per HTTP request, and D1 5 million rows read/day, 100,000 rows written/day, 5 GB total storage, 500 MB per database and seven days of Time Travel. Per-invocation limits also apply. Static asset requests and indexed, batched APIs reduce unnecessary work; the open app's two-minute checks consume a small but nonzero allowance. [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/) and [D1 limits](https://developers.cloudflare.com/d1/platform/limits/) are authoritative and can change. Local tests do not prove production CPU/quota suitability. Remain on Free: if exhausted, continue locally, export and retry after recovery; no paid upgrade is required by the app.

Rate-limit bindings protect unauthenticated IP lookups and authenticated devices (60/minute), with a lower OAuth allowance (10/minute). Cloudflare rate limits are per location/eventually consistent abuse mitigation, not a global hard spend cap. Observability logging is disabled by default; do not enable request/body/progress/OAuth logging. Monitor aggregate quotas in your own dashboard.

For a code rollback, use Cloudflare's Worker version rollback or redeploy a reviewed compatible revision. Additive D1 schema 1 must remain; do not drop events or reverse local schema 3. A pre-v0.7 frontend cannot safely open an upgraded browser database. Keep a compatible local reader available.

For data recovery use a private D1 export or Time Travel in your account, preserving current client JSON backups first. Restoring D1 behind acknowledged client cursors needs deliberate administrative reconciliation; do not merely restore old D1 and assume every client will automatically resend acknowledged rows. See [DATA_MIGRATION.md](DATA_MIGRATION.md). Production restore/rollback drills remain manual acceptance work.

Revocation is sticky: signing in again with the same revoked device UUID does not clear it. After independently verifying the owner/device, an administrator can deliberately clear that device's `revoked_at` in D1. The user then authenticates again; deleted sessions are not restored. Do not reset browser storage to work around revocation.

There is no account-data deletion button. For an explicitly requested administrative deletion, first export privately, disable synchronization on every installation, revoke/delete sessions, and delete that owner's event rows before session-history/devices/owner rows using an authorized D1 transaction with foreign keys respected. All owner reviews/attempt references must be removed together; defer/check foreign keys for the complete transaction. Keep any retained backups under the owner's stated retention policy. This manual operation is not an implemented/tested self-service capability.
