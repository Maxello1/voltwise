# Delivery status and issue-ready backlog

The current version includes the repository/toolchain, six-screen offline shell, stable FSRS adapter, 36 curated exercises, five reproducible DC calculation templates, four lessons, five verified DC library circuits, backups and deployment automation. The circuit library, foundation-module implementation and bounded calculation trainer are complete. Real-device acceptance and wider qualified curriculum review remain before full alpha acceptance is claimed.

## Delivery and next work

### [1. Expand the verified DC circuit library — implemented](https://github.com/Maxello1/voltwise/issues/1)

Delivered parallel, series, unloaded voltage-divider, closed-switch/lamp and ideal meter-placement examples. All five have checked component values, topology/reference tests, worked explanations, dedicated practice and Windows desktop/mobile visual baselines. Circuit selection is shareable, net highlighting follows explicit topology, and zoom/pan/fit controls work by touch and keyboard. Generated circuits and a general-purpose solver remain out of scope.

### [2. Validate installed PWA updates on real iPhone and desktop devices](https://github.com/Maxello1/voltwise/issues/2)

Run Safari/iPhone Home Screen, Windows Edge and Mac Safari/Chrome checks. Cover first cache, airplane-mode learning, IndexedDB availability, safe areas, touch targets, export/import and updating with an unrated attempt open. Add a previous-schema migration fixture before a schema upgrade. Capture/approve a Linux screenshot baseline for CI.

### [3. Complete the foundation learning module — implemented](https://github.com/Maxello1/voltwise/issues/3)

Delivered 36 curated versioned tasks, consistent recall aliases, checked content references and prerequisite graph, concept-specific recommendations with real sample counts, and shareable targeted practice. The mixed selection explains its choices, follows read prerequisites with learner override and keeps future scheduled facts separate. Existing records and version-1 backups remain compatible. See [content review](CONTENT_REVIEW.md) for the scope and remaining qualified review.

## Later milestones

Delivered calculation work: reproducible six-digit round codes; five checked DC equations; parameter-matched series/parallel diagrams; preserved offline sessions, attempts and version-1 backups; and a synthetic previous-release backup restoration fixture. See [generated practice](GENERATED_PRACTICE.md). Wider network solving, generated fault diagnosis and additional template families remain future work.

| Roadmap group         | Issue outline and acceptance                                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------------- |
| 0–1: delivery/offline | Cross-platform test matrix, performance and prior-version data migration fixtures                        |
| 2: learning           | Authoring validation delivered; broaden independently qualified pedagogical review                       |
| 3: schematics         | Five circuits delivered; extend reviewed visual baselines to Linux and add more curated drawing patterns |
| 4: applied exercises  | Five seeded DC templates delivered; extend supported network cases and reviewed troubleshooting tasks    |
| 5: controls           | Relay/contactor symbols and tested finite-state self-hold/interlock behavior before simulation claims    |
| 6: sync               | Authenticated Worker/D1; idempotency, clock-skew and multi-device convergence tests                      |
| 7: archives           | Versioned private snapshots and safe Markdown/vault export; exact restoration drill                      |
| 8: curriculum         | Qualified review for AC, motors, protection and imported school material                                 |
| 9: readiness          | Security/privacy review, corruption recovery, opt-in-only instrumentation and documented browser support |

No background synchronization or archive automation should be enabled just because the private repository exists.
