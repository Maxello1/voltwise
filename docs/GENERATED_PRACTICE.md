# Reproducible DC calculation rounds

The trainer provides five numeric templates alongside the 36 curated foundation exercises. It uses explicit ideal DC assumptions and the existing analytical series/parallel routines. It does not infer or solve arbitrary networks.

## User flow

Open Üben → Rechentrainer öffnen. Choose new numbers, enter a six-digit exercise code, or open a shared `#/ueben?trainer=dc&code=000000` link. The preview lists the givens without revealing answers. A round starts only when requested, and a pending earlier session always resumes first.

Round links contain only the public template selector and code. They transfer no answers, device IDs or learning history. JSON backup import transfers learning records. Calculation history links reopen the same round; answers, hints and durations count as real attempts in concept practice, with no memory cards or invented FSRS intervals.

## Checked templates

| Template         | Equation        | Round 000000 reference              |
| ---------------- | --------------- | ----------------------------------- |
| Ohm current      | I = U/R         | 12 V / 1200 Ω = 0.01 A              |
| Ohm resistance   | R = U/I         | 18 V / 20 mA = 900 Ω                |
| DC power         | P = U × I       | 18 V × 5 mA = 0.09 W                |
| Series current   | I = U/(R1 + R2) | 48 V / (330 Ω + 150 Ω) = 0.1 A      |
| Parallel current | I = U/R1 + U/R2 | 24 V / 150 Ω + 24 V / 100 Ω = 0.4 A |

Source voltages are selected from 6–48 V, resistor values from 100–1200 Ω and stated single-load currents from 5–50 mA. All denominators are positive. These are mathematical teaching models, with no hardware power-rating or installation suitability claim.

The numerical tolerance is 0.1% of the positive base-unit answer. Decimal comma/dot and compatible SI prefixes use the common grader. Learners should round only at the end. Worked values display up to six decimals; the final answer label uses eight significant digits without thousands separators, so copying the shown solution back into the input remains valid.

The series and parallel diagrams clone the original verified geometry and topology. Source voltage, component properties, visible labels, voltage annotations and expected current/resistance/power are rebuilt from the same parameters as the question. Shared library objects are never mutated. The previews remain static teaching diagrams rather than dynamic circuit simulations.

## Immutable content contract

`src/domain/dc-practice.ts` defines the v1 xorshift32 selection, fixed per-template salts, parameter-array order and round-template order. Every code is exactly six ASCII digits, including leading zeroes. The code chooses repeatable parameters; different codes may produce some identical values.

Persisted IDs have the form `dc1-<known-template>-<six-digit-code>`, with exercise version 1. The complete task can be reconstructed from this ID without a server or generated values in a user table. No date, device randomness or platform-dependent sort order participates in reconstruction. The UI uses randomness only when choosing a new code.

Once released, changing an equation, parameter array, salt, algorithm, ordering or grading tolerance requires a new generator prefix/version. Keep the `dc1` resolver available for existing sessions, attempts and backups. Pinned reference rounds and independent math checks protect this contract. Unknown prefixes, templates, malformed codes, forged concept tags and unsupported exercise versions are rejected by the backup validator.

## Persistence and compatibility

Generated rounds use the existing practice session and attempt records. No Dexie table, index, stored field or backup field was added; database schema 1 and JSON backup format 1 remain unchanged. Attempts keep the generated exercise ID/version, original and normalized answer, concept tags, hint use and duration. Explicit fact ratings remain separate.

The current app imports older version-1 curated backups and generated-round backups. An older app that predates these templates cannot recognize the new IDs; matching JSON format numbers do not promise forward content compatibility. `tests/fixtures/backup-v1-pending-0.3.json` is synthetic test data in the preceding release's format, not a user's export. Its restoration test preserves the pending fact answer, settings, lesson completion and original events, then rates it with the restoring device identity. This is a compatibility drill, not a numbered database migration.

## Evidence

- Reference rounds 000000 and 123456 pin the released task values and IDs.
- A deterministic 512-code sweep checks independent equations, parameter bounds, positive finite solutions, accepted rounding, visible-answer roundtrips and rejected scale/unit mistakes.
- Diagram tests check net/terminal integrity, source/load labels, matching answers, power balance and unchanged shared templates.
- Storage tests cover concurrent startup, pending-answer reload, complete rounds, additive/idempotent fresh-device restore and malformed/version-forged backups.
- Browser cases cover code controls, both themes, preserved older sessions, the canonical copied link, full offline rounds, generated diagrams, history links and offline JSON restoration in an isolated browser profile. Clipboard writing is stubbed only in the link-content test; native clipboard permissions remain a browser-dependent behavior with a visible fallback.

## Additive school calculation contracts — v0.8

The five dc1 templates and their released algorithms remain unchanged. The new independent ac1/motor1/plc1 prefixes add 10/4/2 families respectively. Fixed integer selection, immutable parameter lists and pinned reference IDs preserve reproducibility. Rounds have 10/4/2 tasks and share only area/code. Independent 128-code sweeps check every family and visible answer roundtrips; fresh-device restore and real D1 convergence cover all prefixes. New quantities retain physical dimensions, with visible 0.1% tolerance and a 1e-9 bound at zero. See [families, units and compatibility](SCHOOL_CURRICULUM.md).
