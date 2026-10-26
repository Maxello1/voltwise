# Foundation content review — 21 October 2026

The current catalogue contains five German lessons and 46 version-1 exercises. This records the implementation review and automated evidence; it is not approval by an independent electrical instructor. The original foundation review below remains applicable; v0.5 adds one lesson, one NC knowledge fact and nine control applications. Their answer keys, state sequences and terminal references are checked in `tests/unit/control.test.ts`; see [control review scope](CONTROL_CIRCUITS.md).

## Scope and prerequisites

The recommended sequence is quantities/units → Ohm's law and power → series/parallel circuits → measurement and current conservation. Each topic has a readable foundation lesson. All prerequisite references are checked, the graph is acyclic, and a prerequisite must have a lower tier. Topic and concept selection remain available without a lock.

`src/content/validation.ts` checks unique IDs, topic/concept references, required lessons, complete task text, choice-answer references, numeric tolerances, recall aliases and the distinction between reviewable facts and application tasks. Circuit tests separately check real diagram references, selectable answers, nets, terminal positions and the stated ideal assumptions.

## Added references

| Exercise                 | Checked answer and reasoning                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| voltage-unit             | Volt, V; U is the quantity symbol, V its unit.                                                                     |
| current-symbol           | I; A is the unit symbol for ampere.                                                                                |
| resistance-prefix        | 4.7 × 1000 = 4700 Ω.                                                                                               |
| microampere              | 250 / 1000000 = 0.00025 A = 0.25 mA.                                                                               |
| ohm-voltage              | 500 Ω × 0.020 A = 10 V for the stated ohmic load.                                                                  |
| power-unit               | Watt, W; DC power P = U × I, distinct from energy.                                                                 |
| series-current-rule      | Equal current throughout an unbranched stationary path.                                                            |
| parallel-resistance-rule | With two finite positive resistances, reciprocal addition gives an equivalent below the smaller branch resistance. |
| node-outgoing            | (450 − 300) mA = 0.15 A for the two outgoing branches and no charge accumulation.                                  |
| voltmeter-loading        | Infinite ideal input resistance means zero current at finite voltage; real meters may load the circuit.            |

New calculation keys are checked against separately written reference expressions and plausible unit/scale mistakes. Existing series/parallel/divider/lamp/meter cases retain their topology and power-balance checks. The ten additions do not revise any previous exercise ID/version, lesson version, stored event or backup format.

## Recall and selection review

Recall accepts only explicit aliases, normalized formatting, or parenthesized pairs whose two members are both accepted aliases. It rejects contradictory pairs and arbitrary prose rather than guessing. The series-current task lists the supported short German phrasings in its definition.

Recommendations report the last twenty attempts per concept, count hinted answers as assisted and label fewer than three samples as preliminary. Unknown concepts have no score. The 80% selection threshold is a documented heuristic. A multi-concept task contributes to each tagged concept; repetition of one question does not prove transfer. Memory ratings remain separate from correctness and selection.

## Remaining review

Before expanding to AC, protection or real installation work, obtain qualified editorial/pedagogical review and extend reference cases. The present finite DC examples and their ideal meter/lamp assumptions are educational models. Physical iPhone/Mac installation acceptance remains tracked separately in issue 2.

## School expansion review — 26 October 2026

The catalogue now has 21 lessons and 136 curated tasks. The 15 added lessons and 75 tasks cover the supplied AC/motor/SPS scope with original explanatory prose, 15 applied interactions and independent reference checks. There are no source scans in this checkout; provenance maps the detailed supplied specification to source/page ranges. AC and motor models state their assumptions, and all 16 active-low generator states include both rejected 10-kW cases. Secondary protection/cable/hexadecimal topics are deferred. This is implementation and automated reference evidence, with independent instructor review still outstanding. See [content, conventions and primary references](SCHOOL_CURRICULUM.md).
