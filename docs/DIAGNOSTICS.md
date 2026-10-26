# Interactive diagnostics — v0.6

The German **Fehlersuche** screen is available from Üben and the new reversing schematic. It offers twelve curated investigations over six versioned fault families, with four investigations at each difficulty. Three additional applied tasks cover interlock identification, simultaneous commands and voltage polarity. A sixth lesson explains the assumptions. The complete catalogue contains 61 exercises; all previous exercise IDs and versions remain unchanged.

## Baseline and implementation decisions

Work starts from `07a6e5718222197c07bda9b43cf614e495077671`, the head of open PR #4, fetched and inspected on 25 October 2026. The v0.6 branch targets `feat/control-circuits-v05`; the parent PR is neither merged nor rewritten. Existing static calculations, `control-v1`, generated DC v1 algorithms and FSRS remain separate.

The implementation extends the original SVG viewer, introduces an independently bounded reversing model and adds a transactional investigation draft. It deliberately delivers one reviewed topology, a small fixed fault set and complete offline learning paths. Arbitrary fault generation, motor power sheets, mechanical interlock physics and network synchronization remain outside this delivery.

## Supported scenarios

Every scenario in `src/content/diagnostic-scenarios.ts` has stable ID/version, circuit ID/version, model revision, explicit fault/location, initial input/latch states, symptom, measurement witnesses, a causal answer, German explanation/hint and supported difficulties. All scenarios use the same supported measurement set: every declared terminal of `control-reversing-v1`, revision 1. No SVG coordinate is a measurement point.

| Scenario ID        | Fault and location                         | Expected observation / decisive virtual measurement                                                                        |
| ------------------ | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `diag-supply-v1`   | G1 control output unavailable              | Requested supply, both coils off; G1+ minus G1− = 0 V                                                                      |
| `diag-start-v1`    | S1 remains open when pressed               | Vor pressed, K1 off; S1 13 minus 14 = 24 V                                                                                 |
| `diag-stop-v1`     | S0 remains open when released              | Stop released, Vor pressed; S0 11 minus 12 = 24 V                                                                          |
| `diag-hold-v1`     | K1 auxiliary NO fails to close             | K1 13–14 open while coil is on; A1–A2 = 24 V while Vor pressed and 0 V after release                                       |
| `diag-overload-v1` | F1 95–96 remains open after trip/reset     | Trip has already been acknowledged, cause absent; with Vor pressed F1 95 minus 96 = 24 V                                   |
| `diag-restart-v1`  | B1 lacks release-before-restart permission | Vor held through prior supply interruption; B1 in minus out = 24 V, K1 off; release both Starts and press again to recover |

F1's failed contact is distinct from its normal trip latch. A valid Reset can clear the latch but cannot repair a stuck-open contact. The B1 case is a missing operating condition, not a claim that the monitor is defective. Its missing permission is recoverable by the documented release sequence. Other injected faults remain until cleared in the pure model. The free explorer is healthy and does not log attempts.

## Electrical model and direction changes

`src/domain/reversing.ts` owns input samples, transitions, device/contact projections, fixed terminal/net partitions and voltage measurement. It imports no React or SVG. `reversing-v1` references `control-reversing-v1` drawing revision 1. The renderer receives a projection; it cannot decide whether a coil is on.

S0 and F1 are common series contacts. Each direction has a NO Start parallel to its own NO holding contact, followed by the opposing contactor's NC 21–22 and the coil A1–A2. The opposing contacts explicitly reference their devices: K2 21–22 inhibits K1, and K1 21–22 inhibits K2.

B1 is an **additional abstract release/command monitor**. It senses commanded Starts, Stop, supply and the normal trip latch, not a hypothetical diagnosis of failed contacts. Both Start commands together open B1 and leave both coils off. Missing supply, Stop and trip dominate. After an interruption or unexpected coil dropout, release both Starts before restarting. To reverse a running circuit: press Stop, release both Starts, release Stop, press the other Start. Requesting the opposing direction while running leaves the current direction held. Reset requires a rising edge, supply present, cause absent and both Starts/Stop released. Reset never starts a coil.

