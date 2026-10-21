# Voltwise — Product and Engineering Roadmap

**Working title:** Voltwise
**Updated:** 21 October 2026
**Mission:** An offline-first, adaptive electronics learning application for an _Elektroniker für Betriebstechnik_ apprenticeship. High-quality, increasingly advanced electrical schematics are a first-class interaction—not decoration.

## 1. Product principles

1. **Learn by doing.** Teach, retrieve, calculate, diagnose, and explain; flashcards are only one exercise type.
2. **Schematics must be accurate and beautiful.** Render from structured circuit models into crisp, accessible SVG; no blurry raster diagrams or AI-generated electrical wiring masquerading as verified schematics.
3. **Adaptive without being opaque.** Use FSRS for memory reviews; select calculation/troubleshooting practice based on recorded skill performance, with explainable choices.
4. **Offline first.** All core reading, practice, review scoring, and progress recording work without a network connection.
5. **User owns their data.** Provide versioned JSON export/import, readable Markdown for Obsidian, and (later) private GitHub backups.
6. **€0 is the default.** Host public app code on GitHub Pages; use optional Cloudflare Workers + D1 free tier for later sync. Avoid mandatory paid APIs, hosting, or Apple developer enrollment.
7. **Safety and copyright.** Treat industrial schematics as educational; don't present simulated wiring as permission to work on live equipment. Use original/appropriately licensed graphical symbols; don't reproduce the paid IEC 60617 database wholesale.
8. **German-first interface** with technical terms such as Stromlaufplan, Schütz, Öffner, Schließer, Drehstrom, Stern-Dreieck, Schutzleiter, and Ausbildung; keep architecture translation-ready for English.

## 2. Intended platforms

- **iPhone:** Installable Progressive Web App via browser's Add to Home Screen; responsive touch controls, offline use, no App Store needed.
- **Windows PC:** Browser/installable PWA; development workspace preferably `D:\Projects\Voltwise` if present and safe.
- **MacBook:** Browser/installable PWA; source cloned via GitHub as normal.
- An actual iOS native package is explicitly **not** needed for v1. Capacitor could be evaluated later only for native features.
- Offline browser storage is not permanent backup. Warn the user and provide export before any destructive data operation.

## 3. Target learning experience

### Daily study loop

1. **Assess:** show cards/exercises due for review and topics requiring practice.
2. **Retrieve:** short active recall prompts; do not show answer before learner responds where possible.
3. **Apply:** numerical problems, formula choice, diagrams, and component identification.
4. **Explain:** provide feedback, correct reasoning, units, and common mistakes.
5. **Adapt:** update FSRS schedule for reviewable items and separate concept mastery estimates for applied problems.
6. **Retain:** log an append-only attempt and schedule relevant follow-up.

### Exercise modes

- Quick knowledge checks / short-answer / selective flashcards.
- Numeric answers with configurable tolerance, locale-aware decimal separator, unit conversion (A, mA, V, kΩ, W etc.).
- Formula selection and worked-solution reasoning.
- Click/tap a schematic component, terminal, protection device, contact, or measurement point.
- Follow circuit logic and identify a closed/open path.
- Fault diagnosis with finite predefined scenarios and explainable feedback.
- Timed **optional** mock exams and mixed practice sessions.
- Eventually interactive contactor/relay state machines and PLC-oriented exercises.

### Adaptation logic

- Use a maintained, stable `ts-fsrs` release for memory intervals; **FSRS is not a magical universal proficiency score**.
- Keep per-concept proficiency derived from attempted tasks, difficulty, correctness, hints, retries, and recency. Start simple and explainable rather than prematurely implementing opaque ML.
- Label learning modes separately: `review`, `learn`, `calculation`, `schematic`, `diagnose`, `mock_exam`.
- Do not reward guessing as mastery; include answer-entry and confidence/effort where useful.
- Bias study toward due items, weak concepts, then appropriate new material, with learner override.

## 4. Schematic engine: first-class foundation

**Renderer:** Own SVG component library and layout layer rather than an image generator. Consider a routing/layout library only if it actually improves quality. Every schematic has a machine-readable model.

### Proposed entities

- `CircuitDefinition`: stable ID, version, title, domain, nominal quantities, sheets, components, nets, anchors, topology, annotations, simulation mode, validation metadata.
- `Component`: ID, symbol kind, reference designator (e.g. `S1`, `K1`, `F1`, `M1`, `R1`), properties/ratings, terminal positions, UI behavior.
- `Terminal`: stable ID, electrical role, coordinate, connection rules.
- `Net`: electrically connected terminal set; junction semantics explicitly distinguished from wire crossings.
- `WireSegment`: SVG path through orthogonal, grid-snapped waypoints; path must not silently imply electrical junction at crossing.
- `ExerciseDefinition`: question, requested interactions, answer evaluator, hints, explanation, concepts, difficulty, circuit ID, expected validation cases.
- `CircuitState`: component positions, contact energization states, scenario/fault IDs; only simulated once model semantics exist.

