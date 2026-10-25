# Changelog

## 0.6.0 — 2026-10-25

- Corrected diagnostic evidence matching to accept fixed hardwired terminal alternatives, including G1− for K1 A2. Signed polarity, operating-state, ordering and inspection requirements remain enforced; switched equipotentials do not substitute for fixed nets.
- Added a fixed 24 V reversing contactor control with explicit opposing NC interlocks, self-holding, Stop/trip priority, reset edges and additional B1 release/command arbitration. Simultaneous Starts inhibit both coils; changing direction requires Stop/release/new Start.
- Added six versioned electrical fault/permission scenarios, twelve graded investigations across three levels and three supporting applications, for 61 curated exercises and six lessons.
- Added signed terminal-based virtual voltage measurements with explicit 0 V reference, ideal disabled-source assumptions and undefined floating potentials. No current/resistance or motor power solver is claimed.
- Added persisted investigation actions, component observations, measurement evidence, explicit causal explanations and a 6-point rubric; only submitted diagnoses affect learning attempts. Added distinct-fault coverage without inflating it through repeated positions or creating FSRS cards.
- Added numbered Dexie migration 2 and JSON backup version 2 for drafts, preserving old events, pending ratings, generated DC IDs and import of version-1 backups.
- Extended the original SVG viewer with drag/pinch, net-versus-potential overlays and post-submission fault outlines. Added a larger original two-branch schematic with explicit terminal/device references and connection dots.
- Added independent electrical references, exhaustive state/input enumeration, migration/concurrency/restore checks, complete offline browser diagnoses at all levels and six Windows diagram baselines. Physical Safari and independent qualified acceptance remain open.

## 0.5.0 — 2026-10-22

- Added three progressive interactive 24 V control circuits: momentary lamp, contactor self-holding and latched overload with manual reset and three troubleshooting scenarios.
- Added original NO/NC and pushbutton symbols, relay/contactor coils, device-linked auxiliary contacts, overload contacts and an explicitly identified additional B1 restart-permission block.
- Added deterministic React-independent state transitions with Stop/trip priority, reset-edge validation and release-before-restart behavior after interruption. Kept ordinary self-holding distinct from B1's additional function.
- Added actual contact geometry and coil/lamp states, German explanations, component selectors, terminal-role labels and 300% control-diagram zoom with keyboard/touch controls.
- Added one German lesson and ten versioned tasks, for five lessons and 46 curated tasks. Nine new applied tasks append attempts without FSRS; only the contact fact offers a separate memory rating.
- Preserved database/backup schema 1, all previous content and generated DC versions. Added previous-schema reopening and new/old backup restoration coverage.
- Added exhaustive state/input tests with an independent contact-path oracle, rendering tests and offline desktop/mobile browser flows. Made two existing browser cases wait for asynchronous session navigation before choosing identically named diagram components.

## 0.4.0 — 2026-10-21

- Added five reproducible DC calculation templates with six-digit round codes, shareable links and matching series/parallel diagrams.
- Added offline round completion, pending-answer restoration, fresh-browser JSON restoration and links back from calculation history.
- Preserved active sessions, all curated IDs/versions, the database schema and the version-1 backup format. Added a synthetic 0.3-format pending-review fixture.
- Kept generated attempts in concept practice statistics while separating them from the 36 curated-item discovery count and from FSRS cards.
- Made displayed numeric solutions safe to re-enter, with enough significant digits and no ambiguous thousands separators.
- Added independent equation/range/rounding checks over 512 seeds, pinned v1 reference rounds, diagram integrity checks and desktop/mobile browser coverage.

## 0.3.0 — 2026-10-21

- Added ten foundation exercises for a total of thirty-six, covering units, prefixes, Ohm's law, power, series/parallel reasoning and ideal measurements.
- Added concept recommendations with recorded sample counts and a warning for small samples; dashboard and progress now use the same recent evidence.
- Added shareable targeted practice and an explanation for each proposed task.
- Made mixed sessions respect read prerequisites, prefer unseen applications of concepts needing practice, and leave future FSRS facts on their own timetable.
- Accepted Unicode compatibility text, repeated terminal punctuation and consistent declared recall pairs such as Ohm (Ω), while rejecting ambiguous answers.
- Added content-reference/prerequisite validation and offline targeted-session checks. Existing content versions, learning events and version-1 backups remain compatible.

## 0.2.0 — 2026-10-21

- Expanded the library to five checked DC circuits with shared links, worked explanations and dedicated practice.
- Added series, unloaded voltage-divider, closed-switch/lamp and ideal meter-placement diagrams with original meter symbols.
- Added ten exercises for a total of twenty-six, preserving all existing exercise IDs and learning records.
- Added topology-based net highlighting, zoom/pan/fit controls and distinct wrong/correct schematic feedback.
- Added series/divider math, connection/rotation checks and visual baselines for every circuit on desktop and mobile.
- Corrected mobile diagram-card overflow and strengthened viewport tests.

## 0.1.0 — 2026-10-21

- Added the offline learning workspace, four lessons and sixteen German exercises.
- Added durable practice sessions, attempt history, explicit FSRS review ratings and local progress.
- Added the typed SVG circuit engine and verified 24 V parallel-circuit challenge.
- Added validated JSON backups, Markdown lesson export, themes and installation guidance.
- Added automated checks and GitHub Pages deployment.
- Preserved the confirmed offline-ready indicator when reopening the installed shell.
