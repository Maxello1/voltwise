# Data migration and recovery

## Existing installation upgrade

Dexie versions 1 and 2 remain declared unchanged. Additive migration 3 creates sync envelope/receipt/state/history tables, records database schema 3 and defaults cloud to disabled. It does not clear IndexedDB or rewrite previous attempts, reviews, generated IDs, session queues, pending ratings, drafts or preferences. Initial upload is additive discovery followed by idempotent batches; interrupted discovery rolls back, and interrupted uploads retry with their original UUIDs.

The checked synthetic `tests/fixtures/backup-v2-v06.json` represents v0.6 schema-2/backup-2 data: a pending control fact rating, completed generated DC and diagnostic attempts, a previous explicit FSRS review, an open investigation with sticky hint, real active/completed session fields and dark preferences. Tests create an independently declared old database from it before opening v0.7. Earlier schema-1/v0.3/v0.5 fixtures remain covered. These are artificial fixtures, not personal learning exports.

## GitHub Pages to the synchronized origin

GitHub Pages and the new Cloudflare HTTPS origin have different IndexedDB and service-worker storage. An installed iPhone PWA can also have a separate context from a browser tab. A deployment cannot move those records automatically. Do not remove the old installation until recovery is verified.

1. Open the installation that contains your progress. Wait for any current save to finish. In **Einstellungen**, export a JSON backup and keep an independent copy.
2. Open the new, explicitly configured Cloudflare application URL. Do not replace, redirect or clear the old origin.
3. In **Einstellungen**, select the backup, inspect the preview and choose **Sicherung zusammenführen**. Restore a v0.7 export only into v0.7 or newer. The file includes local session/draft state for a deliberate manual migration; this differs from cloud sync, which keeps unfinished work local.
4. Verify attempts, pending rating, investigations, lessons and settings on the new origin. Export a second backup there. Import is additive for events, preserves local drafts and intentionally imports backed-up preferences as documented by the existing manual restore flow.
5. Sign in with the allowed GitHub account. Explicitly consent to **Synchronisierung einschalten**. The first pass uploads old local history and downloads existing cloud events. Keep the app open until no changes are pending and a successful time is shown.
6. On each additional device, open/install the same Cloudflare URL, authenticate and explicitly enable sync. Existing local history merges instead of being replaced. Verify the received history. Remote active sessions and diagnostic drafts are intentionally not resumable there.

Local work performed before connecting is preserved. Switching off, signing out or revoking a device never deletes its IndexedDB data. After consent is removed, an already-started request may still complete. Data already accepted by D1 remains there until a deliberate administrative deletion. Cloud is an additional copy, not a replacement for exportable independent backups.

## Backup formats

- Versions 1 and 2 continue to import. Their immutable event and generated-exercise meanings are unchanged.
- Version 3 adds `sessionHistory`, `syncEvents` and `syncReceipts`. This preserves remote attempts with explicit metadata instead of manufacturing sessions. Receipts retain the shared FSRS ordering needed for a faithful offline restore. They contain an owner ID, event hash and sequence, never a session cookie/CSRF/OAuth token.
- Authentication, cloud consent, cursors and device preferences from another cloud device are not synchronized. A v3 manual backup imports its explicit preferences/session/draft snapshot just as older manual backups do; consent remains off on a fresh installation. An imported owner link prevents accidentally sending one owner's receipt history to another account.
- Import validates schemas, known revisions, unique records, hashes, references and immutable conflicts before committing. An error rolls back the import. It rebuilds derived schedules from the supported immutable ratings; it never chooses a last-received cached card.

Do not downgrade an upgraded browser database in place. A v0.6 application does not understand schema/backup 3. For application rollback keep the v0.7-compatible local reader and use a separate profile for an older executable. Preserve independent old-format exports from before upgrade if an older version must read them.

## Recovery drills

For a lost device, sign in and enable on a new installation to retrieve all server-accepted events. Events still only in a lost device's outbox require that device or a JSON backup. Export after learning important material, even with sync enabled.

For an immutable conflict or unsupported revision, retain both backups, leave the affected cloud cursor unchanged and update/investigate. **Jetzt synchronisieren** retries validation after a compatible fix. Do not delete either source or clear IndexedDB to make the error disappear.

For quota/network failures, continue locally, export and retry when service recovers. A quota failure during local storage prevents the action transaction from committing; the UI reports the failed save, rather than claiming it was queued.

For a server restore/Time Travel, first export current client backups and D1 data privately. Restoring an older D1 snapshot can invalidate previously acknowledged sequences or omit accepted events. Do not resume those clients blindly: reconcile the retained JSON copies administratively into the chosen server history, or initialize a distinct application origin and deliberately import the preserved backups. A cursor alone cannot prove that a rolled-back server still has all client-acknowledged records. Do not simply reset/delete local databases. See [deployment recovery](CLOUD_DEPLOYMENT.md).

## v0.8 content compatibility

The numbered schema-1/2/3 history and backup format 3 remain unchanged; imports of backup 1/2/3 still run through the original additive path. No new table or persisted control draft is required. School applications use the existing bounded answer string with a strict inner version 1. Backups/sync ingestion reject malformed or unsupported payloads. Historical dc1 IDs and all prior content versions remain resolvable; new ac1/motor1/plc1 prefixes are additive. Tests cover every application format, pending feedback, duplicate submissions, old pending ratings, old diagnostic drafts and idempotent fresh-database restore. Export to an older release cannot imply forward recognition of v0.8 content IDs. No local learning database is cleared.
