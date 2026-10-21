# Delivery status and issue-ready backlog

The current version includes the repository/toolchain, six-screen offline shell, stable FSRS adapter, 26 exercises, four lessons, five verified DC circuits, backups and deployment automation. The circuit-library implementation is complete. Real-device checks and further curriculum/editorial work remain before the full alpha acceptance is claimed.

## Next three issues, in order

### [1. Expand the verified DC circuit library — implemented](https://github.com/Maxello1/voltwise/issues/1)

Delivered parallel, series, unloaded voltage-divider, closed-switch/lamp and ideal meter-placement examples. All five have checked component values, topology/reference tests, worked explanations, dedicated practice and Windows desktop/mobile visual baselines. Circuit selection is shareable, net highlighting follows explicit topology, and zoom/pan/fit controls work by touch and keyboard. Generated circuits and a general-purpose solver remain out of scope.

### [2. Validate installed PWA updates on real iPhone and desktop devices](https://github.com/Maxello1/voltwise/issues/2)

Run Safari/iPhone Home Screen, Windows Edge and Mac Safari/Chrome checks. Cover first cache, airplane-mode learning, IndexedDB availability, safe areas, touch targets, export/import and updating with an unrated attempt open. Add a previous-schema migration fixture before a schema upgrade. Capture/approve a Linux screenshot baseline for CI.

### [3. Complete the foundation learning module](https://github.com/Maxello1/voltwise/issues/3)

The count target now has 26 curated exercises, including ten circuit-specific tasks. Continue editorial/prerequisite review, improve short-answer aliases, and add explainable weak-concept selection. Keep the memory schedule independent of applied practice, with checked worked solutions for all content.

## Later milestones

| Roadmap group         | Issue outline and acceptance                                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------------- |
| 0–1: delivery/offline | Cross-platform test matrix, performance and prior-version data migration fixtures                        |
| 2: learning           | Structured content authoring validation, more exercises, robust pedagogical review                       |
| 3: schematics         | Five circuits delivered; extend reviewed visual baselines to Linux and add more curated drawing patterns |
| 4: applied exercises  | Reproducible seeded parameters; only supported linear DC math, checked against reference cases           |
| 5: controls           | Relay/contactor symbols and tested finite-state self-hold/interlock behavior before simulation claims    |
| 6: sync               | Authenticated Worker/D1; idempotency, clock-skew and multi-device convergence tests                      |
| 7: archives           | Versioned private snapshots and safe Markdown/vault export; exact restoration drill                      |
| 8: curriculum         | Qualified review for AC, motors, protection and imported school material                                 |
| 9: readiness          | Security/privacy review, corruption recovery, opt-in-only instrumentation and documented browser support |

No background synchronization or archive automation should be enabled just because the private repository exists.
