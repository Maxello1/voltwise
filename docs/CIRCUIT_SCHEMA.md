# Circuit schema and symbols

The version-1 TypeScript DSL lives in `src/schematics/model.ts`. The original parallel example remains in `src/content/circuit.ts`; the four additional definitions are in `src/content/circuits/dc.ts`. `src/content/circuit-library.ts` provides the curated catalogue, explanations and stable-ID lookup. Domain topology never imports React or SVG.

## Geometry and electrical meaning

- Coordinates use SVG user units on a 10-unit grid, with x right and y down. A component position is its symbol origin. Rotations are clockwise 0/90/180/270 degrees.
- Terminal coordinates are component-local offsets transformed by the component rotation. Stable terminal IDs, such as `r1.a`, belong to exactly one net.
- A horizontal device with the `a` terminal on the left uses a clockwise 270° rotation of the default top-to-bottom terminal model. Meter letters counter-rotate to remain upright. Optional `labelOffset` changes label geometry only; labels stay separate from topology.
- Wire endpoints explicitly reference a terminal or junction ID. Orthogonal waypoint arrays describe geometry, and `netId` defines electrical membership. Display annotations do not alter the topology.
- A junction has an explicit point and net ID and renders as a filled dot. Two segments crossing without an explicit connected anchor remain separate. The validator rejects a terminal or junction that ambiguously touches a different net.
- Validation checks duplicate IDs, all references, endpoint coordinates, one-net terminal membership, grid/orthogonal routing and graph connectivity within each net. It does not solve arbitrary circuits or certify real-world wiring.
- Selection and feedback are renderer properties, outside the immutable circuit definition. SVG buttons support keyboard activation, descriptive names, selection styling and generous component targets. A separate 44 px select control makes every terminal accessible on phones where dense SVG terminals are small.
- A selected terminal resolves to its explicit net; selecting the net highlights the same wire segments and junctions. The topology is never changed by highlighting. Named nets, directional pan buttons and reset-to-fit make larger drawings readable. Incorrect component selection is red while the checked target is separately highlighted.

## Demo verification

G1 is an ideal 24 V DC source. R1=100 Ω and R2=200 Ω share the positive and reference nets. The reference net is the source's negative pole; it is **not asserted to be protective earth**. Junctions on the two branch rails are explicit.

`parallelCircuit()` computes branch currents U/R, equivalent resistance from summed conductance, total current and power. Tests assert 0.24 A, 0.12 A, 0.36 A, 200/3 Ω and 8.64 W, including power balance. This is a verified static teaching circuit, not a transient simulator.

## Five checked examples

| Definition   | Assumptions                                                        | Known results                              |
| ------------ | ------------------------------------------------------------------ | ------------------------------------------ |
| parallel-24v | 24 V, 100 Ω parallel to 200 Ω                                      | 0.24/0.12 A branches, 0.36 A total, 8.64 W |
| series-24v   | 24 V, 100 Ω + 200 Ω                                                | 0.08 A, 8 V / 16 V drops, 1.92 W           |
| divider-12v  | 12 V, 1 kΩ above 2 kΩ, no output load                              | 4 mA, 8 V output across R2, 48 mW total    |
| lamp-12v     | 12 V, closed ideal switch, fixed 60 Ω lamp model                   | 0.2 A, 2.4 W                               |
| meters-24v   | 24 V, 100 Ω, ideal 0 Ω ammeter, ideal voltmeter drawing no current | A1: 0.24 A, V1: 24 V, load: 5.76 W         |

`seriesCircuit()` and `unloadedVoltageDivider()` are explicit algebraic helpers, not netlist solvers. Tests use each drawing's actual component values and separately assert series continuity, the divider's output/reference nodes, the lamp's closed contact, and exact meter-to-load net membership. Unsupported non-finite input/results are rejected. No generated or arbitrary circuit solving is enabled. The lamp's real temperature-dependent behavior, loaded dividers and non-ideal meters require different models.

Catalogue additions are packaged content. No database or backup schema changed in 0.2; all original exercise IDs and versions remain intact. Existing sessions carry their original exercise-ID lists, so catalogue growth cannot append new steps to an in-progress session.

## Symbols and licensing

The source, rectangular resistor, switch, lamp, reference, ammeter and voltmeter symbol paths were drawn specifically for Voltwise from elementary circles, lines, rectangles and upright A/V letters. Switch geometry respects the declared open/closed state; the lamp example depicts a fixed closed state. No paths or images were extracted from the IEC 60617 database. The reference symbol remains registered for later curated circuits. Lucide supplies navigation icons under its ISC license, not electrical symbols. Dependency licenses remain in their installed packages.

Design references are the conventional teaching distinction between a rectangular resistor, a circle with a cross for a lamp, an open switch and a dotted connected junction. These are original educational drawings, not a claim of certification or exact IEC conformance. [IEC's copyright guidance](https://webstore.iec.ch/en/copyright) is the reference before adding externally sourced material.

## Version-1 control drawings

The DSL now discriminates `verified-static` numeric references from `finite-state` `control-v1` models; it does not attach invented resistance/current values to controls. Three packaged definitions in `src/content/circuits/control.ts` add 24 V control supply, NO/NC contacts, momentary NO/NC pushbuttons, relay/contactor coils, linked auxiliary contacts, overload trip and a B1 restart-permission block. All paths are original elementary line/circle/rectangle geometry. No IEC/vendor paths were copied and no certification/conformance is asserted.

Terminal IDs remain explicit (`s1.a`, `s1.b`, `k1-coil.a`, etc.); roles label 13/14, 11/12, A1/A2, 95/96 and X1/X2 on the control drawings. Device IDs distinguish K1 coil/contact association from conductive topology. B1's dashed box identifies additional abstract logic, with internal sensing/wiring outside this model.

The ordinary net validator is followed by control checks for revision, bindings, symbol kinds, terminal roles, device ownership, nominal supply and exact supported terminal groups. The pure domain engine supplies component states; SVG does not infer them from line intersections. Generic linked NO/NC states are complementary to coil energization. Only the declared three ladder patterns are simulated. Net selection remains selection, not voltage coloring. See [control circuits](CONTROL_CIRCUITS.md) for transition rules, independent contact-path tests and limitations.

## Growth path

1. Identify symbols and trace simple DC wiring.
2. Add series, parallel, divider and measurement examples with numerical fixtures.
3. Add Kirchhoff exercises and a separately tested supported-linear-DC solver.
4. Add reviewed AC/RLC interpretation separately from any solver.
5. Delivered in v0.5: NO/NC contacts, relay/contactor coils, terminal roles, device references and bounded finite-state self-holding/overload models.
6. Extend to reversing interlocks only after complete transition matrices and separate model review.
7. Add three-phase/star-delta motor controls, timers, sensors, PLC I/O and multi-sheet fault scenarios only after editorial and model review.

Avoid deriving electrical connectivity from intersecting SVG paths. Future simulation state must reference a stable circuit revision and an explicit supported model. Safety behavior cannot be inferred from an attractive drawing.
