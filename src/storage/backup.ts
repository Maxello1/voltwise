import { z } from 'zod'
import {
  attemptSchema,
  completionSchema,
  reviewSchema,
  sessionSchema,
  settingsSchema,
} from '../domain/models'
import { lessons } from '../content/curriculum'
import { resolveExercise } from '../content/exercise-catalogue'
import { db, type VoltwiseDatabase } from './db'
import { diagnosticAnswerSchema, diagnosticDraftSchema } from '../domain/diagnostic-schema'
import { replayDiagnosis } from '../domain/diagnostics'
import { validateApplicationAnswer } from '../domain/application'
import {
  canonicalJson,
  contentHash,
  receiptSchema,
  sessionHistorySchema,
  syncEventSchema,
  validateSyncEvent,
} from '../sync/protocol'
import { describeSession, discoverHistory, rebuildReviewStates } from './sync'

const legacyBackupSchema = z
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
export const backupSchema = z
  .union([
    legacyBackupSchema.extend({
      version: z.literal(3),
      diagnosticDrafts: z.array(diagnosticDraftSchema).max(20000),
      sessionHistory: z.array(sessionHistorySchema).max(20000),
      syncEvents: z.array(syncEventSchema).max(210000),
      syncReceipts: z
        .array(receiptSchema.extend({ ownerId: z.string().regex(/^[1-9]\d*$/) }).strict())
        .max(210000),
    }),
    legacyBackupSchema.extend({
      version: z.literal(2),
      diagnosticDrafts: z.array(diagnosticDraftSchema).max(20000),
    }),
    legacyBackupSchema,
  ])
  .transform((backup) => ({
    ...backup,
    version: 3 as const,
    diagnosticDrafts: 'diagnosticDrafts' in backup ? backup.diagnosticDrafts : [],
    sessionHistory: 'sessionHistory' in backup ? backup.sessionHistory : [],
    syncEvents: 'syncEvents' in backup ? backup.syncEvents : [],
    syncReceipts: 'syncReceipts' in backup ? backup.syncReceipts : [],
  }))
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
      database.diagnosticDrafts,
      database.sessionHistory,
      database.syncEvents,
      database.syncReceipts,
    ],
    async () =>
      backupSchema.parse({
        format: 'voltwise-backup',
        version: 3,
        exportedAt: new Date().toISOString(),
        attempts: await database.attempts.toArray(),
        reviews: await database.reviews.toArray(),
        sessions: await database.sessions.toArray(),
        completions: await database.completions.toArray(),
        settings: await database.settings.get('preferences'),
        diagnosticDrafts: await database.diagnosticDrafts.toArray(),
        sessionHistory: await database.sessionHistory.toArray(),
        syncEvents: await database.syncEvents.toArray(),
        syncReceipts: await database.syncReceipts.toArray(),
      }),
  )
}
export function parseBackup(input: unknown): Backup {
  const backup = backupSchema.parse(input)
  const attempts = new Map(backup.attempts.map((a) => [a.eventId, a]))
  const sessions = new Map(backup.sessions.map((s) => [s.id, s]))
  const histories = new Map(backup.sessionHistory.map((s) => [s.id, s]))
  for (const history of histories.values()) {
    const local = sessions.get(history.id)
    if (
      history.exerciseIds.some((id) => !resolveExercise(id)) ||
      (local && canonicalJson(describeSession(local)) !== canonicalJson(history))
    )
      throw new Error('Ungültige historische Sitzung.')
  }
  if (histories.size !== backup.sessionHistory.length)
    throw new Error('Doppelte historische Sitzungen.')
  if (
    attempts.size !== backup.attempts.length ||
    sessions.size !== backup.sessions.length ||
    new Set(backup.reviews.map((r) => r.eventId)).size !== backup.reviews.length ||
    new Set(backup.reviews.map((r) => r.attemptId)).size !== backup.reviews.length
  )
    throw new Error('Doppelte Ereignisse in der Sicherung.')
  for (const attempt of backup.attempts) {
    const exercise = resolveExercise(attempt.exerciseId)
    if (
      !exercise ||
      exercise.version !== attempt.exerciseVersion ||
      (!sessions.has(attempt.sessionId) && !histories.has(attempt.sessionId)) ||
      attempt.conceptIds.join('|') !== exercise.conceptIds.join('|')
    )
      throw new Error('Unbekannte Aufgabe, Version oder Sitzungsreferenz.')
    if (exercise.type === 'diagnostic') {
      const response = diagnosticAnswerSchema.parse(JSON.parse(attempt.answer))
      replayDiagnosis(exercise.scenarioId, response)
    }
    if (exercise.type === 'application')
      validateApplicationAnswer(exercise.activity, attempt.answer)
  }
  for (const review of backup.reviews) {
    const attempt = attempts.get(review.attemptId)
    if (
      !attempt ||
      attempt.exerciseId !== review.exerciseId ||
      !resolveExercise(review.exerciseId)?.reviewable
    )
      throw new Error('Ungültige Wiederholungsreferenz.')
  }
  const events = new Map(backup.syncEvents.map((e) => [e.eventId, validateSyncEvent(e)]))
  if (
    events.size !== backup.syncEvents.length ||
    new Set(backup.syncReceipts.map((r) => r.eventId)).size !== backup.syncReceipts.length ||
    new Set(backup.syncReceipts.map((r) => r.sequence)).size !== backup.syncReceipts.length ||
    new Set(backup.syncReceipts.map((r) => r.ownerId)).size > 1
  )
    throw new Error('Doppelte oder widersprüchliche Cloud-Metadaten.')
  for (const event of events.values()) {
    if (
      event.kind === 'attempt' &&
      canonicalJson(attempts.get(event.eventId)) !== canonicalJson(event.data)
    )
      throw new Error('Konflikt: Versuch und Cloud-Verlauf widersprechen sich.')
    if (
      event.kind === 'review' &&
      canonicalJson(backup.reviews.find((r) => r.eventId === event.eventId)) !==
        canonicalJson(event.data)
    )
      throw new Error('Wiederholung und Cloud-Verlauf widersprechen sich.')
    if (event.kind === 'attempt') {
      const session = sessions.get(event.session.id)
      const history = session ? describeSession(session) : histories.get(event.session.id)
      if (canonicalJson(history) !== canonicalJson(event.session))
        throw new Error('Historische Sitzungsreferenz fehlt.')
    }
  }
  if (backup.syncReceipts.some((r) => !events.has(r.eventId)))
    throw new Error('Cloud-Bestätigung ohne Ereignis.')
  for (const session of backup.sessions) {
    if (
      session.exerciseIds.some((id) => !resolveExercise(id)) ||
      (session.pendingAttemptId && attempts.get(session.pendingAttemptId)?.sessionId !== session.id)
    )
      throw new Error('Ungültige Sitzungsreferenz.')
    if ((session.status === 'complete') !== (session.position === session.exerciseIds.length))
      throw new Error('Ungültiger Sitzungsabschluss.')
  }
  if (backup.completions.some((c) => !lessons.some((l) => l.id === c.lessonId)))
    throw new Error('Unbekannte Lektion.')
  if (
    new Set(backup.diagnosticDrafts.map((d) => d.sessionId)).size !== backup.diagnosticDrafts.length
  )
    throw new Error('Doppelte Fehlersuchentwürfe.')
  for (const draft of backup.diagnosticDrafts) {
    const exercise = resolveExercise(draft.exerciseId)
    const session = sessions.get(draft.sessionId)
    if (
      !session ||
      !session.exerciseIds.includes(draft.exerciseId) ||
      exercise?.type !== 'diagnostic'
    )
      throw new Error('Ungültiger Fehlersuchentwurf.')
    replayDiagnosis(exercise.scenarioId, draft.answer)
  }
  return backup
}
const equal = (a: unknown, b: unknown) => canonicalJson(a) === canonicalJson(b)
export async function importBackup(input: unknown, database: VoltwiseDatabase = db) {
  const backup = parseBackup(input)
  for (const receipt of backup.syncReceipts)
    if (
      (await contentHash(backup.syncEvents.find((e) => e.eventId === receipt.eventId))) !==
      receipt.hash
    )
      throw new Error('Ungültige Integritätsbestätigung in der Sicherung.')
  await database.transaction(
    'rw',
    [
      database.attempts,
      database.reviews,
      database.sessions,
      database.completions,
      database.settings,
      database.reviewStates,
      database.diagnosticDrafts,
      database.sessionHistory,
      database.syncEvents,
      database.syncReceipts,
      database.syncOutbox,
      database.syncState,
      database.metadata,
    ],
    async () => {
      const state = await database.syncState.get('cloud')
      const ownerId = backup.syncReceipts[0]?.ownerId
      if (ownerId && state?.ownerId && ownerId !== state.ownerId)
        throw new Error('Cloud-Kontokonflikt; Import abgebrochen.')
      if (ownerId && !state?.ownerId) await database.syncState.update('cloud', { ownerId })
      for (const history of backup.sessionHistory) {
        const existing = await database.sessionHistory.get(history.id)
        const local = await database.sessions.get(history.id)
        if (
          (existing && !equal(existing, history)) ||
          (local && !equal(describeSession(local), history))
        )
          throw new Error('Historischer Sitzungskonflikt; Import abgebrochen.')
        if (!existing) await database.sessionHistory.add(history)
      }
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
      // Local investigations take precedence; importing a backup never discards an open draft.
      for (const draft of backup.diagnosticDrafts)
        if (!(await database.diagnosticDrafts.get(draft.sessionId)))
          await database.diagnosticDrafts.add(draft)
      for (const event of backup.syncEvents) {
        const existing = await database.syncEvents.get(event.eventId)
        if (existing && !equal(existing, event))
          throw new Error('Cloud-Ereigniskonflikt; Import abgebrochen.')
        if (!existing) await database.syncEvents.add(event)
      }
      for (const receipt of backup.syncReceipts) {
        const existing = await database.syncReceipts.get(receipt.eventId)
        if (existing && !equal(existing, receipt))
          throw new Error('Cloud-Reihenfolgekonflikt; Import abgebrochen.')
        if (!existing) await database.syncReceipts.add(receipt)
      }
      await database.settings.put(backup.settings)
      await discoverHistory(database)
      await rebuildReviewStates(database)
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
