# Verification

Workspace: Windows, `D:\Lern App`. Node 24.14.1, pnpm 11.25.0, Git 2.51.0. GitHub setup used existing Git authentication without installing the GitHub CLI.

## Required commands

```text
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

The unit/integration suite checks localized numeric parsing, SI dimensions and conversions, invalid inputs, grading tolerances, all curated answer keys, parallel-circuit math/power balance, endpoint/net/junction integrity, unconnected crossings, FSRS serialization and determinism, pending answer restoration, explicit rating persistence, idempotent submissions, concurrent session startup, lesson refresh persistence and validated atomic backup merges.

The browser suite exercises desktop (1440×1000) and Chromium emulating iPhone 13 (390×844). It checks all six routes for horizontal overflow, theme/lesson/pending-review refresh, a complete schematic/numeric session, backup download/import, and offline shell/lazy routes/answer persistence after service-worker caching. Windows screenshot baselines cover the verified circuit; Linux functional CI skips those platform-specific image comparisons until native baselines are approved.

Real iPhone Safari, Home Screen installation and a physical MacBook are outside this environment's browser coverage. No claim of cross-device cloud synchronization is made. GitHub-hosted workflow/deployment results should be checked on the commit, rather than inferred from local checks.

Local run results and deployed revision are recorded during delivery. A schema-version-1 fresh database is covered; a prior-release migration fixture is required when version 2 is introduced.

The final local release run passed lint, strict typing, all 48 unit/integration tests, production build, and all fourteen desktop/mobile browser tests. Offline tests wait for the persisted completion confirmation before simulating a reload. The initial screenshot baselines were captured and then checked in a normal comparison run.