### Visual acceptance requirements

- Crisp vector symbols at phone and desktop sizes.
- IEC/DIN-style **original or licensed** symbol geometry, with references and readable labels; check licensing of any sourced symbol packages.
- Fixed grid, consistent orthogonal wiring, conventional symbols; distinguish connected junctions from non-connected crossings.
- Support pan/zoom, focus, reset-to-fit, tap targets approximately 44 CSS px or larger, keyboard focus, selected/error highlighting, dark/light palettes.
- Separate display style/annotation layers from netlist and solver; explanations can highlight terminals/nets without altering topology.
- Every demo schematic gets visual regression coverage and domain tests validating known expected outputs.
- Avoid photorealistic, generated, or hand-wavy diagrams; prioritize curated accurate diagrams.

### Difficulty progression

| Tier | Electrical content                                            | Interaction                            |
| ---- | ------------------------------------------------------------- | -------------------------------------- |
| 0    | Units, symbols, conductor/ground terminology, NO vs NC        | identify & match symbols               |
| 1    | DC source, switch, lamp/resistor, basic Ohm's law             | tap paths & calculate I/U/R            |
| 2    | Series, parallel, voltage divider, measurement points         | trace branches & solve R_eq            |
| 3    | Kirchhoff rules, power, meter placement, fault isolation      | diagnostics and multi-step values      |
| 4    | AC sine waves, RMS, phase and impedance concepts              | phasor/circuit interpretation          |
| 5    | Relays/contactors, pushbuttons, self-holding circuits         | simulate start/stop contact behavior   |
| 6    | Motor protection, forward/reverse interlocks, safe stop logic | diagnose failures and control behavior |
| 7    | Three-phase concepts, star/delta, transformer and motors      | read power vs control sheets           |
| 8    | Sensors, timers, PLC I/O, multi-page industrial schematics    | integrated fault-finding scenarios     |

**Scope control:** Tiers 0–2 are suitable for an initial interactive alpha. Relay logic begins with tested finite-state logic, not SPICE-style simulation. AC and three-phase solvers are separate, reviewed milestones. Any exercises involving mains/industrial installations need stronger editorial review.

## 5. Stack and cost architecture

| Layer       | First implementation                                    | Planned enhancement                           |
| ----------- | ------------------------------------------------------- | --------------------------------------------- |
| UI          | React + TypeScript + Vite + Tailwind                    | i18n, accessible UI polish                    |
| PWA         | web manifest + service worker via maintained PWA plugin | install guidance and update flow              |
| Local data  | Dexie/IndexedDB                                         | migrations and sync outbox                    |
| Scheduling  | stable `ts-fsrs` adapter                                | optimize based on sufficient logs             |
| Schematics  | structured domain data -> SVG                           | stateful relay simulator, advanced authoring  |
| Content     | curated, versioned TypeScript/JSON                      | import tools and vetted generators            |
| Hosting     | GitHub Pages (public code)                              | optional alternate static CDN                 |
| Sync        | offline-only first                                      | Cloudflare Worker + D1, authenticated         |
| GitHub data | versioned manual export first                           | scheduled private repo snapshots              |
| Obsidian    | downloadable Markdown/JSON                              | export into vault through safe sync mechanism |

**Important:** A public GitHub Pages app cannot safely include hardcoded GitHub personal access tokens, OAuth client secrets, or private repository contents. Sync and remote backup are separate, authenticated features. The `voltwise-data` private repo is an archive destination, **not** an automatically queryable Obsidian server/database.

## 6. Versioned data models

Core tables/collections:

- `subjects`, `topics`, `concepts`, `lessons`
- `exercises` with content version, difficulty, tags, mode, evaluator and explanation
- `circuits` with structured models, symbol schema version and validation cases
- `attemptEvents`: immutable `eventId`, `deviceId`, exercise/content revision, timestamp, correctness, unit-normalized answer, hints, response duration where appropriate; store personal free-text carefully
- `reviewEvents` and `reviewStates`: complete FSRS history plus deterministic/replayable scheduling state; store desired retention preferences
- `conceptMastery`: derived data, rebuildable from attempts
- `settings`: preferred locale, units, target session duration
- `syncOutbox`, `syncCursor`, `tombstones` for optional cloud sync
- `contentSchemaVersion`, `dbSchemaVersion`, migration history

Guidelines: use stable UUIDs; event IDs make uploads idempotent; use UTC timestamps plus a learner timezone preference; never merge mutable aggregate counters by last-writer-wins and silently discard progress; tests cover concurrent offline attempts and migration/restoration. Curriculum definitions have versions and are packaged with the app.

