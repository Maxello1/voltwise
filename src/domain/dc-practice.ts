import type { Exercise } from './models'
import { parallelCircuit, seriesCircuit } from './electrical'

export const dcTemplates = [
  'ohm-current',
  'ohm-resistance',
  'power',
  'series-current',
  'parallel-current',
] as const
export type DcTemplate = (typeof dcTemplates)[number]
export type NumericExercise = Extract<Exercise, { type: 'numeric' }>
export interface DcProblem {
  code: string
  template: DcTemplate
  voltage: number
  resistance: number
  secondResistance: number
  milliamperes: number
  exercise: NumericExercise
}

// This v1 algorithm, parameter order and ID format are an immutable content contract.
// Future changes require a new prefix and retaining this resolver for saved history/backups.
const salts: Record<DcTemplate, number> = {
  'ohm-current': 0x9e3779b9,
  'ohm-resistance': 0x85ebca6b,
  power: 0xc2b2ae35,
  'series-current': 0x27d4eb2f,
  'parallel-current': 0x165667b1,
}
export const validRoundCode = (code: string) => /^\d{6}$/u.test(code)
export const dcNumber = (value: number) =>
  value.toLocaleString('de-DE', { useGrouping: false, maximumFractionDigits: 6 })

export function createDcProblem(template: DcTemplate, code: string): DcProblem {
  if (!validRoundCode(code) || !dcTemplates.includes(template))
    throw new Error('Der Übungscode muss genau sechs Ziffern enthalten.')
  let state = (Number(code) ^ salts[template]) >>> 0
  const pick = (values: readonly number[]) => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return values[Math.floor(((state >>> 0) / 0x100000000) * values.length)]!
  }
  const voltage = pick([6, 9, 12, 18, 24, 30, 36, 48])
  const resistance = pick([100, 150, 220, 330, 470, 680, 1000, 1200])
  const secondResistance = pick([100, 150, 220, 330, 470, 680, 1000, 1200])
  const milliamperes = pick([5, 10, 15, 20, 25, 30, 40, 50])
  const id = `dc1-${template}-${code}`
  const common = { id, version: 1, type: 'numeric' as const, reviewable: false }
  const u = dcNumber(voltage)
  const r1 = dcNumber(resistance)
  const r2 = dcNumber(secondResistance)
  const rounding = 'Runde erst am Ende. Bis zu 0,1 % Abweichung wird akzeptiert.'
  let exercise: NumericExercise
  if (template === 'ohm-current') {
    const answer = voltage / resistance
    exercise = {
      ...common,
      topicId: 'ohm',
      conceptIds: ['ohm-law'],
      difficulty: 1,
      title: `Strom berechnen · ${u} V / ${r1} Ω`,
      prompt: `An einem idealen ohmschen Widerstand von ${r1} Ω liegen ${u} V Gleichspannung. Wie groß ist der Strom?`,
      answer,
      unit: 'A',
      tolerance: answer * 0.001,
      hint: `Nutze I = U / R. ${rounding}`,
      explanation: `I = U / R = ${u} V / ${r1} Ω = ${dcNumber(answer)} A = ${dcNumber(answer * 1000)} mA. Die Rechnung gilt für den angegebenen konstanten ohmschen Widerstand.`,
    }
  } else if (template === 'ohm-resistance') {
    const answer = voltage / (milliamperes / 1000)
    exercise = {
      ...common,
      topicId: 'ohm',
      conceptIds: ['ohm-law', 'units'],
      difficulty: 2,
      title: `Widerstand berechnen · ${u} V / ${milliamperes} mA`,
      prompt: `Bei ${u} V Gleichspannung fließen durch ein ohmsches Bauteil ${milliamperes} mA. Wie groß ist sein Widerstand?`,
      answer,
      unit: 'Ω',
      tolerance: answer * 0.001,
      hint: `Wandle Milliampere in Ampere um, dann R = U / I. ${rounding}`,
      explanation: `${milliamperes} mA = ${dcNumber(milliamperes / 1000)} A. R = ${u} V / ${dcNumber(milliamperes / 1000)} A = ${dcNumber(answer)} Ω. Die Einheit kΩ kann ebenfalls eingegeben werden.`,
    }
  } else if (template === 'power') {
    const answer = voltage * (milliamperes / 1000)
    exercise = {
      ...common,
      topicId: 'ohm',
      conceptIds: ['power', 'units'],
      difficulty: 1,
      title: `Leistung berechnen · ${u} V / ${milliamperes} mA`,
      prompt: `Ein Verbraucher nimmt bei ${u} V Gleichspannung einen Strom von ${milliamperes} mA auf. Wie groß ist seine elektrische Leistung?`,
      answer,
      unit: 'W',
      tolerance: answer * 0.001,
      hint: `Für Gleichstrom gilt P = U · I. Rechne den Strom in Ampere um. ${rounding}`,
      explanation: `P = U · I = ${u} V · ${dcNumber(milliamperes / 1000)} A = ${dcNumber(answer)} W. Mit mA eingesetzt ergäbe sich mW, nicht W.`,
    }
  } else if (template === 'series-current') {
    const result = seriesCircuit(voltage, [resistance, secondResistance])
    exercise = {
      ...common,
      topicId: 'circuits',
      conceptIds: ['series', 'ohm-law'],
      difficulty: 2,
      circuitId: id,
      title: `Strom in Reihe · ${u} V / ${r1} Ω + ${r2} Ω`,
      prompt: `Zwei ideale Widerstände von ${r1} Ω und ${r2} Ω liegen in Reihe an ${u} V Gleichspannung. Welcher Strom fließt durch beide?`,
      answer: result.totalCurrent,
      unit: 'A',
      tolerance: result.totalCurrent * 0.001,
      hint: `Addiere zunächst die Widerstände, dann I = U / Rges. ${rounding}`,
      explanation: `Rges = ${r1} Ω + ${r2} Ω = ${dcNumber(result.equivalentResistance)} Ω. I = ${u} V / ${dcNumber(result.equivalentResistance)} Ω = ${dcNumber(result.totalCurrent)} A. Die Teilspannungen ${dcNumber(result.voltageDrops[0]!)} V und ${dcNumber(result.voltageDrops[1]!)} V ergeben zusammen ${u} V.`,
    }
  } else {
    const result = parallelCircuit(voltage, [resistance, secondResistance])
    exercise = {
      ...common,
      topicId: 'circuits',
      conceptIds: ['parallel', 'ohm-law'],
      difficulty: 2,
      circuitId: id,
      title: `Gesamtstrom parallel · ${u} V / ${r1} Ω und ${r2} Ω`,
      prompt: `${r1} Ω und ${r2} Ω liegen parallel an ${u} V Gleichspannung. Wie groß ist der Gesamtstrom der idealen Schaltung?`,
      answer: result.totalCurrent,
      unit: 'A',
      tolerance: result.totalCurrent * 0.001,
      hint: `Berechne I₁ und I₂ jeweils mit derselben Quellspannung und addiere sie. ${rounding}`,
      explanation: `I₁ = ${u} / ${r1} = ${dcNumber(result.branchCurrents[0]!)} A. I₂ = ${u} / ${r2} = ${dcNumber(result.branchCurrents[1]!)} A. Nach der Knotenregel ist Iges = I₁ + I₂ = ${dcNumber(result.totalCurrent)} A. An beiden Zweigen liegt dieselbe Spannung.`,
    }
  }
  return { code, template, voltage, resistance, secondResistance, milliamperes, exercise }
}

export function resolveDcProblem(id: string): DcProblem | undefined {
  const match = id.match(
    /^dc1-(ohm-current|ohm-resistance|power|series-current|parallel-current)-(\d{6})$/u,
  )
  return match ? createDcProblem(match[1] as DcTemplate, match[2]!) : undefined
}

export function createDcRound(code: string): NumericExercise[] {
  return dcTemplates.map((template) => createDcProblem(template, code).exercise)
}
