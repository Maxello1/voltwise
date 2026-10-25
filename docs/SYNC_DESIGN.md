# Optional cross-device synchronization

v0.7 implements protocol 1 with a same-origin Cloudflare Worker and D1. Dexie remains the primary write destination. No network request is needed to study, grade, rate, investigate, view progress or export. GitHub Pages remains a separate local-only deployment. Cloud is disabled by default and requires explicit informed consent after identity-only GitHub authentication.

## Storage boundaries

Numbered Dexie migration 3 adds `syncEvents`, `syncReceipts`, `syncState` and `sessionHistory`. The existing outbox gains completion records without changing its historical indexes. Original attempts, reviews, sessions, drafts, completions, settings and device metadata are not rewritten by the migration. New learning commands append the local event and queue record in the same transaction. Lesson completions now also have immutable events, while the existing completion table remains a read projection.

`discoverHistory` backfills old attempts and reviews with their original IDs. It reconstructs only real immutable session descriptors from existing sessions or downloaded history. Missing metadata is an explicit error; there are no fictional completed sessions. Historical completion projections receive persistent local UUIDs. Manual backup imports also discover queue work, preserving the offline path without requiring cloud consent.

Only submitted attempts, explicit memory reviews, completion events and content/session revision metadata synchronize. Remote session descriptors go into `sessionHistory`, never into the active-session table. Active queues, pending ratings, investigation drafts and preferences remain device-local. A submitted but unrated attempt can be visible on another device, but only its source installation can continue that pending rating in this release. History/statistics derive from immutable attempts/reviews; remote session descriptors do not inflate completed-session counts.

## FSRS reconciliation

The scheduling contract remains `ts-fsrs@5.4.2`, retention 0.9, fuzz disabled, and the existing library defaults including short-term learning. Automatic correctness never supplies a memory rating. Original `createdAt`, `cardBefore`, `cardAfter` and review log values are immutable historical observations of the original device's scheduling decision.

The cached schedule is recomputed from an empty card by applying every explicit rating in this canonical order:

1. Acknowledged reviews ordered by authoritative D1 sequence, independently for each fact.
2. Unacknowledged local reviews as a provisional tail ordered by original UTC timestamp, then UUID using binary lexical order.

For an acknowledged review, the replay time is `min(original event time, server receipt time)`, then `max(that time, previous replay time for this fact)`. Pending reviews use their event time with the same monotonic clamp. This prevents a fast clock from moving a shared schedule into the future and prevents negative elapsed intervals. Slow clocks cannot be reconstructed into a true historical time: late offline reviews apply at least at the previous replay time. The server sequence expresses acceptance order, not proof of when the learner actually recalled a fact. Check device clocks. UUID tie-breaking does not use locale-dependent collation.

For example, two devices can each independently rate the same fact after downloading a shared baseline. Both new review events survive. The first accepted offline rating is replayed first; the second follows it with a nondecreasing effective time. Consequently the derived next review date can differ from both original `cardAfter` values. No stored event is edited. Upload acknowledgments and every downloaded page rebuild the derived schedule, so devices with the same supported event/receipt set converge even after retries or out-of-order network delivery. Local scheduling also clamps against the previous card time if a device clock moves backward.

Unsupported scheduler revisions, invalid references and immutable conflicts stop the affected sync transaction and preserve both sources. They never fall back to a last-received-card rule. The error invites backup/update/manual investigation. An unsupported local event does not disable ordinary offline study. New supported review actions continue to save locally; the queue waits for a compatible resolution.

## Automatic operation

Visible app startup, foreground return, connectivity restoration, new queued learning activity and explicit manual synchronization trigger a debounced pass. A visible, enabled app checks at most every two minutes after success to discover another device's work. Failures retry with exponential delay and jitter, capped at five minutes. Each pass bounds work; hidden documents do not poll. Browser locks coalesce tabs where available; database uniqueness/idempotent transport protects retries regardless. No always-on iOS/background-service-worker execution is assumed. System timer throttling may delay open-app retries; foreground/manual sync remains available.

The interface distinguishes opt-out, running, offline, pending counts, errors and a timestamp recorded only after validated server acceptance plus a complete download pass with an empty outbox. Merely queuing or starting a request cannot create a successful status. Logout/disabling preserves local records and queued work. No user-data deletion API is exposed; deliberate server deletion remains an authenticated administrative task with independent backups.

## Trust and deployment

The Worker checks the stable GitHub numeric ID against a configured single owner on every session lookup. OAuth uses maintained `oauth4webapi` primitives, one-time cookie-bound state, S256 PKCE and an exact configured callback. GitHub tokens are used for identity on the server and immediately discarded. Browser scripts receive no OAuth/client/session secrets. Sessions are opaque, hashed at rest, HttpOnly/Secure/SameSite=Lax with `__Host-` cookies in HTTPS production. Local HTTP cookies are restricted to loopback development origins. See [SECURITY.md](SECURITY.md).

There is no personal-token/PAT frontend integration, private GitHub repository write, Obsidian automation, paid dependency or native packaging. Setup blockers and the free-quota behavior are documented in [CLOUD_DEPLOYMENT.md](CLOUD_DEPLOYMENT.md). The private `voltwise-data` repository is untouched.

Official sources checked on 25 October 2026: [GitHub OAuth code/state/PKCE](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps), [oauth4webapi API](https://github.com/panva/oauth4webapi/tree/main/docs), [Worker static-asset routing](https://developers.cloudflare.com/workers/static-assets/binding/), [D1 transactional batches](https://developers.cloudflare.com/d1/worker-api/d1-database/), [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) and [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/). Refresh these limits before production use; local tests do not measure Cloudflare billed CPU time.
