import { z } from 'zod'
import {
  attemptSchema,
  completionSchema,
  reviewSchema,
  sessionSchema,
  settingsSchema,
} from '../domain/models'
import { exerciseById, lessons } from '../content/curriculum'
import { db, type VoltwiseDatabase } from './db'

export const backupSchema = z
  .object({
    format: z.literal('voltwise-backup'),
    version: z.literal(1),
    exportedAt: z.iso.datetime(),
    attempts: z.array(attemptSchema).max(100000),
    reviews: z.array(reviewSchema).max(100000),
    sessions: z.array(sessionSchema).max(20000),
    completions: z.array(completionSchema).max(10000),
    settings: settingsSchema,
  })
  .strict()
export type Backup = z.infer<typeof backupSchema>
export async function exportBackup(database = db): Promise<Backup> {
  return database.transaction(
    'r',
    [
      database.attempts,
      database.reviews,
      database.sessions,
      database.completions,
      database.settings,
    ],
    async () =>
      backupSchema.parse({
        format: 'voltwise-backup',
        version: 1,
        exportedAt: new Date().toISOString(),
        attempts: await database.attempts.toArray(),
        reviews: await database.reviews.toArray(),
        sessions: await database.sessions.toArray(),
        completions: await database.completions.toArray(),
        settings: await database.settings.get('preferences'),
      }),
  )
}
export function parseBackup(input: unknown): Backup {
  const backup = backupSchema.parse(input)
  const attempts = new Map(backup.attempts.map((a) => [a.eventId, a]))
  const sessions = new Map(backup.sessions.map((s) => [s.id, s]))
  if (
    attempts.size !== backup.attempts.length ||
    sessions.size !== backup.sessions.length ||
    new Set(backup.reviews.map((r) => r.eventId)).size !== backup.reviews.length ||
    new Set(backup.reviews.map((r) => r.attemptId)).size !== backup.reviews.length
  )
    throw new Error('Doppelte Ereignisse in der Sicherung.')
  for (const attempt of backup.attempts) {
    const exercise = exerciseById.get(attempt.exerciseId)
    if (
      !exercise ||
      exercise.version !== attempt.exerciseVersion ||
      !sessions.has(attempt.sessionId) ||
      attempt.conceptIds.join('|') !== exercise.conceptIds.join('|')
    )
      throw new Error('Unbekannte Aufgabe, Version oder Sitzungsreferenz.')
  }
  for (const review of backup.reviews) {
    const attempt = attempts.get(review.attemptId)
    if (
      !attempt ||
      attempt.exerciseId !== review.exerciseId ||
      !exerciseById.get(review.exerciseId)?.reviewable
    )
      throw new Error('Ungültige Wiederholungsreferenz.')
  }
  for (const session of backup.sessions) {
    if (
      session.exerciseIds.some((id) => !exerciseById.has(id)) ||
      (session.pendingAttemptId && attempts.get(session.pendingAttemptId)?.sessionId !== session.id)
    )
      throw new Error('Ungültige Sitzungsreferenz.')
    if ((session.status === 'complete') !== (session.position === session.exerciseIds.length))
      throw new Error('Ungültiger Sitzungsabschluss.')
  }
  if (backup.completions.some((c) => !lessons.some((l) => l.id === c.lessonId)))
    throw new Error('Unbekannte Lektion.')
  return backup
}
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
export async function importBackup(input: unknown, database: VoltwiseDatabase = db) {
  const backup = parseBackup(input)
  await database.transaction(
    'rw',
    [
      database.attempts,
      database.reviews,
      database.sessions,
      database.completions,
      database.settings,
      database.reviewStates,
    ],
    async () => {
      for (const attempt of backup.attempts) {
        const existing = await database.attempts.get(attempt.eventId)
        if (existing && !equal(existing, attempt))
          throw new Error('Konflikt bei unveränderlichem Versuch; Import abgebrochen.')
        if (!existing) await database.attempts.add(attempt)
      }
      for (const review of backup.reviews) {
        const existing = await database.reviews.get(review.eventId)
        if (existing && !equal(existing, review))
          throw new Error('Konflikt bei unveränderlicher Wiederholung; Import abgebrochen.')
        const sameAttempt = await database.reviews
          .where('attemptId')
          .equals(review.attemptId)
          .first()
        if (sameAttempt && sameAttempt.eventId !== review.eventId)
          throw new Error('Bewertungskonflikt; Import abgebrochen.')
        if (!existing) await database.reviews.add(review)
      }
      const active = await database.sessions.where('status').equals('active').first()
      for (const session of backup.sessions) {
        const existing = await database.sessions.get(session.id)
        // Keep the most advanced local/imported position. Multiple imported active sessions are retained but resumed one at a time.
        if (
          !existing ||
          session.position > existing.position ||
          (session.position === existing.position &&
            !existing.pendingAttemptId &&
            session.pendingAttemptId)
        )
          await database.sessions.put(session)
      }
      if (active && !(await database.sessions.get(active.id)))
        throw new Error('Aktive Sitzung fehlt.')
      for (const completion of backup.completions)
        if (!(await database.completions.get(completion.lessonId)))
          await database.completions.add(completion)
      await database.settings.put(backup.settings)
      // Review aggregates are rebuilt from the newest immutable event, never imported as counters.
      const reviews = await database.reviews.toArray()
      const latest = new Map<string, (typeof reviews)[number]>()
      for (const review of reviews.sort(
        (a, b) => a.createdAt.localeCompare(b.createdAt) || a.eventId.localeCompare(b.eventId),
      ))
        latest.set(review.exerciseId, review)
      await database.reviewStates.clear()
      await database.reviewStates.bulkPut(
        [...latest.values()].map((review) => ({
          exerciseId: review.exerciseId,
          lastEventId: review.eventId,
          card: review.cardAfter,
        })),
      )
    },
  )
  return { attempts: backup.attempts.length, reviews: backup.reviews.length }
}
export function downloadFile(name: string, content: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
