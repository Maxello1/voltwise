import type { Exercise, Grade } from './models'
import { gradeDiagnostic } from './diagnostics'
import { diagnosticScenario } from '../content/diagnostic-scenarios'

import { parseQuantity } from './units'
export { parseQuantity } from './units'
import { gradeApplication, applicationSolution } from './application'

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

export function gradeExercise(exercise: Exercise, answer: string): Grade {
  if (exercise.type === 'application') return gradeApplication(exercise.activity, answer)
  if (exercise.type === 'diagnostic')
    return gradeDiagnostic(exercise.scenarioId, exercise.difficulty, answer)
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
  if (exercise.type === 'application') return applicationSolution(exercise.activity)
  if (exercise.type === 'diagnostic') return diagnosticScenario(exercise.scenarioId).explanation
  if (exercise.type === 'numeric')
    return `${exercise.answer.toLocaleString('de-DE', { useGrouping: false, maximumSignificantDigits: 8 })} ${exercise.unit}`
  if (exercise.type === 'choice')
    return exercise.options.find((option) => option.id === exercise.answer)?.text ?? ''
  return exercise.answerLabel
}
