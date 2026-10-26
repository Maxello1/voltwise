# Schulstoff und Labore — v0.8

## Delivered scope

The expansion adds **15 lessons, 75 curated exercises and 16 reproducible calculation families**. The complete curated catalogue now has **21 lessons and 136 exercises**. Existing DC, contactor, reversing, diagnostics, FSRS, backup and optional synchronization functionality remains available.

| Area                 | New lessons | New exercises | Learning tools                                                                                                               |
| -------------------- | ----------: | ------------: | ---------------------------------------------------------------------------------------------------------------------------- |
| Wechselstromtechnik  |           6 |            29 | Sine/cursor animation, two voltage signals, phasors, ideal R/L/C, vector construction                                        |
| Gleichstrommaschinen |           5 |            25 | Selectable cross-section, animated/stepped loop, commutation comparison, force/torque, counter-EMF, five excitation diagrams |
| SPS-Grundlagen       |           4 |            21 | Theory, complete generator table, static verified FUP, FC/OB1/PLCSIM workflow, applied calculations                          |

The user narrowed SPS to theory and learning exercises. A programmable SPS laboratory, FUP editor and hardware connection are deliberately outside this release. The Boolean graph code verifies the theory example; it is not an exposed editor or a TIA exporter.

Open **Lernen** and use the grouped topic selector, or **Schaltpläne → Wechselstromlabor / Motorlabor**. The six top-level navigation entries remain. Topics stay accessible without prerequisite locks; prerequisites guide the mixed practice planner. New lessons start unread and new concepts have no invented score.

The 75 tasks contain **23 numeric, 34 choice, 3 reviewable recall and 15 interactive applications**. Applications cover one waveform configuration, one phasor endpoint, three motor-component selections and ten multi-step calculations. Choice order is reproducibly varied. Only genuine recall facts offer separate explicit memory ratings; automatic correctness never becomes an FSRS rating.

## Sources and editorial boundary

The available attachment was a detailed curriculum specification. Neither `ROE: SPS TIA.pdf` nor `Arbeitsblatt 08-01.pdf` was present in the workspace; their scans and handwriting were **not inspected**. Page attribution is a scope mapping supplied by that specification, not a claim of direct transcription.

Lessons and curated tasks carry `schulstoff-2026-10`, source A/B and page ranges. The core topics and classroom reference cases follow the supplied scope. All prose, diagrams, worked steps, additional examples and model assumptions are original didactic explanations. Generated variations are explicitly tagged `Ergänzende Erklärung`. The passive-load sign convention and precise motor angle geometry are documented teaching decisions.

No worksheet scan, personal record or copied worksheet illustration is published. All diagrams use original SVG geometry; see [symbol provenance](CIRCUIT_SCHEMA.md). Secondary IP/cable/hexadecimal topics were not added. Ohm, power, series/parallel and measurement already have foundation coverage.

Primary references consulted to check specific relationships, without copying their prose or artwork:

