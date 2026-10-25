# Control circuits — v0.5 and v0.6

## v0.6 addition: forward/reverse contactors

The fourth control circuit is `control-reversing-v1`, using the separately versioned `reversing-v1` domain model. It adds K1/K2 coils, two NO holding contacts, explicit opposing NC 21–22 interlocks, common S0/F1 and an additional B1 release/command block. Both coil returns share G1−. Start Vor energizes K1, Start Rück energizes K2, and the running direction inhibits its opponent. Stop precedes a direction change; both Starts must be released before the new command. Simultaneous Starts open B1 until both are released. Supply loss/trip dominate; the conservative reset-edge/released-control rules remain explicit.

B1 also locks after an unexpected coil dropout. It senses command inputs and the trip latch; it does not magically identify a stuck-open contact. Ordinary electrical NC interlocking alone is not asserted to establish the chosen simultaneous-command rule. No mechanical interlock, motor power sheet, motor stop time or real contactor dynamics are modeled. This is a bounded teaching control, with independent contact-path tests rather than an installation-safety claim.

Six faults/missing-permission cases alter actual supply/contact/coil behavior. The shared SVG workbench includes supported virtual voltage measurements, contact/device inspection, net identity versus potential overlays and drag/pinch with keyboard alternatives. Dedicated Fehlersuche investigations save drafts and append attempts only on submission. Read [DIAGNOSTICS.md](DIAGNOSTICS.md) for exact topology, witness paths, initial conditions, physics, scoring, data compatibility and limitations.

The remaining sections describe the preserved v0.5 `control-v1` models. Their IDs, assumptions, transitions and exercise versions are unchanged.

Voltwise contains three curated, ideal 24 V DC control circuits. They use a deterministic finite-state model, **not a general network solver, motor simulation or safety-rated simulator**. SVG geometry and React do not decide electrical behavior.

## Implemented examples

| Stable circuit ID     | Devices and behavior                                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `control-lamp-v1`     | G1 supply, S1 momentary NO pushbutton, H1 indicator. Press lights H1; release or supply loss extinguishes it.                                    |
| `control-hold-v1`     | S0 NC Stop, S1 NO Start, K1 coil A1–A2 and mechanically associated NO auxiliary 13–14 parallel to Start. B1 adds explicit restart permission.    |
| `control-overload-v1` | Adds F1 NC 95–96, latched trip, manual reset and three reproducible scenarios: overload, held Start across supply loss, simultaneous Start/Stop. |

All five verified static DC drawings retain their values, IDs and worked calculations. Controls have stable component IDs, explicit terminal IDs/roles, net membership, junction anchors and device references. K1's two symbols reference the same device; that reference does not electrically join their terminals. The renderer also supports generic NO/NC contacts and the same coil symbol for relay and contactor devices.

## State and transition contract

`src/domain/control.ts` owns the pure `transitionControl(kind, previous, changes)` function. A transition merges one atomic input sample (supply, Start, Stop, fault cause, Reset) and returns a new state. It has no clock, random source, storage, React or SVG dependency. Inputs may change simultaneously; object property order does not decide the outcome.

The K1 models evaluate in this order:

1. A fault cause latches F1 in the overload example. Removing the cause or cycling supply does not clear the latch.
2. Only a rising Reset input can clear F1, with the cause absent, supply present, and both Start and Stop released. These deliberately conservative teaching conditions do not model every real relay's reset mechanism.
3. Missing supply, pressed Stop or latched F1 forces K1 off and B1 open, regardless of Start or the previous holding state.
4. After interruption B1 requires a released Start under healthy conditions. With Start held, B1 remains open.
5. With supply and all series permissions available, either Start or the previous K1 holding state energizes K1. The auxiliary contact immediately follows the new coil state. No transient delay is claimed.

| Sequence                                          | Result                                                              |
| ------------------------------------------------- | ------------------------------------------------------------------- |
| Press Start with healthy permissions              | K1 on, auxiliary closed                                             |
| Release Start after pickup                        | K1 stays on through its auxiliary contact                           |
| Start and Stop together                           | K1 off, auxiliary open; Stop takes priority                         |
| Release Stop with Start still held                | K1 off until Start is released and pressed again                    |
| Trip F1, then remove cause                        | F1 remains open; K1 off                                             |
| Trip and Reset together, or Reset with Start held | F1 remains latched; K1 off                                          |
| Hold Reset while removing cause                   | No reset; release and press Reset again under permitted conditions  |
| Valid manual Reset                                | F1 closes; K1 remains off until a new Start                         |
| Supply restoration, Start released                | K1 stays off until a new Start                                      |
| Supply restoration, Start held                    | B1 stays open until Start is released; a new press is then required |

