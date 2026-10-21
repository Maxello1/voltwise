# Circuit schema and symbols

The version-1 TypeScript DSL lives in `src/schematics/model.ts`. The verified example is `src/content/circuit.ts`. Domain topology never imports React or SVG.

## Geometry and electrical meaning

- Coordinates use SVG user units on a 10-unit grid, with x right and y down. A component position is its symbol origin. Rotations are clockwise 0/90/180/270 degrees.
- Terminal coordinates are component-local offsets transformed by the component rotation. Stable terminal IDs, such as `r1.a`, belong to exactly one net.
- Wire endpoints explicitly reference a terminal or junction ID. Orthogonal waypoint arrays describe geometry, and `netId` defines electrical membership. Display annotations do not alter the topology.
- A junction has an explicit point and net ID and renders as a filled dot. Two segments crossing without an explicit connected anchor remain separate. The validator rejects a terminal or junction that ambiguously touches a different net.
- Validation checks duplicate IDs, all references, endpoint coordinates, one-net terminal membership, grid/orthogonal routing and graph connectivity within each net. It does not solve arbitrary circuits or certify real-world wiring.
- Selection and feedback are renderer properties, outside the immutable circuit definition. SVG buttons support keyboard activation, descriptive names, selection styling and generous component targets. A separate 44 px select control makes every terminal accessible on phones where dense SVG terminals are small.

## Demo verification

G1 is an ideal 24 V DC source. R1=100 Ω and R2=200 Ω share the positive and reference nets. The reference net is the source's negative pole; it is **not asserted to be protective earth**. Junctions on the two branch rails are explicit.

`parallelCircuit()` computes branch currents U/R, equivalent resistance from summed conductance, total current and power. Tests assert 0.24 A, 0.12 A, 0.36 A, 200/3 Ω and 8.64 W, including power balance. This is a verified static teaching circuit, not a transient simulator.

## Symbols and licensing

The source, rectangular resistor, switch, lamp and reference symbol paths were drawn specifically for Voltwise from elementary circles, lines and rectangles. No paths or images were extracted from the IEC 60617 database. The demo renders the source and two resistors; the remaining basic symbols are registered for later curated circuits. Lucide supplies navigation icons under its ISC license, not electrical symbols. Dependency licenses remain in their installed packages.

Design references are the conventional teaching distinction between a rectangular resistor, a circle with a cross for a lamp, an open switch and a dotted connected junction. These are original educational drawings, not a claim of certification or exact IEC conformance. [IEC's copyright guidance](https://webstore.iec.ch/en/copyright) is the reference before adding externally sourced material.

## Growth path

1. Identify symbols and trace simple DC wiring.
2. Add series, parallel, divider and measurement examples with numerical fixtures.
3. Add Kirchhoff exercises and a separately tested supported-linear-DC solver.
4. Add reviewed AC/RLC interpretation separately from any solver.
5. Register NO/NC contacts, coils and contactors with explicit terminal roles and device references; test a finite-state relay model.
6. Add self-hold, overload and reversing-interlock scenarios with complete transition matrices.
7. Add three-phase/star-delta motor controls, timers, sensors, PLC I/O and multi-sheet fault scenarios only after editorial and model review.

Avoid deriving electrical connectivity from intersecting SVG paths. Future simulation state must reference a stable circuit revision and an explicit supported model. Safety behavior cannot be inferred from an attractive drawing.
