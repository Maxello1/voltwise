import { resolveExercise } from '../content/exercise-catalogue'
import {
  diagnosticAnswerSchema,
  diagnosticDraftSchema,
  emptyDiagnosticAnswer,
  type DiagnosticAction,
  type DiagnosticAnswer,
} from '../domain/diagnostic-schema'
import { replayDiagnosis } from '../domain/diagnostics'
import { db } from './db'

/** All draft mutations reread the active step transactionally, including concurrent tabs. */
export async function saveDiagnosticDraft(
  sessionId: string,
  exerciseId: string,
  change: DiagnosticAction | Partial<Pick<DiagnosticAnswer, 'location' | 'mechanism' | 'hint'>>,
  database = db,
) {
  return database.transaction('rw', [database.sessions, database.diagnosticDrafts], async () => {
    const session = await database.sessions.get(sessionId)
    const exercise = resolveExercise(exerciseId)
    if (
      !session ||
      session.status !== 'active' ||
      session.pendingAttemptId ||
      session.exerciseIds[session.position] !== exerciseId ||
      exercise?.type !== 'diagnostic'
    )
      throw new Error('Diese Fehlersuche ist nicht mehr der offene Schritt.')
    const previous = await database.diagnosticDrafts.get(sessionId)
    const answer = previous?.exerciseId === exerciseId ? previous.answer : emptyDiagnosticAnswer()
    const next = diagnosticAnswerSchema.parse(
      Array.isArray(change)
        ? { ...answer, actions: [...answer.actions, change] }
        : { ...answer, ...change, hint: answer.hint || ('hint' in change && change.hint) },
    )
    replayDiagnosis(exercise.scenarioId, next)
    const draft = diagnosticDraftSchema.parse({
      sessionId,
      exerciseId,
      version: 1,
      answer: next,
      updatedAt: new Date().toISOString(),
    })
    await database.diagnosticDrafts.put(draft)
    return draft
  })
}
