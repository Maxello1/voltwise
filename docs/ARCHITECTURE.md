# Architecture

Voltwise is a single static React/TypeScript application. There is no backend dependency for core learning. Vite bundles the shell and lazy-loaded feature screens; vite-plugin-pwa precaches all bundled code, styles, artwork and curriculum, so visiting a new screen offline still works after the initial cache is ready.

## Boundaries

| Location       | Responsibility                                                                            |
| -------------- | ----------------------------------------------------------------------------------------- |
| src/app        | Hash routing, layout, reactive data reads and theme application                           |
| src/features   | Dashboard, lessons, practice, circuits, progress and settings                             |
| src/components | Shared accessible UI and production-worker status                                         |
| src/domain     | Versioned domain types, grading, physical calculations, mastery and isolated FSRS adapter |
| src/schematics | Circuit DSL, topology validation, original symbol registry and SVG renderer               |
| src/storage    | Dexie schema, atomic learning commands and validated additive backups                     |
| src/content    | Versioned, packaged lessons, exercises, concepts and circuit definitions                  |
| src/i18n       | German labels/formatting; locale field prepared for later translations                    |

## Data flow

1. Packaged definitions identify the exercise version and assessed concepts.
2. The learner submits an answer. The domain evaluator parses the value and unit or checks a defined response.
3. A transaction appends an AttemptEvent and stores its ID on the session's pending step. No schedule is inferred from correctness.
4. A reviewable fact requires a separate learner rating. A second transaction appends the complete FSRS ReviewEvent, updates the cached ReviewState and advances the session. Applied exercises advance without FSRS scheduling.
5. Dexie live queries refresh the dashboard, active session and progress screens.

One active session is chosen transactionally, including across tabs. Repeated answer submissions and repeated advancement cannot duplicate a step. Closing the app between grading and rating restores the graded step. A completed session is an actual stored status, not a button-click counter.

Curriculum is bundled, versioned immutable application content rather than copied into user tables. Concept mastery is derived from attempts on read. Outbox is an empty typed table reserved for a future backend; there is no pretend upload or network success state.

## Migrations

Database version 1 declares the initial tables and indexes. Metadata records database/content schema versions and a locally generated device UUID. Future releases must add Dexie numbered upgrades; never change a historical migration or clear storage. Add a fixture of the previous schema, migrate it, verify event IDs/history and run an export/restore drill. IndexedDB may be unavailable in restricted browser contexts; startup reports this without deleting anything.

## Platform limits

Browser storage is scoped to origin and browser profile. GitHub Pages, localhost, another browser and an installed PWA may have separate storage contexts. No automatic device convergence is promised. Manual backup import is the transfer mechanism today. Real Safari/PWA device checks remain necessary in addition to Chromium phone emulation.
