import { Link } from 'react-router'
import { resolveExercise } from '../content/exercise-catalogue'
import { resolveDcProblem } from '../domain/dc-practice'

export function ExerciseHistoryTitle({ exerciseId }: { exerciseId: string }) {
  const exercise = resolveExercise(exerciseId)
  const generated = resolveDcProblem(exerciseId)
  return generated ? (
    <Link className="history-round-link" to={`/ueben?trainer=dc&code=${generated.code}`}>
      {exercise?.title}
    </Link>
  ) : (
    (exercise?.title ?? 'Aufgabe nicht verfügbar')
  )
}
