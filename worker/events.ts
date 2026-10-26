import {
  batchSize,
  canonicalJson,
  contentHash,
  uploadSchema,
  validateSyncEvent,
} from '../src/sync/protocol'
import type { Env } from './types'
import type { AuthSession } from './auth'
import { HttpError, json, readJson } from './http'

export async function upload(request: Request, env: Env, session: AuthSession) {
  const body = uploadSchema.parse(await readJson(request))
  if (new Set(body.events.map((e) => e.eventId)).size !== body.events.length)
    throw new HttpError(400, 'duplicate_batch_id')
  let events
  try {
    events = body.events.map(validateSyncEvent)
  } catch {
    throw new HttpError(400, 'invalid_record')
  }
  // Review dependencies always precede their references inside this transaction.
  events.sort((a, b) => Number(a.kind === 'review') - Number(b.kind === 'review'))
  const hashes = await Promise.all(events.map(contentHash))
  const now = new Date().toISOString()
  const statements = []
  const histories = new Map<string, import('../src/sync/protocol').SessionHistory>()
  for (const event of events)
    if (event.kind === 'attempt') {
      const previous = histories.get(event.session.id)
      if (previous && canonicalJson(previous) !== canonicalJson(event.session))
        throw new HttpError(409, 'event_conflict')
      histories.set(event.session.id, event.session)
    }
  for (const history of histories.values())
    statements.push(
      env.DB.prepare(
        `INSERT INTO session_history VALUES (?,?,?)
      ON CONFLICT(owner_id,id) DO UPDATE SET payload = excluded.payload`,
      ).bind(session.owner_id, history.id, canonicalJson(history)),
    )
  for (const [i, event] of events.entries()) {
    statements.push(
      env.DB.prepare(
        `INSERT INTO events
      (owner_id,event_id,kind,schema_version,device_id,hash,payload,created_at,received_at,attempt_id,session_id)
      VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(owner_id,event_id)
      DO UPDATE SET hash = excluded.hash, payload = excluded.payload`,
      ).bind(
        session.owner_id,
        event.eventId,
        event.kind,
        event.schemaVersion,
        event.deviceId,
        hashes[i],
        canonicalJson(event),
        event.createdAt,
        now,
        event.kind === 'review' ? event.data.attemptId : null,
        event.kind === 'attempt' ? event.session.id : null,
      ),
    )
  }
  try {
    await env.DB.batch(statements)
  } catch (error) {
    if (
      /event_conflict|session_conflict|review_reference|UNIQUE constraint|FOREIGN KEY constraint/i.test(
        String(error),
      )
    )
      throw new HttpError(409, 'event_conflict')
    throw error
  }
  const ids = events.map((e) => e.eventId)
  const records = await env.DB.prepare(
    `SELECT event_id AS eventId, sequence, hash, received_at AS receivedAt
    FROM events WHERE owner_id = ? AND event_id IN (${ids.map(() => '?').join(',')})`,
  )
    .bind(session.owner_id, ...ids)
    .all()
  return json({ protocol: 1, receipts: records.results })
}
export async function download(request: Request, env: Env, session: AuthSession) {
  const url = new URL(request.url)
  if (url.searchParams.get('protocol') !== '1') throw new HttpError(400, 'unsupported_protocol')
  const raw = url.searchParams.get('cursor')
  if (!raw || !/^(0|[1-9]\d*)$/.test(raw) || !Number.isSafeInteger(Number(raw)))
    throw new HttpError(400, 'invalid_cursor')
  const cursor = Number(raw)
  const records = await env.DB.prepare(
    `SELECT sequence,event_id,hash,received_at,payload FROM events
    WHERE owner_id = ? AND sequence > ? ORDER BY sequence LIMIT ?`,
  )
    .bind(session.owner_id, cursor, batchSize + 1)
    .all<{
      sequence: number
      event_id: string
      hash: string
      received_at: string
      payload: string
    }>()
  const selected = records.results.slice(0, batchSize)
  return json({
    protocol: 1,
    events: selected.map((r) => ({
      eventId: r.event_id,
      sequence: r.sequence,
      hash: r.hash,
      receivedAt: r.received_at,
      event: JSON.parse(r.payload),
    })),
    cursor: selected.at(-1)?.sequence ?? cursor,
    hasMore: records.results.length > batchSize,
  })
}
