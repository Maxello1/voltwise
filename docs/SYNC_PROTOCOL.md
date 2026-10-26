# Synchronization protocol 1

This is the v0.7 implemented contract. It is optional and restricted to one configured, stable GitHub user ID. Authentication is independent of consent to upload history. There is no private-repository access or archive integration.

## Requests and limits

The application and `/api/*` share one origin. The client has no configurable cross-origin API URL. All API responses, including errors and redirects, use `Cache-Control: no-store, private`. There is no credentialed CORS. Non-GET requests require the exact configured Origin, appropriate Fetch Metadata, and an authenticated session CSRF header, except the Origin-protected login start. JSON endpoints require `application/json`.

| Endpoint                                 | Contract                                                                                                                           |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/auth/start`                   | `{deviceId, label}`; sets a ten-minute HttpOnly OAuth flow cookie and returns the GitHub authorization URL                         |
| `GET /api/auth/callback`                 | Consumes one cookie-bound state and verifier, performs server-side code exchange, checks the GitHub stable ID and issues a session |
| `GET /api/auth/session`                  | Authenticated identity, device ID, session expiry and CSRF value, or `{authenticated:false}`                                       |
| `POST /api/auth/logout`                  | Revokes the current session and expires its cookie                                                                                 |
| `GET /api/v1/devices`                    | Owner's devices, revocation state and count of unexpired sessions                                                                  |
| `POST /api/v1/devices/revoke`            | `{deviceId}`; revokes all its sessions, including the current session when selected                                                |
| `POST /api/v1/events`                    | `{protocol:1, events:[...]}`; returns `{protocol:1, receipts:[...]}` after transactional acceptance                                |
| `GET /api/v1/events?protocol=1&cursor=0` | `{protocol:1, events:[...], cursor, hasMore}`; ascending server sequences after the supplied cursor                                |

Requests are bounded to 256 KiB, 20 events and 16 KiB per canonical event. Upload batches also stop at the byte limit. Downloads contain at most 20 events; a 21st row determines `hasMore`. A synchronization pass handles at most 20 upload and 20 download batches, then yields to the controlled retry. Each upload uses at most 20 session statements plus 20 event statements, authentication and an acknowledgment read, within D1's Free per-invocation query limit. Queries are parameterized. No client body field supplies owner identity.

D1 currently counts a transactional batch call as one query toward its invocation limit, independently of its internal statement count; row usage and payload/CPU limits still apply. The conservative twenty-event limit also bounds validation and replay work. See [D1 limits](https://developers.cloudflare.com/d1/platform/limits/).

## Immutable records

Each envelope has `schemaVersion:1`, `kind`, stable `eventId` UUID, originating `deviceId` UUID and original UTC `createdAt`:

- `attempt`: `data` is the unchanged AttemptEvent. `session` contains only immutable `{id,mode,exerciseIds,startedAt}` metadata. It contains no position, active/completed status, pending pointer or draft.
- `review`: `data` is the unchanged ReviewEvent, including its explicit rating and original FSRS cards/log. Its attempt must exist for this owner and exercise. The reviewing device may differ after a deliberate manual backup transfer of a pending rating; both original device IDs survive. Only reviewable packaged facts are accepted. One review per attempt is enforced independently of event UUID.
- `completion`: `data` contains `lessonId` and `lessonVersion`. Every new completion has an immutable UUID. Old mutable completion projections are discovered once and given a UUID locally before upload. Concurrent completions both survive; the earliest original timestamp is the read projection.

Existing attempts/reviews retain all UUIDs, timestamps, responses, content versions, generated `dc1-*` IDs and diagnostic traces. Historical originating device IDs need not be newly authorized transport devices: this permits deliberate backup migration. The session making the request is separately verified. Supported content is resolved from the packaged catalogue, including historical v0.4–v0.6 revisions. Unknown event types, schemas, content or scheduler revisions are rejected, never skipped.

`hash` is SHA-256 of UTF-8 canonical JSON for the entire envelope: recursively sorted object keys, omitted undefined properties and significant array order. It provides integrity and conflict detection, not encryption or a signature. A receipt contains `{eventId,sequence,hash,receivedAt}`. The D1 receipt timestamp and monotonically increasing sequence are server assigned. Sequences may have gaps and are not client clocks.

D1 atomically inserts session metadata and events in one `batch()`. Attempts precede reviews in the batch. Unique owner/event IDs, foreign keys and SQL triggers enforce references and immutable-payload conflicts even during concurrent requests. Identical UUID/payload retry returns the original receipt. Different content returns 409 and rolls back every event and session metadata write in that batch. A failed acknowledgment read or disconnected response is safely retryable.

## Download and local application

Pagination is `owner_id = verified owner AND sequence > cursor ORDER BY sequence LIMIT 21`. Retrying a cursor reproduces the same prefix. New arrivals after a page do not move previously assigned sequences. Upload receipts never advance the download cursor, so uploading cannot skip older remote work.

The client validates schemas, hashes, sequence order, receipts and references before accepting a page. One IndexedDB transaction appends new attempts/reviews, historical session descriptors and completion events, stores receipts, rebuilds derived review states and advances the cursor. Failure rolls everything back. It never imports a remote session into the resumable `sessions` table or edits a local pending pointer/draft. A source session can still be active when its already-submitted attempt is shared; the second device sees history, not an invented completed session.

Outbox entries disappear only on a validated acknowledgment or on receiving the identical authoritative event. The originating local event and its receipt remain stored. New actions save with their envelope/outbox atomically even before cloud consent. Enabling scans older history transactionally and then records consent. Disabling stops new batches; already started requests may finish. Logout first disables this installation's automatic synchronization and then revokes its current server session. Neither action erases local history.

## Conflicts and errors

Malformed requests return 400/413/415; identity/CSRF failures 401/403; immutable/reference conflicts 409; rate limiting 429; backend/quota failures 503 where the Worker can respond. Infrastructure exhaustion can also return Cloudflare error pages: the client treats them as failed requests. Error bodies contain safe codes, never SQL, answers or credentials.

Unknown versions, differing UUID payloads, hash mismatches or incompatible receipts block automatic retry and show a recoverable error. Export a backup, retain both sources, update to a supporting application or investigate administratively, then use **Jetzt synchronisieren** to recheck. Nothing is overwritten to hide a conflict. Transient network, quota and storage failures retain queued work and the previous cursor. A storage failure that also prevents saving an error is shown in the live interface. Owner links cannot silently switch accounts.

The FSRS ordering/replay policy is specified in [SYNC_DESIGN.md](SYNC_DESIGN.md). Backup and origin transitions are specified in [DATA_MIGRATION.md](DATA_MIGRATION.md).