## 7. Full development roadmap

### Phase 0 — Repository, toolchain, and safe deployment

**Implement**

- Check OS/tool availability; on Windows prefer `D:\Projects\Voltwise`, otherwise safe existing workspace. Never overwrite unrelated files.
- Initialize Git and default `main` branch.
- If GitHub CLI `gh` is authenticated and creation is authorized, create public **`voltwise`** code repo and private **`voltwise-data`** archive repo. Check for naming collisions; no credentials/content in the public repo.
- React/Vite/TypeScript scaffold, strict typing, package manager lockfile, Tailwind, responsive base layout, formatting, linting.
- Repository root `README.md`, `LICENSE` decision, `AGENTS.md`, `/docs/`, `.gitignore`, `.env.example` with placeholders only, CI workflows.
- GitHub Pages workflow with Vite `base` matching `/voltwise/`, `npm/pnpm` lockfile-consistent installation, and appropriate permissions. Publishing may need manual Pages setting.

**Accept when**

- Dev server runs, tests/build/typecheck pass locally, a clean `main` commit exists, GitHub links are reported if remote creation succeeds, and Pages can publish without exposed secrets.

### Phase 1 — Offline-first product shell

**Implement**

- Mobile bottom navigation and desktop sidebar with Dashboard, Learn, Practice, Circuit Lab, Progress, Settings.
- German UI, localized numbers, friendly onboarding, polished light/dark design.
- Dexie schema, migration version, seeded demo subject set.
- JSON backup/export and import with schema validation; offline indicator and browser-storage warning.
- PWA manifest and simple offline caching, install help page.

**Accept when**

- App loads on phone widths, reloads offline after initial caching, progress survives reload, and export/import restores learning history.

### Phase 2 — Actual learning loop (MVP)

**Implement**

- Subjects/topics/lessons, active-recall, MCQ, numeric exercises, feedback with reasoning.
- `ts-fsrs` adapter for reviewable items, explicit review rating, due queue, persistent event log.
- Skills/confidence overview, daily recommended session.
- Seed 25–40 curated, verified foundational exercises; more can follow later.

**Accept when**

- A learner can finish a session, get graded, view why an answer is wrong, close/reopen app, and see the right next review with retained history.

### Phase 3 — Beautiful interactive schematics (MVP)

**Implement**

- Typed circuit model, SVG renderer, component symbol registry, orthogonal wiring, labels, viewBox/zoom/fit.
- At least five manually verified, visually polished circuits and component-tap questions.
- Automatic validation of terminal/net references and known circuit solutions; accessibility and visual regression tests.
- One complete example: 24 V source with 100 Ω + 200 Ω parallel branches -> **0.36 A** total current, branches 0.24 A and 0.12 A.

**Accept when**

- Circuits remain crisp on iPhone and desktop, touching a symbol responds correctly, and incorrect answers produce intelligible highlighted feedback.

### Phase 4 — More powerful electronic exercises

**Implement**

- Equation/parameter generator with deterministic seed, units and tolerances.
- Nodal or proven algebraic routines for supported _linear DC_ circuits, with property-based reference tests.
- Drag/selection exercises only where ergonomics are reliable; clear wrong-answer explanations.
- Curriculum progression and prerequisites.

**Accept when**

- Generated problems are reproducible, mathematically checked, and do not silently produce nonsensical/unanswerable questions.

### Phase 5 — Industrial control circuits and simulation

**Implement**

- Relay/contactor NO/NC contacts, coils, overload contacts, momentary buttons.
- Self-hold Start/Stop circuit, reverse/forward interlock, state-machine playback; power/control sheets separated where useful.
- Event timeline and fault scenarios with references to the underlying circuit model.

**Accept when**

- All coil/contact transitions and failure scenarios match a documented test matrix. Explicitly distinguish simulated behavior from real safe wiring procedures.

### Phase 6 — Secure cross-device synchronization

**Implement**

- Cloudflare Worker + D1 schema and migrations, authenticated API, device pairing or user login with secure sessions.
- Upload immutable attempt/review events with idempotency keys, backfill on reconnect, stable cursors, conflict resolution and retry/backoff.
- Settings/content merges with per-entity versions; sync status and manual retry.
- Secret management in Cloudflare, never public Vite variables.

**Accept when**

- iPhone + Windows can work offline independently then converge without lost or duplicate attempts; refresh on a third Mac retrieves the correct history. If quotas are reached, app remains usable offline.

### Phase 7 — Obsidian and private GitHub archive

**Implement**

- User-controlled JSON full-data export and Markdown topic notes with YAML front matter.
- Archive folder layout `/Progress`, `/Subjects`, `/Sessions`, `/Exports`, stable paths and import compatibility.
- Optional server-side or desktop-initiated authenticated private GitHub snapshot automation with permissions limited to archive repo; allow manually downloaded vault folder as simpler fallback.
- Document that iOS Obsidian sync may not update until Obsidian runs, depending on sync tool; do not promise invisible background writes.