- [OpenStax: simple AC circuits](https://openstax.org/books/university-physics-volume-2/pages/15-2-simple-ac-circuits): ideal R/L/C and lead/lag.
- [OpenStax: current-loop force and torque](https://openstax.org/books/university-physics-volume-2/pages/11-5-force-and-torque-on-a-current-loop): vector force and angle-dependent torque. Our alpha is a radius angle; textbook normal-vector angles need conversion.
- [Siemens: Function (FC)](https://docs.tia.siemens.cloud/r/simatic_s7_1200_manual_collection_enus_20/programming-concepts/using-blocks-to-structure-your-program/function-fc): no associated instance DB.
- [Siemens SCE FC programming](https://www.automation.siemens.com/sce-static/learning-training-documents/tia-portal/basics-programming-s7-1200/sce-031-100-fc-programming-s7-1200-r1709-en.pdf): FC/OB1 and simulated testing workflow. V15.1 remains historical worksheet context, not a current-interface claim.

Independent instructor review remains a separate editorial acceptance step.

## AC conventions and equations

`domain/ac.ts` contains pure SI calculations. Frequency/component values must be positive and finite. Unsupported zero-frequency/zero-component limits and overflow throw instead of displaying infinity.

- `T = 1/f`, `ω = 2πf`, elapsed angle `α = ωt`.
- `u(t) = Û sin(ωt + φ)`: positive φ leads the zero-phase sine.
- `Ueff = Û/√2`, `Î = √2 Ieff`, only for a pure sine.
- Same-frequency, same-quantity phasors: `x = U cos φ`, `y = U sin φ`, add components, use `atan2`. A zero-result angle displays 0° by convention.
- R: `Ieff = Ueff/R`, current phase 0°, `P = Ueff Ieff`, `Q = 0`.
- L: `XL = 2πfL`, `Ieff = Ueff/XL`, current phase −90°, `P = 0`, `Q = +Ueff Ieff`.
- C: `XC = 1/(2πfC)`, `Ieff = Ueff/XC`, current phase +90°, `P = 0`, `Q = −Ueff Ieff`.

Q uses the signed passive-load convention: inductive positive, capacitive negative, measured in var rather than W. The laboratory describes **one ideal component in sinusoidal steady state**. It does not solve arbitrary AC networks, transients, losses, saturation or equipment ratings.

Waveforms share a 0…2T time window. At 50 Hz, T = 20 ms. The draggable model-time cursor controls values and synchronized rotating projections independently of zoom and pan. Animation is deliberately slowed; its refresh rate is not the electrical frequency. Voltage/current plots have separate V/A axes and solid/dashed curves. Their phasors are explicitly normalized to their own peaks. Vector addition instead labels actual RMS volts. Two voltage comparisons have their own clearly labeled amplitude scales.

Independent fixtures: 325 V peak, 50 Hz, 1 ms → 18° and 100.430523 V. Also, 20 V at 0° + 15 V at 60° → x = 27.5 V, y = 12.990381 V, magnitude = 30.413813 V, angle = 25.284996°.

## Motor convention and limits

`domain/dc-motor.ts` models one loop with two axial active conductors. B points +x. Positive current in the first conductor points out of the drawing (+z), so `I·l × B` points +y. Alpha is its radius angle, counterclockwise from +x.

The axial conductors remain perpendicular to B; each experiences `F = B I l`. The perpendicular lever arm changes, giving `M = 2 F r cos α` without commutation. The ideal split ring reverses current at 90°/270°. With original field/supply polarities, torque becomes `2 F r |cos α|`. Exact neutral contact is modeled as zero current. A single loop cannot self-start from its zero-torque dead position.

Reference: B = 0.8 T, I = 2 A, l = 0.03 m → **0.048 N per conductor**. At r = 0.02 m, one perpendicular force contributes 0.00096 N·m; both together contribute **0.00192 N·m**. The factor two is not applied again as an additional conductor multiplier. Either field or supply reversal reverses torque; reversing both preserves it.

Position, current arrows, forces, commutator and torque derive from the same angle state. Rotation speed is prescribed, not calculated from acceleration or load. Reduced-motion preference disables continuous motion but preserves steps and keyboard controls. Counter-EMF is a separate numeric operating point: `Ui = kΦω`, `IA = (U−Ui)/RA`; it is not inferred from animation speed. Ui > U gives signed generator current in this simplified equation.

Seven selectable parts and five distinct excitation diagrams have explicit terminal/net membership. Compound winding sense is not assumed. Armature reaction, brush position, interpoles, compensation and bar/coil winding are taught qualitatively through explanations and cause/effect questions. No field solver, thermal model, real commutation transient, load characteristic or safety approval is represented.

## SPS reference oracle

Bit order: **E24.3 E24.2 E24.1 E24.0**. Motor powers 1…4: 2, 3, 5, 7 kW. **0 means running**, 1 means off. **A24.0 = 1 exactly when P < 10 kW**. The source introduction's “maximum 10 kW” is ambiguous; its explicit formula and supplied table govern this reproduction. Both 10-kW states are false.

| Bits |  kW | A24.0 |
| ---- | --: | ----: |
| 1111 |   0 |     1 |
| 1110 |   2 |     1 |
| 1101 |   3 |     1 |
| 1100 |   5 |     1 |
| 1011 |   5 |     1 |
| 1010 |   7 |     1 |
| 1001 |   8 |     1 |
| 1000 |  10 |     0 |
| 0111 |   7 |     1 |
| 0110 |   9 |     1 |
| 0101 |  10 |     0 |
| 0100 |  12 |     0 |
| 0011 |  12 |     0 |
| 0010 |  14 |     0 |
| 0001 |  15 |     0 |
| 0000 |  17 |     0 |

`P/kW = 7(1−E24.3)+5(1−E24.2)+3(1−E24.1)+2(1−E24.0)`.

Equivalent FUP: `(E24.1 ∧ E24.2) ∨ (E24.3 ∧ (E24.0 ∨ E24.1 ∨ E24.2))`. `boolean-logic.ts` checks gate arity, unique IDs, explicit input/`.Q` terminal references and absence of combinational cycles, even in unused branches. The reference graph is exhaustively compared to the independently declared 16-row oracle. The original static FUP has no implied junction at a wire crossing.

## Persistence, IDs and units

No new table, persisted draft or backup field is needed. **Dexie migrations remain 1→2→3; export stays format 3**, importing formats 1/2/3. Previous IDs, pending ratings, attempts, active sessions, diagnostic drafts and consent are preserved. No IndexedDB reset or Cloudflare production configuration change is used.

`Exercise.type = application` has four strict bounded JSON `version: 1` answer kinds: waveform, physical phasor endpoint, motor part and named numeric steps. Unknown keys, invalid values, mismatched kinds and unsupported versions are rejected. They fit the existing 2000-character immutable answer field. Explicit submission uses the original transactional duplicate protection, session references, outbox and restore path. Backup and sync ingestion validate the same schema. Exploratory controls and unsubmitted forms are ephemeral; graded feedback/session position resume. Animation and slider streams never synchronize.

New immutable IDs: `ac1-<family>-<code>`, `motor1-<family>-<code>`, `plc1-<family>-<code>`. Six-digit codes use fixed integer selection (LCG 1664525/1013904223, fixed name hash, parameter lists and draw order). Changing any released generator behavior requires a new prefix and retention of the old resolver. The old `dc1` implementation is unchanged. URLs contain only public selectors/codes. Existing active work resumes before a new round.

AC has ten families: period, frequency, angle, RMS, peak, instantaneous value, XL, XC, R current, vector sum. Motor has four: force, two-conductor torque, armature current, startup current. SPS theory has two: active-low load and signed distance to the strict limit. Rounds contain 10/4/2 tasks respectively.

`units.ts` separates physical dimensions, SI multipliers and display spellings. It supports s/ms, degrees/radians, H/mH, F/µF/nF, T/mT, N/mN, N·m/mN·m and var/kvar alongside previous units. Angle SI is radians. German decimal commas and compatible prefixes work. W and var, force and torque, or V and A are not interchangeable. Numeric tolerance is visible: new numeric/generated tasks use 0.1%, with ±10⁻⁹ at zero; multi-step fields show individual absolute bounds. Vector placement uses ±0.3 V/±1°; waveform settings use ±0.1 V/±0.1 Hz/±1°. Grading never compares screen pixels.

## Evidence and remaining acceptance

See [verification](VERIFICATION.md) for executed command results. Tests include independent AC/force/torque fixtures, waveform/phase consistency, every rotor degree and both polarity reversals, explicit excitation nets, all 16 PLC rows, invalid graph cases, every structured submission, 128-code sweeps across 16 generated families, pinned generator fixtures, old backups and pending ratings. Real local Worker/D1 tests transfer all four answer kinds and generated prefixes across three databases without duplicate events or invented memory reviews.

Browser evidence covers desktop/mobile, both themes, 320/375/390/430 CSS-pixel widths, keyboard selection, model coordinates after zoom/pan, animation/pause/reduced motion, strict PLC boundaries, existing-session precedence, graded offline resume and offline lab loading. Fourteen new Windows image references cover R/L/C, phasors, motor at 0°/90° and SPS theory. Existing diagram baselines are retained.

Physical iPhone Safari, installed-PWA updates, macOS installation, real OAuth/Cloudflare setup and independent instructor review remain separate manual acceptance. Pages remains local-only. The next milestone should prioritize teacher-reviewed explanations and actual-device acceptance before extending machine dynamics or adding an optional SPS editor.
