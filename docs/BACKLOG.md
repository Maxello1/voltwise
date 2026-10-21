# Delivery status and issue-ready backlog

The first usable slice includes the repository/toolchain, six-screen offline shell, local learning loop, stable FSRS adapter, 16 exercises, four lessons, one verified circuit, backups and deployment automation. It does not complete every alpha roadmap milestone: the alpha target still needs 25–40 curated exercises, five circuits and real-device checks.

## Next three issues, in order

### [1. Expand the verified DC circuit library](https://github.com/Maxello1/voltwise/issues/1)

Add series, voltage-divider, lamp/switch and meter-placement examples. Acceptance: at least five original structured circuits, valid topology, checked expected results, interactive tasks and native visual baselines. Add targeted unit/solver tests before enabling generated circuits.

### [2. Validate installed PWA updates on real iPhone and desktop devices](https://github.com/Maxello1/voltwise/issues/2)

Run Safari/iPhone Home Screen, Windows Edge and Mac Safari/Chrome checks. Cover first cache, airplane-mode learning, IndexedDB availability, safe areas, touch targets, export/import and updating with an unrated attempt open. Add a previous-schema migration fixture before a schema upgrade. Capture/approve a Linux screenshot baseline for CI.

### [3. Complete the foundation learning module](https://github.com/Maxello1/voltwise/issues/3)

Grow to 25–40 curated exercises with worked solutions, concept tags, prerequisite review and stronger short-answer aliases. Add explainable weak-concept selection and more measurement questions. Acceptance: no unchecked electrical solutions and separate scheduling/mastery statistics.

## Later milestones

| Roadmap group         | Issue outline and acceptance                                                                              |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| 0–1: delivery/offline | Cross-platform test matrix, performance and prior-version data migration fixtures                         |
| 2: learning           | Structured content authoring validation, more exercises, robust pedagogical review                        |
| 3: schematics         | At least five curated circuits, net highlighting, larger drawing navigation and reviewed visual baselines |
| 4: applied exercises  | Reproducible seeded parameters; only supported linear DC math, checked against reference cases            |
| 5: controls           | Relay/contactor symbols and tested finite-state self-hold/interlock behavior before simulation claims     |
| 6: sync               | Authenticated Worker/D1; idempotency, clock-skew and multi-device convergence tests                       |
| 7: archives           | Versioned private snapshots and safe Markdown/vault export; exact restoration drill                       |
| 8: curriculum         | Qualified review for AC, motors, protection and imported school material                                  |
| 9: readiness          | Security/privacy review, corruption recovery, opt-in-only instrumentation and documented browser support  |

No background synchronization or archive automation should be enabled just because the private repository exists.