The state space contains `off`, `forward` and `reverse`; the independent contact-path tests also verify that the rendered electrical paths never power both coils. This is a deterministic teaching rule, not a simulation of two real contactors racing to pull in. No mechanical interlock, contact travel, motor coast-down or safe reversal delay is represented. No three-phase power sheet is claimed.

## Virtual voltage measurements

The supported measurement set is the 24 declared terminals of the fixed control circuit. G1− and both A2 returns are the common 0 V reference. G1+ is an ideal 24 V output when available. **Disabled/interrupted G1 is explicitly idealized as a 0 V output**, not an arbitrary broken wire with an unknown residual potential. There are no capacitors, backfeeds or inductive transients.

Closed ideal contacts join equipotential groups. A coil provides a passive DC connection from A1 to its grounded A2: without a positive feed its A1 group settles to 0 V. Its resistance/current is not calculated. This reduction is valid only for this fixed topology with both coil returns at reference; it must not be reused as an arbitrary network solver.

The ideal voltmeter takes no current. It reports `potential(red) − potential(black)`, including −24 V when probes are reversed. Isolated groups have undefined absolute potential; a reading across different groups involving an undefined potential is **unbestimmt**. Two terminals in the same equipotential group have a known 0 V difference, even if their absolute potential is undefined. Unknown terminal IDs are rejected. A 0 V result alone never proves that a contact is closed.

No current, resistance, thermal trip curves, meter loading, phantom voltages, induced voltages or protection coordination are modeled. This screen is a hypothetical educational simulation, not guidance for probing live installations.

## Investigation and scoring

Each action is a versioned input sample, a terminal pair measurement or a component inspection. Measurements and state observations are replayed from the scenario's initial state and the full action sequence. Stored client-supplied numeric readings are not trusted as grading evidence. A bounded investigation contains up to 24 actions, leaving the serialized submitted response within the existing 2,000-character event field. The UI reports the bound before further actions; location/explanation and submission remain available.

| Rubric                                                                | Points |
| --------------------------------------------------------------------- | ------ |
| Correct component / missing permission located                        | 2      |
| Correct declared causal mechanism selected                            | 2      |
| Scenario-specific electrical evidence in the required operating state | 2      |

All six points are required for an automatically correct applied attempt. A correct guess without electrical evidence earns 4/6 and is recorded as incomplete. Reversed probe polarity with the matching signed result is equivalent evidence. Witnesses must occur in the defined order: the holding case needs 24 V while pressed followed by 0 V after release, rather than an initial idle reading. Supply-loss evidence requires the supply still requested. Advanced inspections must show the relevant abnormal component state, rather than an ordinary unpressed Start. Invalid points/malformed traces are rejected; measurements made in an inappropriate control state do not establish the witness. Free text is not interpreted or graded.

- **Geführt:** symptom, expected operation, suggested workflow and optional concrete measurement hint; requires the decisive witness.
- **Eigenständig:** additionally requires the supply measurement. The holding fault requires both coil-voltage states.
- **Herausforderung:** additionally requires inspection of the fault component in its revealing state. The failed holding contact must be inspected while K1 is energized.

Hints are explicit and sticky in the draft; they remain independent of automatic correctness and FSRS. Feedback displays the rubric, action/measurement/hint counts and whether the final location was wrong. The diagram reveals the actual location only after submission. Exploratory selector changes are not counted as failed diagnoses; submitted wrong diagnoses are immutable attempts.

Recommendations and concept practice include these applications. Level suggestions depend transparently on the number of distinct fault families already fully solved without hints: fewer than two suggests guided, fewer than four suggests independent, otherwise challenge. Learners can override every suggestion. The progress screen separately counts distinct solved families (0–6); repeating one fault does not raise this coverage. Neither this count nor the existing recent-attempt quote is called proof of proficiency or transfer to real equipment.

## Persistence and compatibility

Dexie migration **2** adds only `diagnosticDrafts` (`sessionId`, indexed exercise ID/update time) and updates metadata. It does not rewrite an attempt, review, session queue, setting or old content meaning. Schema 1 remains declared unchanged. The new exercise discriminator is packaged content; existing session modes remain intact.

