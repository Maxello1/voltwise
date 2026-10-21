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

The browser suite exercises desktop (1440×1000) and Chromium emulating iPhone 13 (390×844). It checks all six routes for horizontal overflow, theme/lesson/pending-review refresh, complete schematic/numeric sessions, backup download/import, and offline shell/lazy routes/answer persistence after service-worker caching. Additional checks cover selecting all five circuits, deep-link restoration, explicit net highlighting, zoom/pan/fit, an entire three-task metering session, distinct wrong/correct diagram feedback, and offline access to the new circuits. Overflow is compared with the document's client width, since a mobile browser can enlarge innerWidth when content overflows.

Windows screenshot baselines cover all five diagrams at both viewport sizes. Each new baseline is visually reviewed and checked again in a normal comparison run. Linux CI runs the thirty functional browser cases and skips the ten platform-specific image comparisons until native baselines are approved.

Real iPhone Safari, Home Screen installation and a physical MacBook are outside this environment's browser coverage. No claim of cross-device cloud synchronization is made. GitHub-hosted workflow/deployment results should be checked on the commit, rather than inferred from local checks.

Local run results and deployed revision are recorded during delivery. A schema-version-1 fresh database is covered; a prior-release migration fixture is required when version 2 is introduced.

The 0.4 checks cover 123 unit/integration tests and 40 desktop/mobile browser cases. Added coverage pins v1 generated values, sweeps 512 deterministic codes against independent equations and rounding/unit mistakes, checks parameter-matched topology/labels and power balance, and restores generated sessions without adding FSRS cards. A synthetic 0.3-format pending-fact backup fixture checks previous-content compatibility while schema 1 remains unchanged. Browser cases cover canonical round links, both themes, preserved earlier sessions, full offline rounds with matching diagrams, history links and a fresh-profile JSON restore without a network. The clipboard link-content check stubs clipboard writing; it does not claim OS clipboard permission coverage. New full-page captures reset document scroll to keep sticky navigation in the expected position.

The 0.3 checks cover 100 unit/integration tests and 34 desktop/mobile browser cases. Added checks cover all 36 task definitions, invalid content/prerequisite cycles, independent reference answers for new calculations, consistent/ambiguous recall aliases, last-twenty evidence, hints, small samples, due/future facts, learner overrides and preserved targeted sessions. The new browser flow completes concept practice offline, reloads a pending answer, checks evidence counts and captures both themes on desktop and phone. Screenshots disable transitions so theme changes are captured in their final colors.

The 0.2 release checks include lint, strict typing, 70 unit/integration tests, production build, and 30 desktop/mobile browser cases. Domain tests also verify series voltage/power conservation, unloaded-divider outputs, supported numeric ranges, correct meter connections, and dedicated sessions without overwriting existing progress. Offline tests wait for persisted confirmation before simulating a reload.
