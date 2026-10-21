# Security and data ownership

- The public repository contains application code and bundled teaching content. Personal progress stays in origin-scoped IndexedDB. No analytics, mandatory account, application API or cloud upload is configured.
- Never publish backups, notes containing personal details, credentials, browser profiles or database dumps. Git ignores normal backup filenames, the backups folder, deployment scratch files, local environment files, build output and dependencies. Review staged files before pushing.
- Credentials used by the local repository-setup helper come from the standard Git credential helper, are held in process memory and are never printed or saved. This helper is not imported by the app or bundled by Vite. It fails instead of opening interactive credential prompts.
- JSON imports accept only the exact version-1 schema, bounded fields and collection sizes, known content revisions and valid references. The UI caps files at 15 MB and previews a summary before merge. Immutable event conflicts roll back the entire transaction. No script execution, HTML injection or prototype merging is used. Imported settings intentionally replace the corresponding local preferences; attempts are additive.
- React renders text as text. The app does not use dangerouslySetInnerHTML or execute imported expressions. Circuit definitions are trusted packaged content; arbitrary imported SVG is not supported.
- The service worker precaches only packaged static assets. No authenticated future API response caching is configured. Cloud authentication, authorization, request validation and private archives require a separate implementation and review.
- Browser storage can be evicted, manually cleared, or become inaccessible. Asking the browser for persistent storage is not a backup guarantee. Keep independent JSON copies. A failed save reports an error and retains the current step.
- Future destructive operations must offer an export first and clearly state their scope. There is no data-reset button in the first version.

Educational electrical content is not permission to work on energized or mains equipment. Safety-critical industrial content needs qualified editorial review before publication.