Draft commands transactionally reread the active step, merge concurrent actions/field changes, reject editing a submitted step and preserve hints. Navigation and reload restore the draft, control state, measurements, fault selection and causal explanation. An existing session or pending FSRS rating always resumes before a requested new case. Submission checks the authoritative stored draft, rejects stale cross-tab responses, grades it and appends one ordinary AttemptEvent plus pending-step pointer atomically. Duplicate submissions reuse the same event. The original response stores versioned investigation JSON; its normalized response stores readable diagnosis/score text. There is no FSRS review/card for diagnostic applications.

**Backup version 2** adds the draft array. Import accepts both the original version-1 format and version 2, validates references and replays draft and submitted diagnostic traces before any mutation. Malformed diagnostic JSON is rejected before it can break restored feedback. Immutable-event conflict rules and atomic additive imports remain. Local investigations take precedence over imported drafts with the same session ID. Backup imports never silently replace an open local investigation; older v0.4/v0.5 backups and pending/generated sessions remain valid. A v0.5 app cannot read a v0.6 version-2 backup; export/restore it with v0.6 or newer. No IndexedDB reset or automatic archive/sync was introduced.

## Renderer and interaction

The original SVG symbols are reused with a larger two-branch drawing, explicit connection dots, terminal roles and device references. No third-party artwork is added. `reversing-validation.ts` checks the exact terminal partitions, component kinds, devices, nominal source voltage and supported revision; the general validator checks routing and endpoints.

Zoom buttons, keyboard selection, directional pan and reset-to-fit remain. Pointer drag and two-pointer pinch are added for dynamic diagrams. On narrow screens the complete drawing fits initially; zoom for terminal labels, then drag or use the pan buttons. Select controls provide an alternative to dense SVG targets. Long descriptions remain in document flow.

**Schaltplan verstehen** separates two overlays: net identity uses colored dash patterns; voltage uses green for +24 V, gray for 0 V and dashed lines for undefined potential. Gold always selects an explicit net. Coil fill indicates energization, contact geometry indicates open/closed, blue terminal circles indicate measurement points and a red dashed component outline reveals the submitted case's location. A connected net is never labeled as carrying current. Net identity and voltage are different views.

## Verification and remaining acceptance

See [VERIFICATION.md](VERIFICATION.md) for final command results. Coverage includes exhaustive reachable state/input enumeration for the healthy model and all six fault behaviors; a separately hard-coded contact graph and terminal partition oracle; fixed signed/open/floating-voltage references; independently authored reference paths for all twelve investigations; wrong-state/missing evidence; fault clearing; overload/reset edges; schema-1 fixtures; concurrent draft/submission commands; v1/v2 additive JSON restore and FSRS separation.

Browser tests complete an offline diagnosis at each difficulty on desktop and phone emulation, reload before/after submission, preserve investigations across schematic navigation, restore feedback in a fresh offline profile, test keyboard selection and actual Chromium touch events for pinch/drag, check 320/375/390/430 px widths in both themes and compare six reviewed Windows diagram images. Windows captures are review evidence; native Linux image baselines, physical iPhone Safari, installed-PWA updates and qualified independent electrical/pedagogical acceptance remain outstanding.

## Primary references and original artwork

- Schneider Electric [standard reversing starter auxiliary contacts](https://www.se.com/us/en/faqs/FA114642/) documents separate NC electrical interlocking and NO holding contacts. The chosen B1 command arbitration is Voltwise's explicitly additional teaching assumption.
- Schneider Electric [LRD terminal explanation](https://www.se.com/be/en/faqs/FA107663/) identifies NC 95–96 in series with the control circuit.
- Schneider Electric [TeSys Giga trip reset](https://productinfo.se.com/tesysgigainstallationguide/tesys-giga-series-giga-contactors-and-giga-thermal-overload-relays-installation-guide/English/TeSys%E2%84%A2%20Giga%20Series%20Giga%20Contactors%20and%20Giga%20Thermal%20Overload%20Relays%20Installation%20Guide_0000447511.xml/%24/PanGu_TripResetCPT_0000524825) distinguishes the latched trip, reset and trip priority. Actual product reset/cooling behavior is not generalized into this bounded model.

References were checked on 25 October 2026. No manufacturer/IEC paths or diagrams were copied. All contact, coil and wiring geometry remains original Voltwise educational artwork; see [CIRCUIT_SCHEMA.md](CIRCUIT_SCHEMA.md).
