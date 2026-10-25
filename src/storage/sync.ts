import type { AttemptEvent, LearningSession, ReviewEvent } from '../domain/models'
import { reconcileReviews } from '../domain/reconciliation'
import {
  canonicalJson,
  validateSyncEvent,
  type SyncEvent,
  type SessionHistory,
} from '../sync/protocol'
import { lessons } from '../content/curriculum'
import { db, type VoltwiseDatabase } from './db'

export function describeSession(session: LearningSession): SessionHistory {
  return {
    id: session.id,
    mode: session.mode,
    exerciseIds: session.exerciseIds,
    startedAt: session.startedAt,
  }
}
export function attemptSyncEvent(attempt: AttemptEvent, session: SessionHistory): SyncEvent {
  return {
    schemaVersion: 1,
    kind: 'attempt',
    eventId: attempt.eventId,
    deviceId: attempt.deviceId,
    createdAt: attempt.createdAt,
    data: attempt,
    session,
  }
}
export function reviewSyncEvent(review: ReviewEvent): SyncEvent {
  return {
    schemaVersion: 1,
    kind: 'review',
    eventId: review.eventId,
    deviceId: review.deviceId,
    createdAt: review.createdAt,
    data: review,
  }
}
/** Call within the same transaction as the learner action. No network or hashing here. */
export async function enqueueEvent(event: SyncEvent, database: VoltwiseDatabase) {
  const existing = await database.syncEvents.get(event.eventId)
  if (existing && canonicalJson(existing) !== canonicalJson(event))
    throw new Error('Konflikt bei unveränderlichem Lernereignis.')
  if (!existing) await database.syncEvents.add(event)
  if (!(await database.syncReceipts.get(event.eventId)))
    await database.syncOutbox.put({
      eventId: event.eventId,
      kind: event.kind,
      createdAt: event.createdAt,
      retries: 0,
    })
}
export async function rebuildReviewStates(database: VoltwiseDatabase) {
  const states = reconcileReviews(
    await database.reviews.toArray(),
    await database.syncReceipts.toArray(),
  )
  await database.reviewStates.clear()
  await database.reviewStates.bulkPut(states)
}
export const syncTables = (database: VoltwiseDatabase) => [
  database.attempts,
  database.reviews,
  database.sessions,
  database.completions,
  database.metadata,
  database.syncEvents,
  database.syncReceipts,
  database.syncOutbox,
  database.sessionHistory,
  database.reviewStates,
  database.syncState,
]

/** Additive backfill for old installations and manual imports. Existing event UUIDs survive. */
export async function discoverHistory(database = db) {
  await database.transaction('rw', syncTables(database), async () => {
    for (const attempt of await database.attempts.toArray()) {
      const localSession = await database.sessions.get(attempt.sessionId)
      const session = localSession
        ? describeSession(localSession)
        : await database.sessionHistory.get(attempt.sessionId)
      if (!session)
        throw new Error('Sitzungsmetadaten fehlen. Bitte die ursprüngliche Sicherung aufbewahren.')
      await enqueueEvent(validateSyncEvent(attemptSyncEvent(attempt, session)), database)
    }
    for (const review of await database.reviews.toArray())
      await enqueueEvent(validateSyncEvent(reviewSyncEvent(review)), database)
    const deviceId = (await database.metadata.get('deviceId'))?.value
    if (!deviceId) throw new Error('Gerätekennung fehlt.')
    const events = await database.syncEvents.where('kind').equals('completion').toArray()
    for (const completion of await database.completions.toArray()) {
      if (
        events.some(
          (e) =>
            e.kind === 'completion' &&
            e.data.lessonId === completion.lessonId &&
            e.createdAt === completion.completedAt,
        )
      )
        continue
      const lesson = lessons.find((l) => l.id === completion.lessonId)
      if (!lesson) throw new Error('Unbekannte Lektionsversion.')
      await enqueueEvent(
        {
          schemaVersion: 1,
          kind: 'completion',
          eventId: crypto.randomUUID(),
          deviceId,
          createdAt: completion.completedAt,
          data: { lessonId: lesson.id, lessonVersion: lesson.version },
        },
        database,
      )
    }
  })
}
export async function completeLesson(lessonId: string, database = db) {
  const lesson = lessons.find((l) => l.id === lessonId)
  if (!lesson) throw new Error('Unbekannte Lektion.')
  await database.transaction('rw', syncTables(database), async () => {
    if (await database.completions.get(lessonId)) return
    const deviceId = (await database.metadata.get('deviceId'))?.value
    if (!deviceId) throw new Error('Gerätekennung fehlt.')
    const createdAt = new Date().toISOString()
    await database.completions.add({ lessonId, completedAt: createdAt })
    await enqueueEvent(
      {
        schemaVersion: 1,
        kind: 'completion',
        eventId: crypto.randomUUID(),
        deviceId,
        createdAt,
        data: { lessonId, lessonVersion: lesson.version },
      },
      database,
    )
  })
}