**B1 is additional abstract restart logic.** Ordinary self-holding alone can restart when supply returns with Start held or stuck. The drawing includes a dashed B1 permission block in series and the UI/lesson explain its additional behavior. The monitor's sensing/internal wiring is abstracted; this is not a construction drawing or a certified safety relay. The direct S1/H1 lamp circuit intentionally has no B1: held S1 lights H1 again on supply restoration.

## Interaction and learning

Buttons explicitly alternate pressing/releasing so keyboard, mouse and touch users can inspect held states. Labels and `aria-pressed` report inputs. SVG contact geometry changes; energized sources, coils and lamps are highlighted. Text reports the result, so state does not rely on color alone. Gold wire highlighting means selection of an explicit net, not simulated voltage/current.

All three drawings use pan/fit, zoom up to 300%, keyboard component/terminal selection and 44 px view buttons. Dedicated component and terminal selectors offer another touch path. The details disclosure exposes state readings and fault scenarios. Circuit links are shareable.

`control-basics-v1` is a seven-minute German lesson. Ten version-1 tasks cover NC rest state, symbols, lamp release, coil/contact association, self-holding, Stop priority, overload diagnosis, Reset, supply restoration and the trip latch. Nine applied tasks append attempts without FSRS cards. Only the NC knowledge fact offers a separate memory rating. Existing recommendation/prerequisite/session rules apply; an older active session resumes first. Exercise drawings explicitly show the initial state; prediction sequences are described in the prompt.

Experiment state is temporary and resets to the initial deenergized load when reopening the view. Exploratory button presses are not saved learning attempts. Submitted exercises, hints, completions, sessions and ratings use existing event commands.

## Validation and compatibility

The general validator checks unique IDs, endpoint coordinates, terminal/net membership, orthogonal routing and declared connectivity. `control-validation.ts` additionally checks model revision, exact bindings, component kinds, terminal roles, 24 V supply, device ownership and the exact terminal partitions required by each supported ladder. A drawing whose topology disagrees with its model is rejected. Arbitrary networks are unsupported.

No IndexedDB stores/indexes, persisted schemas, original content versions, generated `dc1-*` algorithms or JSON format changed. Database and backup versions remain 1. Tests reopen an independently declared v0.4 schema-1 database containing an older pending knowledge answer and generated DC session, then export/restore through the current app. Old backups remain importable; backups containing new v0.5 content require an app that knows those IDs. No storage reset, cloud synchronization or automatic GitHub archival was added.

## Tests and limits

- Unit tests enumerate every reachable state with all 32 simultaneous input combinations for each model. An independent contact-graph traversal checks that the displayed contact states provide or interrupt the powered path to the load.
- Explicit tests cover Stop priority, held Start, supply restoration, trip latching, reset edges and rejected resets. Device tests cover NO/NC complementarity, relay/contactor linkage, bad references, topology and terminal/voltage errors.
- Component tests check rendered states, accessible names, keyboard selection, 300% zoom/pan/fit and scenario/reset controls.
- IndexedDB tests cover pending/new attempts, older active sessions, legacy schema reopening, additive/idempotent backup import and FSRS separation.
- Playwright covers desktop and Chromium phone emulation, both themes, 320 px overflow, view controls, transitions, scenarios, offline lessons/simulation/exercises, pending-answer restoration, recommendations and fresh-context JSON restoration.

Contacts/supplies are ideal, coils change immediately, lamps are binary indicators. There is no coil current, inductive decay, thermal trip curve/cooling, contact bounce, welded contacts, motor/three-phase power circuit, interlocking, E-stop function or fault coverage outside the three scenarios. Reset conditions and B1 are explicit teaching rules. Do not infer installation safety from the model.

See [verification](VERIFICATION.md) for final results. Physical iPhone/Safari, installed-PWA update acceptance and independent qualified electrical/pedagogical review remain outstanding.

## References and artwork

Siemens' [SIRIUS 3RU/3RB equipment manual](https://support.industry.siemens.com/cs/attachments/60298164/manual_SIRIUS_overload_relay_3RU_3RB_en-US.pdf) identifies NC 95–96 for interrupting the contactor and manual reset operation. Schneider Electric's [thermal-relay reset explanation](https://www.se.com/uk/en/faqs/FA28091/) documents physical reset and cooling, which this bounded model does not simulate. These are terminal/behavior references only; no vendor artwork was copied. See [symbol provenance](CIRCUIT_SCHEMA.md).