**Accept when**

- A fresh device can restore the exact history from an exported backup; exported Markdown opens as readable notes in Obsidian, and nothing private appears in public repo.

### Phase 8 — Curriculum expansion and importing school material

**Implement**

- Hand-vetted modules: electrical safety basics, DC, AC, 3-phase, transformers, DC/AC motors, contactors, sensors, basic PLC.
- PDF/image import later, with extracted source citations and educator review of all generated questions; never assume image OCR/schematic interpretation is error-free.
- Optional AI explanation/card proposals behind a swappable provider interface, not mandatory, paid, or needed for core lessons.

**Accept when**

- Every live module has verified worked solutions, traceable syllabus/version, clear learning objectives, and quality gates.

### Phase 9 — Production readiness and evolution

**Implement**

- iPhone Safari/PWA and desktop browser test matrix, accessibility, performance, data corruption/failure recovery.
- Sync/security review, encrypted transport, backup/restore drills, privacy statement, dependency updates.
- Instrumentation opt-in only; no unnecessary analytics.

**Accept when**

- Product is usable with all networking disabled, upgrades preserve data, backups restore, and CI remains green.

## 8. Milestones / scope control

**First runnable vertical slice** (what the initial Codex prompt must deliver):

- Working responsive app with Dashboard, Learn, Practice, Circuit Lab, Progress, Settings.
- Local IndexedDB persistence and a meaningful demo learning loop.
- At least 12 reviewed demo exercises across symbols, units, Ohm's law, and parallel resistance; at least one interactive verified SVG circuit.
- Stable FSRS adapter and persisted attempts/review states, if feasible within initial pass.
- Git/CI/Pages prepared, developer documentation written.
- No fake 'connected/synced' statuses; sync may be clearly labeled **Not configured** until a real backend exists.

**Alpha:** phases 0–3.
**Beta:** phases 4–7.
**Expanded curriculum:** phases 8–9.

Work in discrete PRs/commits, keep passing tests, and maintain a changelog/decision log.

## 9. Suggested repository structure

```text
voltwise/
├── .github/workflows/{ci.yml,deploy.yml}
├── AGENTS.md
├── README.md
├── docs/
│   ├── ROADMAP.md
│   ├── ARCHITECTURE.md
│   ├── CIRCUIT_SCHEMA.md
│   ├── LEARNING_MODEL.md
│   ├── SYNC_DESIGN.md
│   └── SECURITY.md
├── public/{icons,manifest-assets}/
├── src/
│   ├── app/{routes,layout}/
│   ├── components/{ui,navigation}/
│   ├── features/{dashboard,learn,practice,circuit-lab,progress,settings}/
│   ├── domain/{curriculum,learning,electrical}/
│   ├── schematics/{model,symbols,renderer,layout,validation}/
│   ├── storage/{db,migrations,backup}/
│   ├── content/{subjects,lessons,exercises,circuits}/
│   ├── i18n/
│   └── styles/
├── tests/{unit,integration,e2e}/
├── workers/sync/             # only when Phase 6 is genuinely implemented
├── package.json
└── pnpm-lock.yaml
```

Keep ownership boundaries clear: domain calculations and circuit topology must **not** depend on React components or SVG markup.

## 10. Verification checklist before each release

- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes with physics/formula and data migration tests
- [ ] `pnpm build` passes
- [ ] Mobile interaction tested at iPhone-like viewport; no essential desktop-only hover
- [ ] Schematic zoom/touch/keyboard interactions work
- [ ] Offline demo session and restart work
- [ ] No secrets/user progress in public build or source
- [ ] Any new electrical content has checked units, answers, diagram semantics
- [ ] Document what is implemented vs placeholder / unfinished

## 11. Sources and verification targets (official references)

- GitHub Pages free/public repository eligibility: https://docs.github.com/en/pages/quickstart
- Vite GitHub Pages / subpath deployment: https://vite.dev/guide/static-deploy.html
- Cloudflare Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- Cloudflare D1 free plan limits/pricing: https://developers.cloudflare.com/d1/platform/pricing/
- Dexie + React local persistence: https://dexie.org/docs/Tutorial/React
- FSRS TypeScript library (use stable version, not betas by default): https://github.com/open-spaced-repetition/ts-fsrs
- GitHub OAuth PKCE update: https://github.blog/changelog/2025-07-14-pkce-support-for-oauth-and-github-app-authentication/
- IEC copyright/symbol reproduction guidance: https://webstore.iec.ch/en/copyright

**Roadmap is a living document.** Verify library versions and free quotas during implementation.
