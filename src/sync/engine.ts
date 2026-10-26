import { z } from 'zod'
import type { CloudSession } from './types'
import {
  batchSize,
  maxRequestBytes,
  canonicalJson,
  contentHash,
  downloadResponseSchema,
  receiptSchema,
  uploadResponseSchema,
  validateSyncEvent,
  type SyncEvent,
  type StoredEvent,
  type Receipt,
} from './protocol'
import { db, type VoltwiseDatabase } from '../storage/db'
import { describeSession, discoverHistory, rebuildReviewStates, syncTables } from '../storage/sync'

export class SyncError extends Error {
  constructor(
    message: string,
    public blocked = false,
    public loginRequired = false,
  ) {
    super(message)
  }
}
export interface SyncTransport {
  session(): Promise<CloudSession>
  upload(events: SyncEvent[], csrf: string): Promise<Receipt[]>
  download(cursor: number): Promise<z.infer<typeof downloadResponseSchema>>
}
const cloudSessionSchema = z
  .object({
    authenticated: z.boolean(),
    ownerId: z
      .string()
      .regex(/^[1-9]\d*$/)
      .optional(),
    deviceId: z.uuid().optional(),
    csrf: z.string().min(32).optional(),
    expiresAt: z.iso.datetime().optional(),
  })
  .strict()

