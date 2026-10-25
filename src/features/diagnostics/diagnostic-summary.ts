import type { AttemptEvent } from '../../domain/models'
import { resolveExercise } from '../../content/exercise-catalogue'

export const difficultyNames = ['Geführt', 'Eigenständig', 'Herausforderung'] as const
export function diagnosticCoverage(data: { attempts: AttemptEvent[] }) {
  return new Set(
    data.attempts
      .filter((a) => a.correct && !a.hints)
      .flatMap((a) => {
        const e = resolveExercise(a.exerciseId)
        return e?.type === 'diagnostic' ? [e.scenarioId] : []
      }),
  )
}
