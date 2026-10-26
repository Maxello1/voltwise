import { z } from 'zod'
import { attemptSchema, reviewSchema } from '../domain/models'
import { resolveExercise } from '../content/exercise-catalogue'
import { lessons } from '../content/curriculum'
import { diagnosticAnswerSchema } from '../domain/diagnostic-schema'
import { replayDiagnosis } from '../domain/diagnostics'
import { validateApplicationAnswer } from '../domain/application'

export const protocolVersion = 1
export const batchSize = 20
export const maxRequestBytes = 256 * 1024
export const maxEventBytes = 16 * 1024
export const sessionHistorySchema = z
  .object({
    id: z.uuid(),
    mode: z.enum(['practice', 'review', 'schematic']),
    exerciseIds: z.array(z.string().max(100)).min(1).max(100),
    startedAt: z.iso.datetime(),
  })
  .strict()
export type SessionHistory = z.infer<typeof sessionHistorySchema>
const base = {
  schemaVersion: z.literal(1),
  eventId: z.uuid(),
  deviceId: z.uuid(),
  createdAt: z.iso.datetime(),
}
export const syncEventSchema = z.discriminatedUnion('kind', [
  z
    .object({
      ...base,
      kind: z.literal('attempt'),
      data: attemptSchema,
      session: sessionHistorySchema,
    })
    .strict(),
  z.object({ ...base, kind: z.literal('review'), data: reviewSchema }).strict(),
  z
    .object({
      ...base,
      kind: z.literal('completion'),
      data: z
        .object({
          lessonId: z.string().max(100),
          lessonVersion: z.number().int().positive(),
        })
        .strict(),
    })
    .strict(),
])
export type SyncEvent = z.infer<typeof syncEventSchema>
export const receiptSchema = z
  .object({
    eventId: z.uuid(),
    sequence: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    hash: z.string().regex(/^[a-f0-9]{64}$/),
    receivedAt: z.iso.datetime(),
  })
  .strict()
export type Receipt = z.infer<typeof receiptSchema>
export const storedEventSchema = receiptSchema.extend({ event: syncEventSchema }).strict()
export type StoredEvent = z.infer<typeof storedEventSchema>
export const uploadSchema = z
  .object({ protocol: z.literal(1), events: z.array(syncEventSchema).min(1).max(batchSize) })
  .strict()
export const uploadResponseSchema = z
  .object({ protocol: z.literal(1), receipts: z.array(receiptSchema).min(1).max(batchSize) })
  .strict()
export const downloadResponseSchema = z
  .object({
    protocol: z.literal(1),
    events: z.array(storedEventSchema).max(batchSize),
    cursor: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    hasMore: z.boolean(),
  })
  .strict()

/** JSON key order cannot create conflicts. Array order and all values are significant. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  return `{${Object.entries(value)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`)
    .join(',')}}`
}
export async function contentHash(value: unknown) {
  const bytes = new TextEncoder().encode(canonicalJson(value))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((v) => v.toString(16).padStart(2, '0')).join('')
}
export function validateSyncEvent(input: unknown): SyncEvent {
  const event = syncEventSchema.parse(input)
  if (new TextEncoder().encode(canonicalJson(event)).byteLength > maxEventBytes)
    throw new Error('Ereignis zu groß.')
  if (event.kind === 'completion') {
    if (
      !lessons.some((l) => l.id === event.data.lessonId && l.version === event.data.lessonVersion)
    )
      throw new Error('Nicht unterstützte Lektionsversion.')
  } else {
    if (
      event.eventId !== event.data.eventId ||
      event.deviceId !== event.data.deviceId ||
      event.createdAt !== event.data.createdAt
    )
      throw new Error('Widersprüchliche Ereigniskennung.')
    const exercise = resolveExercise(event.data.exerciseId)
    if (!exercise) throw new Error('Nicht unterstützte Aufgabe.')
    if (event.kind === 'attempt') {
      if (
        exercise.version !== event.data.exerciseVersion ||
        canonicalJson(exercise.conceptIds) !== canonicalJson(event.data.conceptIds) ||
        event.session.id !== event.data.sessionId ||
        !event.session.exerciseIds.includes(exercise.id) ||
        event.session.exerciseIds.some((id) => !resolveExercise(id))
      )
        throw new Error('Nicht unterstützte Aufgaben- oder Sitzungsreferenz.')
      if (exercise.type === 'diagnostic')
        replayDiagnosis(
          exercise.scenarioId,
          diagnosticAnswerSchema.parse(JSON.parse(event.data.answer)),
        )
      if (exercise.type === 'application')
        validateApplicationAnswer(exercise.activity, event.data.answer)
    } else if (!exercise.reviewable) throw new Error('Diese Aufgabe verwendet keinen Lernplan.')
  }
  return event
}
