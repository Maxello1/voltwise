import type { Exercise, Grade, Unit } from './models'

const units: Record<string, { dimension: Unit; factor: number }> = {
  A: { dimension: 'A', factor: 1 },
  mA: { dimension: 'A', factor: 0.001 },
  µA: { dimension: 'A', factor: 0.000001 },
  uA: { dimension: 'A', factor: 0.000001 },
  V: { dimension: 'V', factor: 1 },
  mV: { dimension: 'V', factor: 0.001 },
  kV: { dimension: 'V', factor: 1000 },
  Ω: { dimension: 'Ω', factor: 1 },
  Ohm: { dimension: 'Ω', factor: 1 },
  ohm: { dimension: 'Ω', factor: 1 },
  kΩ: { dimension: 'Ω', factor: 1000 },
  kOhm: { dimension: 'Ω', factor: 1000 },
  MΩ: { dimension: 'Ω', factor: 1e6 },
  W: { dimension: 'W', factor: 1 },
  mW: { dimension: 'W', factor: 0.001 },
  kW: { dimension: 'W', factor: 1000 },
  Hz: { dimension: 'Hz', factor: 1 },
  kHz: { dimension: 'Hz', factor: 1000 },
}
export const normalizeRecall = (value: string) =>
  value
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('de')
    .replace(/[.!?]+$/u, '')
    .trim()
    .replace(/\s+/gu, ' ')

function matchesRecall(aliases: string[], answer: string): boolean {
  const accepted = new Set(aliases.map(normalizeRecall))
  const normalized = normalizeRecall(answer)
  if (accepted.has(normalized)) return true
  // Accept a consistent word/symbol pair such as Ohm (Ω), only if both are declared aliases.
  const pair = normalized.match(/^([^()]+)\s*\(([^()]+)\)$/u)
  return !!pair && accepted.has(pair[1]!.trim()) && accepted.has(pair[2]!.trim())
}

export function parseQuantity(
  input: string,
  expectedUnit: Unit,
): { value: number; error?: undefined } | { value?: undefined; error: string } {
  // A single decimal separator is intentional: thousands notation is ambiguous and rejected.
  const match = input
    .trim()
    .match(/^([+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)(?:[eE][+-]?\d+)?)\s*([a-zA-ZΩµμ]+)?$/u)
  if (!match)
    return {
      error: `Bitte eine Zahl eingeben, z. B. 0,36 ${expectedUnit}. Keine Tausendertrennzeichen.`,
    }
  const amount = Number(match[1]?.replace(',', '.'))
  const enteredUnit = (match[2] ?? expectedUnit).replace('μ', 'µ')
  const unit = units[enteredUnit]
  if (!unit || unit.dimension !== expectedUnit)
    return {
      error: `Die Einheit muss zu ${expectedUnit} passen. Groß- und Kleinschreibung beachten.`,
    }
  const value = amount * unit.factor
  if (!Number.isFinite(value)) return { error: 'Bitte eine endliche Zahl eingeben.' }
  return { value }
}

export function gradeExercise(exercise: Exercise, answer: string): Grade {
  if (exercise.type === 'numeric') {
    const parsed = parseQuantity(answer, exercise.unit)
    if (parsed.value === undefined)
      return { correct: false, normalizedAnswer: '', invalid: parsed.error }
    return {
      correct:
        Math.abs(parsed.value - exercise.answer) <=
        exercise.tolerance + Number.EPSILON * Math.abs(exercise.answer),
      normalizedAnswer: `${parsed.value} ${exercise.unit}`,
    }
  }
  if (!normalizeRecall(answer))
    return { correct: false, normalizedAnswer: '', invalid: 'Gib zuerst eine Antwort ein.' }
  const correct =
    exercise.type === 'recall'
      ? matchesRecall(exercise.aliases, answer)
      : answer === exercise.answer
  return { correct, normalizedAnswer: normalizeRecall(answer) }
}

export function answerLabel(exercise: Exercise): string {
  if (exercise.type === 'numeric')
    return `${exercise.answer.toLocaleString('de-DE', { useGrouping: false, maximumSignificantDigits: 8 })} ${exercise.unit}`
  if (exercise.type === 'choice')
    return exercise.options.find((option) => option.id === exercise.answer)?.text ?? ''
  return exercise.answerLabel
}
