import { exerciseById } from './curriculum'
import { resolveDcProblem } from '../domain/dc-practice'

/** Resolve immutable curated content or a versioned generated exercise from its stored ID. */
export function resolveExercise(id: string) {
  return exerciseById.get(id) ?? resolveDcProblem(id)?.exercise
}
