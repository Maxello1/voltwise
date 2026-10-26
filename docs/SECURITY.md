# Security and data ownership

Core learning is offline-first. Personal records remain in origin-scoped IndexedDB until the owner deliberately enables optional cloud synchronization. GitHub Pages builds do not contact an application API. The same-origin Cloudflare edition stores consented immutable history in the owner's D1 database. TLS and provider storage protections are used; this is not end-to-end encryption. The Cloudflare account administrator can read stored history.

## Authentication and authorization

- The Worker performs the official GitHub authorization-code flow using maintained `oauth4webapi@3.8.8` primitives, S256 PKCE, a random state and a separate random flow cookie. State/verifier are bound to a one-use D1 flow, expire after ten minutes, and are consumed atomically before code exchange.
- Callback origin and redirect URI come only from validated `APP_ORIGIN`, never client bodies or forwarded host headers. HTTPS is mandatory except loopback development. Token exchange uses the exact callback and PKCE verifier. Outbound requests use fixed GitHub URLs, timeouts and manual redirects; non-success identity responses fail closed.
- The dedicated OAuth App requests empty scope, verifies the stable numeric GitHub `/user.id` against one configured owner and rejects other IDs or returned broad scopes. No private-repository permissions are requested. GitHub access/refresh tokens are immediately discarded and never reach frontend JavaScript, localStorage or D1.
- Sessions use cryptographically random opaque values, SHA-256 hashes in D1, independent random CSRF values and a 30-day absolute expiry. HTTPS cookies are host-only `__Host-vw_session`, HttpOnly, Secure, SameSite=Lax, Path `/`. OAuth cookies use the same constraints. HTTP development cookies are accepted only on the configured loopback origin.
- Every private request checks session expiry, configured owner and device revocation. Logout revokes the current session. Device revocation deletes all sessions for that owner/device and stays revoked across later sign-ins. Administratively clearing revocation requires independently verified owner authorization; no UI reset bypass exists.
- Non-GET authenticated operations require exact Origin and CSRF headers; login start requires exact Origin. Fetch Metadata rejects cross-site writes. There is no wildcard/credentialed CORS or cross-origin API setting. GET endpoints do not mutate learning history. A previously authenticated in-flight request can finish during revocation/disable.

## Data integrity and availability

Strict shared schemas validate versions, known content revisions, envelope identities, diagnostic traces, bounded strings and references. Requests are stream-limited to 256 KiB, events to 16 KiB, batches to twenty. Worker bindings rate-limit authentication, unauthenticated IP lookups and authenticated devices before database work. Limits are per Cloudflare location, not a global billing guarantee.

D1 uses parameterized SQL, owner-scoped queries, unique IDs, foreign keys and transaction-enforced immutable conflicts. Client-supplied owner fields are rejected. Identical UUID/payload retries return original receipts; changed payloads fail the entire batch. A hash is an integrity/conflict check, not a signature. All references and hashes are rechecked when accepting remote data and manual backups. Supported reviews replay deterministically; unknown versions stop sync instead of disappearing.

All private responses/errors use no-store headers and safe error codes. Production asset headers include a restrictive same-origin CSP, frame denial, no-referrer and nosniff. The PWA precaches only packaged assets; API navigations are excluded from shell fallback and authenticated responses are never runtime-cached. Browser tests inspect Cache Storage and failed offline API fetches.

Observability is disabled in the checked Worker config. Do not log answers, progress, request bodies, cookies, OAuth codes, tokens or detailed database errors. Monitor only necessary aggregate usage in the owner's account. No analytics, archive upload, Obsidian write or private `voltwise-data` integration is added.

Network failure, free-tier exhaustion or invalid credentials never block local learning commands. Events/outbox records save atomically. Receipt validation and cursor advancement occur transactionally; database/quota failures keep the previous committed state. IndexedDB eviction or deliberate browser clearing can still lose unsynchronized work. Persistent-storage permission is not a backup guarantee.

## Backups, imports and secrets

JSON formats 1/2/3 are strictly bounded and validated; the UI caps files at 15 MB and previews the merge. Immutable conflicts roll back the import. Formats 1/2 preserve old meaning; format 3 retains explicit historical session descriptors and authoritative receipt metadata. Manual preferences/session/draft restoration is intentional, while cloud never replaces another device's active work. Imported unsupported versions are retained in the source file, not partially discarded.

Never commit credentials, learning exports, notes containing personal details, database dumps or browser profiles. Local environment files, `.dev.vars*`, production config, runtime state, caches, dependencies and build output are ignored. The checked previous-version JSON fixtures contain only artificial test records. Review staged files before publication. OAuth secrets use Wrangler secrets; never use `VITE_` variables or long-lived browser tokens. The existing repository-maintenance credential helper is separate from application code and keeps credentials in memory without printing them.

React renders imported answers as text. No arbitrary HTML/SVG import, script execution, dynamic expression evaluation or prototype merging is supported. Electrical models remain fixed verified educational content, not a general simulator or safety approval.

No self-service account deletion endpoint is provided. Deliberate private D1 deletion/retention and server restore remain documented administrative operations, with independent backups first. Server rollback can invalidate acknowledged client cursors and needs deliberate reconciliation; see [DATA_MIGRATION.md](DATA_MIGRATION.md) and [CLOUD_DEPLOYMENT.md](CLOUD_DEPLOYMENT.md).

## Evidence and outstanding acceptance

Local Worker/D1 checks cover OAuth state/identity/scope, expiry, revocation, CSRF/Origin, idempotency, conflict rollback, pagination, owner isolation, malformed/oversized data, rate limits and safe backend errors. Three-device tests cover concurrent reviews, clock skew, lost acknowledgments, migration and storage failures. Browser tests cover actual local app/API integration with synthetic GitHub identity; this is not a completed real GitHub/Cloudflare deployment or independent penetration test. Physical iPhone/Safari, Windows/macOS PWA updates and real free-plan performance remain manual acceptance. See [VERIFICATION.md](VERIFICATION.md).

Educational electrical content is not permission to work on energized or mains equipment. Safety-critical industrial content still requires qualified editorial review.
