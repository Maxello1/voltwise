import { concepts, exercises, lessons, topics } from '../content/curriculum'
import { resolveExercise } from '../content/exercise-catalogue'
import { createDcRound } from '../domain/dc-practice'
import { gradeExercise } from '../domain/grading'
import { planPractice } from '../domain/practice-plan'
import { scheduleReview } from '../domain/review'
import type { Exercise, LearningSession, ReviewEvent } from '../domain/models'
import { db, initializeDatabase, type VoltwiseDatabase } from './db'

export async function startSession(
  mode: LearningSession['mode'] = 'practice',
  topicId?: string,
  database = db,
  circuitId?: string,
  conceptId?: string,
  calculationCode?: string,
): Promise<LearningSession | undefined> {
  await initializeDatabase(database)
  return database.transaction(
    'rw',
    [database.sessions, database.reviewStates, database.attempts, database.completions],
    async () => {
      // One resumable session avoids accidentally discarding an unanswered or unrated step.
      const active = await database.sessions.where('status').equals('active').first()
      if (active) return active
      const now = new Date()
      const states = await database.reviewStates.toArray()
      const attempts = await database.attempts.orderBy('createdAt').toArray()
      const candidates = exercises.filter((e) => !topicId || e.topicId === topicId)
      let selected: Exercise[]
      if (calculationCode !== undefined) {
        if (mode !== 'practice') throw new Error('Eine Rechenrunde verwendet den Übungsmodus.')
        selected = createDcRound(calculationCode)
      } else if (mode === 'review') {
        selected = candidates
          .filter(
            (e) =>
              e.reviewable &&
              states.some((state) => state.exerciseId === e.id && new Date(state.card.due) <= now),
          )
          .sort((a, b) =>
            states
              .find((state) => state.exerciseId === a.id)!
              .card.due.localeCompare(states.find((state) => state.exerciseId === b.id)!.card.due),
          )
      } else if (mode === 'schematic')
        selected = candidates.filter(
          (e) => !!e.circuitId && (!circuitId || e.circuitId === circuitId),
        )
      else {
        selected = planPractice({
          exercises,
          concepts,
          topics,
          lessons,
          attempts,
          reviewStates: states,
          completions: await database.completions.toArray(),
          now,
          topicId,
          conceptId,
        }).map((item) => item.exercise)
      }
      if (!selected.length) return undefined
      const session: LearningSession = {
        id: crypto.randomUUID(),
        mode,
        exerciseIds: selected.slice(0, mode === 'schematic' && !circuitId ? 2 : 5).map((e) => e.id),
        position: 0,
        status: 'active',
        startedAt: now.toISOString(),
      }
      await database.sessions.add(session)
      return session
    },
  )
}

export async function submitAnswer(
  sessionId: string,
  answer: string,
  hints: boolean,
  durationMs: number,
  database = db,
  expectedExerciseId?: string,
) {
  return database.transaction(
    'rw',
    [database.attempts, database.sessions, database.metadata],
    async () => {
      const session = await database.sessions.get(sessionId)
      if (!session || session.status !== 'active') throw new Error('Die Sitzung ist nicht aktiv.')
      if (expectedExerciseId && session.exerciseIds[session.position] !== expectedExerciseId)
        throw new Error(
          'Die Sitzung wurde in einem anderen Fenster fortgesetzt. Bitte die aktuelle Aufgabe prüfen.',
        )
      if (session.pendingAttemptId) return database.attempts.get(session.pendingAttemptId)
      const exercise = resolveExercise(session.exerciseIds[session.position] ?? '')
      if (!exercise) throw new Error('Aufgabe nicht gefunden.')
      const grade = gradeExercise(exercise, answer)
      if (grade.invalid) throw new Error(grade.invalid)
      const deviceId = (await database.metadata.get('deviceId'))?.value
      if (!deviceId) throw new Error('Gerätekennung fehlt.')
      const attempt = {
        eventId: crypto.randomUUID(),
        deviceId,
        sessionId,
        exerciseId: exercise.id,
        exerciseVersion: exercise.version,
        createdAt: new Date().toISOString(),
        conceptIds: exercise.conceptIds,
        correct: grade.correct,
        answer,
        normalizedAnswer: grade.normalizedAnswer,
        hints: hints ? 1 : 0,
        durationMs: Math.max(0, Math.round(durationMs)),
      }
      await database.attempts.add(attempt)
      await database.sessions.update(sessionId, { pendingAttemptId: attempt.eventId })
      return attempt
    },
  )
}

export async function advanceSession(
  sessionId: string,
  rating?: number,
  database: VoltwiseDatabase = db,
  expectedAttemptId?: string,
) {
  return database.transaction(
    'rw',
    [
      database.sessions,
      database.attempts,
      database.reviews,
      database.reviewStates,
      database.metadata,
    ],
    async () => {
      const session = await database.sessions.get(sessionId)
      if (!session || !session.pendingAttemptId || session.status !== 'active') return
      if (expectedAttemptId && session.pendingAttemptId !== expectedAttemptId)
        throw new Error(
          'Diese Antwort wurde in einem anderen Fenster bereits fortgesetzt. Bitte den aktuellen Stand prüfen.',
        )
      const attempt = await database.attempts.get(session.pendingAttemptId)
      if (!attempt) throw new Error('Versuch nicht gefunden.')
      const exercise = resolveExercise(attempt.exerciseId)
      if (exercise?.reviewable) {
        if (!rating) throw new Error('Bitte bewerte, wie gut du dich erinnert hast.')
        const previous = await database.reviewStates.get(exercise.id)
        const deviceId = (await database.metadata.get('deviceId'))?.value
        if (!deviceId) throw new Error('Gerätekennung fehlt.')
        const now = new Date()
        const scheduled = scheduleReview(previous?.card, rating, now)
        const event: ReviewEvent = {
          eventId: crypto.randomUUID(),
          attemptId: attempt.eventId,
          deviceId,
          exerciseId: exercise.id,
          createdAt: now.toISOString(),
          rating,
          schedulerVersion: 'ts-fsrs@5.4.2',
          retention: 0.9,
          cardBefore: scheduled.before,
          cardAfter: scheduled.after,
          log: scheduled.log,
        }
        await database.reviews.add(event)
        await database.reviewStates.put({
          exerciseId: exercise.id,
          lastEventId: event.eventId,
          card: scheduled.after,
        })
      }
      const position = session.position + 1
      const complete = position === session.exerciseIds.length
      const updated = {
        ...session,
        position,
        status: complete ? ('complete' as const) : ('active' as const),
        pendingAttemptId: undefined,
        completedAt: complete ? new Date().toISOString() : undefined,
      }
      await database.sessions.put(updated)
    },
  )
}