export async function apiRequest(path: string, options?: RequestInit) {
  const response = await fetch(`/api/${path}`, {
    ...options,
    credentials: 'same-origin',
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(20_000),
  })
  if (!response.ok) {
    if (response.status === 401)
      throw new SyncError(
        'Bitte erneut mit GitHub anmelden. Lokale Änderungen bleiben gespeichert.',
        false,
        true,
      )
    if (response.status === 409)
      throw new SyncError(
        'Ereigniskonflikt: Ein gespeicherter Datensatz hat abweichende Inhalte. Bitte Sicherung exportieren und den Konflikt prüfen.',
        true,
      )
    if ([400, 413, 415].includes(response.status))
      throw new SyncError(
        'Inhalt oder Synchronisierungsversion wird nicht unterstützt. Bitte App aktualisieren und Sicherung aufbewahren.',
        true,
      )
    if (response.status === 403)
      throw new SyncError(
        'Zugriff abgelehnt. Anmeldung, Gerätefreigabe und Ursprung prüfen.',
        false,
        true,
      )
    throw new SyncError(
      'Cloud vorübergehend nicht erreichbar oder Kontingent erschöpft. Lokale Änderungen bleiben gespeichert.',
    )
  }
  return response
}
export const httpTransport: SyncTransport = {
  async session() {
    return cloudSessionSchema.parse(await (await apiRequest('auth/session')).json())
  },
  async upload(events, csrf) {
    return uploadResponseSchema.parse(
      await (
        await apiRequest('v1/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
          body: JSON.stringify({ protocol: 1, events }),
        })
      ).json(),
    ).receipts
  },
  async download(cursor) {
    return downloadResponseSchema.parse(
      await (await apiRequest(`v1/events?protocol=1&cursor=${cursor}`)).json(),
    )
  },
}
export async function enableSync(ownerId: string, database = db) {
  // Complete discovery before consent takes effect. Storage errors cannot create a partial opt-in.
  await discoverHistory(database)
  await database.transaction('rw', database.syncState, async () => {
    const state = await database.syncState.get('cloud')
    if (state?.ownerId && state.ownerId !== ownerId)
      throw new SyncError('Die lokale Cloud-Verknüpfung gehört zu einem anderen Konto.', true)
    await database.syncState.put({
      ...state,
      id: 'cloud',
      enabled: true,
      ownerId,
      cursor: state?.cursor ?? 0,
      blocked: false,
      error: undefined,
    })
  })
}
export async function disableSync(database = db) {
  await database.syncState.update('cloud', { enabled: false, error: undefined, blocked: false })
}
async function recordReceipt(receipt: Receipt, ownerId: string, database: VoltwiseDatabase) {
  const existing = await database.syncReceipts.get(receipt.eventId)
  if (existing && canonicalJson(existing) !== canonicalJson({ ...receipt, ownerId }))
    throw new SyncError(
      'Widersprüchliche Serverbestätigung. Alle Lernereignisse bleiben erhalten.',
      true,
    )
  await database.syncReceipts.put({ ...receipt, ownerId })
  await database.syncOutbox.delete(receipt.eventId)
}
async function applyPage(
  records: StoredEvent[],
  cursor: number,
  ownerId: string,
  database: VoltwiseDatabase,
) {
  // Hash work completes before opening IndexedDB's short atomic transaction.
  for (const record of records) {
    validateSyncEvent(record.event)
    if (
      record.eventId !== record.event.eventId ||
      (await contentHash(record.event)) !== record.hash
    )
      throw new SyncError(
        'Integritätsprüfung fehlgeschlagen. Der Abruf wird unverändert wiederholt.',
        true,
      )
  }
  await database.transaction('rw', syncTables(database), async () => {
    for (const record of records) {
      const event = record.event
      const existing = await database.syncEvents.get(event.eventId)
      if (existing && canonicalJson(existing) !== canonicalJson(event))
        throw new SyncError(
          'Lokaler Ereigniskonflikt. Beide Datenquellen bleiben unverändert.',
          true,
        )
      if (event.kind === 'attempt') {
        const local = await database.sessions.get(event.session.id)
        const history = local
          ? describeSession(local)
          : await database.sessionHistory.get(event.session.id)
        if (history && canonicalJson(history) !== canonicalJson(event.session))
          throw new SyncError('Sitzungsmetadaten widersprechen sich.', true)
        if (!history) await database.sessionHistory.add(event.session)
        const attempt = await database.attempts.get(event.eventId)
        if (attempt && canonicalJson(attempt) !== canonicalJson(event.data))
          throw new SyncError('Versuchskonflikt.', true)
        if (!attempt) await database.attempts.add(event.data)
      } else if (event.kind === 'review') {
        const attempt = await database.attempts.get(event.data.attemptId)
        if (!attempt || attempt.exerciseId !== event.data.exerciseId)
          throw new SyncError(
            'Die Wiederholungsreferenz fehlt. Der Abruf bleibt wiederholbar.',
            true,
          )
        const previous = await database.reviews
          .where('attemptId')
          .equals(event.data.attemptId)
          .first()
        if (previous && canonicalJson(previous) !== canonicalJson(event.data))
          throw new SyncError('Bewertungskonflikt.', true)
        if (!previous) await database.reviews.add(event.data)
      } else {
        const previous = await database.completions.get(event.data.lessonId)
        if (!previous || event.createdAt < previous.completedAt)
          await database.completions.put({
            lessonId: event.data.lessonId,
            completedAt: event.createdAt,
          })
      }
      if (!existing) await database.syncEvents.add(event)
      await recordReceipt(
        {
          eventId: record.eventId,
          sequence: record.sequence,
          hash: record.hash,
          receivedAt: record.receivedAt,
        },
        ownerId,
        database,
      )
    }
    await rebuildReviewStates(database)
    await database.syncState.update('cloud', { cursor })
  })
}
const running = new WeakMap<VoltwiseDatabase, Promise<boolean>>()
export function synchronize(
  database = db,
  transport: SyncTransport = httpTransport,
): Promise<boolean> {
  const active = running.get(database)
  if (active) return active
  const promise = run(database, transport).finally(() => running.delete(database))
  running.set(database, promise)
  return promise
}
async function run(database: VoltwiseDatabase, transport: SyncTransport) {
  const state = await database.syncState.get('cloud')
  if (!state?.enabled || state.blocked) return false
  try {
    const session = await transport.session()
    if (!session.authenticated || !session.ownerId || !session.csrf)
      throw new SyncError(
        'Bitte mit GitHub anmelden. Lokale Änderungen bleiben gespeichert.',
        false,
        true,
      )
    if (session.ownerId !== state.ownerId)
      throw new SyncError('Das angemeldete Konto passt nicht zur lokalen Verknüpfung.', true)
    for (let round = 0; round < 20; round++) {
      if (!(await database.syncState.get('cloud'))?.enabled) return false
      const pending = await database.syncOutbox.toArray()
      pending.sort(
        (a, b) =>
          Number(a.kind === 'review') - Number(b.kind === 'review') ||
          a.createdAt.localeCompare(b.createdAt) ||
          a.eventId.localeCompare(b.eventId),
      )
      if (!pending.length) break
      const events: SyncEvent[] = []
      for (const queued of pending.slice(0, batchSize)) {
        const event = await database.syncEvents.get(queued.eventId)
        if (!event)
          throw new SyncError('Ein Outbox-Ereignis fehlt. Bitte die Sicherung prüfen.', true)
        let valid
        try {
          valid = validateSyncEvent(event)
        } catch {
          throw new SyncError(
            'Nicht unterstütztes lokales Ereignis. Bitte aktualisieren und eine Sicherung aufbewahren.',
            true,
          )
        }
        if (
          new TextEncoder().encode(JSON.stringify({ protocol: 1, events: [...events, valid] }))
            .byteLength > maxRequestBytes
        )
          break
        events.push(valid)
      }
      const receipts = z.array(receiptSchema).parse(await transport.upload(events, session.csrf))
      if (
        receipts.length !== events.length ||
        new Set(receipts.map((r) => r.eventId)).size !== events.length
      )
        throw new SyncError(
          'Unvollständige Serverbestätigung. Alle Einträge bleiben erneut übertragbar.',
          true,
        )
      for (const receipt of receipts) {
        const event = events.find((e) => e.eventId === receipt.eventId)
        if (!event || (await contentHash(event)) !== receipt.hash)
          throw new SyncError('Ungültige Serverbestätigung.', true)
      }
      await database.transaction('rw', syncTables(database), async () => {
        for (const receipt of receipts) await recordReceipt(receipt, session.ownerId!, database)
        await rebuildReviewStates(database)
      })
    }
    for (let round = 0; round < 20; round++) {
      const current = await database.syncState.get('cloud')
      if (!current?.enabled) return false
      const page = downloadResponseSchema.parse(await transport.download(current.cursor))
      let last = current.cursor
      for (const record of page.events) {
        if (record.sequence <= last) throw new SyncError('Ungültige Serverreihenfolge.', true)
        last = record.sequence
      }
      if (last !== page.cursor || (page.hasMore && !page.events.length))
        throw new SyncError('Ungültiger Synchronisierungszeiger.', true)
      await applyPage(page.events, page.cursor, session.ownerId, database)
      if (!page.hasMore) {
        if (await database.syncOutbox.count()) return false
        await database.syncState.update('cloud', {
          lastSuccess: new Date().toISOString(),
          error: undefined,
          blocked: false,
        })
        return true
      }
    }
    return false
  } catch (error) {
    // A failed cursor/save never acknowledges data. Quota and browser failures preserve the old transaction.
    const message =
      error instanceof SyncError
        ? error.message
        : error instanceof z.ZodError
          ? 'Nicht unterstützte Datenversion. Bitte aktualisieren; der Abruf bleibt erhalten.'
          : 'Synchronisierung fehlgeschlagen. Netzwerk und Browserspeicher prüfen. Lokale Daten bleiben erhalten.'
    await database.syncState.update('cloud', {
      error: message,
      blocked: error instanceof SyncError ? error.blocked : error instanceof z.ZodError,
    })
    return false
  }
}
