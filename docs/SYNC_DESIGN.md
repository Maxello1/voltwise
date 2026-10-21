# Future synchronization design — not implemented

The shipped app is local. It has no login, cloud endpoints, background uploads, GitHub tokens, realtime channel or connected status. `syncOutbox` is a dormant schema extension. The private archive repository is documentation only.

## Proposed Cloudflare Worker + D1 boundary

- Authenticate a single owner with a reviewed login/device-pairing flow and secure, short-lived sessions. A Worker owns secrets; none belong in VITE_ variables. Use HTTPS, appropriate SameSite/HttpOnly cookies, CSRF protections for writes, explicit allowed origins and scoped device revocation.
- Upload immutable attempt/review events using their stable UUID as an idempotency key and a content hash. D1 uniqueness constraints prevent duplicates; an existing UUID with different content is a conflict, never a silent overwrite.
- Publish monotonically ordered server cursors for incremental pulls. Treat client clocks as event metadata, not a reliable global order. Resume cursors transactionally with local event insertion.
- Enqueue local outbox entries in the same transaction as the event. Retry on reconnect with bounded exponential backoff and jitter. Show actionable failures without blocking offline study. Rate-limit both authentication and event endpoints; validate payload sizes and versions.
- Rebuild mastery and review aggregates from canonical events. Concurrent reviews of one fact require deterministic replay with a documented tie-breaker and a scheduler-version policy. Never merge aggregate counters by last-write-wins.
- Version mutable settings/content separately. Preserve conflicting user data for resolution. Add tombstones for deliberate deletions, with explicit retention and recovery rules.

Acceptance requires independently offline iPhone/Windows sessions, convergence after reconnect, duplicate delivery, clock skew, revoked devices, version upgrades, quota exhaustion and third-device restore tests. Manual JSON merge today is not this synchronization protocol.

## Archives and Obsidian

The private `voltwise-data` repository may later receive authenticated, owner-controlled snapshots from a server or desktop workflow with permissions limited to that repository. It must never be queried from a public PWA with an embedded personal token. Proposed folders: `Exports/`, `Progress/`, `Subjects/`, `Sessions/` with a manifest, schema revision and integrity hashes.

Canonical records remain structured JSON/database events. Markdown topic notes are readable derivatives, not the primary event database. The current download exports bundled lesson notes with YAML front matter. No background writes into an Obsidian vault or iOS synchronization are promised. Import/export folder automation is a separate reviewed capability.

Before implementation, refresh [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) and [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/); this design makes no permanent free-quota promise.
