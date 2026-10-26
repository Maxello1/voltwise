import Dexie from 'dexie'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { VoltwiseDatabase, initializeDatabase } from '../../src/storage/db'
import { advanceSession, submitAnswer, startSession } from '../../src/storage/learning'
import { completeLesson } from '../../src/storage/sync'
import { saveDiagnosticDraft } from '../../src/storage/diagnostics'
import { exportBackup, importBackup } from '../../src/storage/backup'
import { enableSync, synchronize, type SyncTransport } from '../../src/sync/engine'
import { canonicalJson } from '../../src/sync/protocol'
import { testCloud, testOwner, type TestCloud } from './harness'
import type { LearningSession } from '../../src/domain/models'
import legacy from '../fixtures/backup-v1-pending-0.5.json'
import v06 from '../fixtures/backup-v2-v06.json'
import { diagnosticSolutions } from '../fixtures/diagnostic-solutions'
import { schoolApplicationAnswers } from '../fixtures/school-answers'
import { schoolProblem } from '../../src/domain/school-practice'
import { answerLabel } from '../../src/domain/grading'

let cloud: TestCloud
let devices: VoltwiseDatabase[]
beforeEach(async () => {
  cloud = await testCloud()
  devices = []
  for (let i = 0; i < 3; i++) {
    const db = new VoltwiseDatabase(`device-${crypto.randomUUID()}`)
    await initializeDatabase(db)
    devices.push(db)
  }
})
afterEach(async () => {
  vi.useRealTimers()
  for (const db of devices) await db.delete()
  await cloud.dispose()
})
async function connect(db: VoltwiseDatabase) {
  const auth = await cloud.login((await db.metadata.get('deviceId'))!.value)
  await enableSync(testOwner, db)
  return auth.transport
}
async function answer(
  db: VoltwiseDatabase,
  exerciseId = 'unit-current',
  response = 'a',
  rating?: number,
) {
  const session: LearningSession = {
    id: crypto.randomUUID(),
    mode: 'practice',
    exerciseIds: [exerciseId],
    position: 0,
    status: 'active',
    startedAt: new Date().toISOString(),
  }
  await db.sessions.add(session)
  const attempt = await submitAnswer(session.id, response, false, 800, db)
  await advanceSession(session.id, rating, db)
  return attempt!
}
const countEvents = async () =>
  (await cloud.database.prepare('SELECT COUNT(*) AS n FROM events').first<{ n: number }>())!.n

it('merges all school application formats and generated prefixes through real D1 onto three devices', async () => {
  const [a, b, c] = devices as [VoltwiseDatabase, VoltwiseDatabase, VoltwiseDatabase]
  for (const [id, payload] of Object.entries(schoolApplicationAnswers))
    await answer(a, id, JSON.stringify(payload))
  for (const [area, name] of [
    ['ac', 'rms'],
    ['motor', 'force'],
    ['plc', 'margin'],
  ] as const) {
    const exercise = schoolProblem(area, name, '123456')!
    await answer(b, exercise.id, answerLabel(exercise))
  }
  const ta = await connect(a),
    tb = await connect(b),
    tc = await connect(c)
  expect(await synchronize(a, ta)).toBe(true)
  expect(await synchronize(b, tb)).toBe(true)
  expect(await synchronize(a, ta)).toBe(true)
  expect(await synchronize(c, tc)).toBe(true)
  expect(await synchronize(c, tc)).toBe(true)
  expect(await countEvents()).toBe(18)
  for (const db of [a, b, c]) {
    expect(await db.attempts.count()).toBe(18)
    expect((await db.attempts.toArray()).every((record) => record.correct)).toBe(true)
    expect(await db.reviews.count()).toBe(0)
    expect(await db.reviewStates.count()).toBe(0)
    expect(await db.syncOutbox.count()).toBe(0)
  }
  const backup = await exportBackup(c)
  await importBackup(backup, b)
  expect(await b.attempts.count()).toBe(18)
})

it('A/E: uploads offline work locally first and restores it on two independent devices without resuming remote sessions', async () => {
  const [a, b, c] = devices as [VoltwiseDatabase, VoltwiseDatabase, VoltwiseDatabase]
  const local = await answer(a, 'unit-current', 'a', 3)
  await completeLesson('quantities', a)
  expect((await a.syncState.get('cloud'))?.enabled).toBe(false)
  expect(await a.syncOutbox.count()).toBe(3)
  expect(await countEvents()).toBe(0)
  const ta = await connect(a),
    tb = await connect(b),
    tc = await connect(c)
  expect(await synchronize(a, ta)).toBe(true)
  a.close() // Neither restoration depends on the original IndexedDB connection.
  expect(await synchronize(b, tb)).toBe(true)
  expect(await synchronize(c, tc)).toBe(true)
  for (const db of [b, c]) {
    expect(await db.attempts.get(local.eventId)).toEqual(local)
    expect(await db.reviews.count()).toBe(1)
    expect(await db.completions.count()).toBe(1)
    expect(await db.sessions.count()).toBe(0)
    expect(await db.sessionHistory.get(local.sessionId)).toMatchObject({ id: local.sessionId })
  }
  const backup = await exportBackup(c)
  await importBackup(backup, b)
  expect(await b.sessions.count()).toBe(0)
  expect(await b.reviewStates.toArray()).toEqual(await c.reviewStates.toArray())
})

it('B: merges independent offline calculation and diagnostic attempts without changing active investigations or preferences', async () => {
  const [a, b, c] = devices as [VoltwiseDatabase, VoltwiseDatabase, VoltwiseDatabase]
  const aa = await answer(a, 'dc1-series-current-000000', '0.5 A')
  const session = (await startSession(
    'practice',
    undefined,
    b,
    undefined,
    undefined,
    undefined,
    'diag-hold-v1-l3',
  ))!
  const solution = diagnosticSolutions['diag-hold-v1']!
  for (const action of solution.actions)
    await saveDiagnosticDraft(session.id, 'diag-hold-v1-l3', action, b)
  await saveDiagnosticDraft(
    session.id,
    'diag-hold-v1-l3',
    { location: solution.location, mechanism: solution.mechanism },
    b,
  )
  const ba = (await submitAnswer(
    session.id,
    JSON.stringify((await b.diagnosticDrafts.get(session.id))!.answer),
    false,
    1000,
    b,
  ))!
  const draft = await b.diagnosticDrafts.toArray(),
    pending = await b.sessions.toArray()
  await b.settings.update('preferences', { theme: 'dark' })
  const transports = await Promise.all(devices.map(connect))
  await synchronize(a, transports[0])
  await synchronize(b, transports[1])
  await synchronize(a, transports[0])
  await synchronize(c, transports[2])
  for (const db of devices) {
    expect(await db.attempts.count()).toBe(2)
    expect(await db.attempts.get(aa.eventId)).toEqual(aa)
    expect(await db.attempts.get(ba.eventId)).toEqual(ba)
    expect(await db.reviews.count()).toBe(0)
    expect(await db.syncOutbox.count()).toBe(0)
  }
  expect(await b.diagnosticDrafts.toArray()).toEqual(draft)
  expect(await b.sessions.toArray()).toEqual(pending)
  expect((await b.settings.get('preferences'))?.theme).toBe('dark')
  expect(await c.diagnosticDrafts.count()).toBe(0)
})

it('C: retains concurrent offline ratings and converges by server order despite year/month clock skew and delivery order', async () => {
  const [a, b, c] = devices as [VoltwiseDatabase, VoltwiseDatabase, VoltwiseDatabase]
  const [ta, tb, tc] = (await Promise.all(devices.map(connect))) as [
    SyncTransport,
    SyncTransport,
    SyncTransport,
  ]
  await answer(c, 'unit-current', 'a', 3)
  await synchronize(c, tc)
  await synchronize(a, ta)
  await synchronize(b, tb)
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2027-10-25T12:00:00Z'))
  await answer(a, 'unit-current', 'a', 1)
  vi.setSystemTime(new Date('2026-09-01T12:00:00Z'))
  await answer(b, 'unit-current', 'a', 4)
  vi.useRealTimers()
  const originalA = canonicalJson(await a.reviews.toArray()),
    originalB = canonicalJson(await b.reviews.toArray())
  expect(await synchronize(a, ta)).toBe(true)
  expect(await synchronize(b, tb)).toBe(true)
  expect(await synchronize(c, tc)).toBe(true)
  expect(await synchronize(a, ta)).toBe(true)
  const expected = await c.reviewStates.toArray()
  for (const db of devices) {
    expect(await db.reviews.count()).toBe(3)
    expect(await db.reviewStates.toArray()).toEqual(expected)
    expect((await db.reviewStates.get('unit-current'))?.card.reps).toBe(3)
    expect(await db.syncOutbox.count()).toBe(0)
  }
  const aIds = JSON.parse(originalA) as { eventId: string }[],
    bIds = JSON.parse(originalB) as { eventId: string }[]
  expect(
    canonicalJson(
      (await a.reviews.toArray()).filter((r) => aIds.some((x) => x.eventId === r.eventId)),
    ),
  ).toBe(originalA)
  expect(
    canonicalJson(
      (await b.reviews.toArray()).filter((r) => bIds.some((x) => x.eventId === r.eventId)),
    ),
  ).toBe(originalB)
})

it('D: safely retries lost acknowledgments, then converges after reconnect without duplicate events', async () => {
  const a = devices[0]!,
    b = devices[1]!
  await answer(a, 'unit-current', 'a', 2)
  const ta = await connect(a),
    tb = await connect(b)
  let interrupted = true
  const failing: SyncTransport = {
    ...ta,
    async upload(events, csrf) {
      const receipts = await ta.upload(events, csrf)
      if (interrupted) {
        interrupted = false
        throw new TypeError('synthetic lost acknowledgment')
      }
      return receipts
    },
  }
  expect(await synchronize(a, failing)).toBe(false)
  expect(await a.syncOutbox.count()).toBe(2)
  expect(await a.syncReceipts.count()).toBe(0)
  expect((await a.syncState.get('cloud'))?.lastSuccess).toBeUndefined()
  const accepted = await countEvents()
  expect(accepted).toBe(2)
  expect(await synchronize(a, failing)).toBe(true)
  expect(await countEvents()).toBe(accepted)
  expect(await synchronize(b, tb)).toBe(true)
  expect(await b.attempts.toArray()).toEqual(await a.attempts.toArray())
})

it('F: upgrades independent v0.6 schema-2 data with a pending review, diagnostics, generated DC history and an active draft', async () => {
  const oldName = `old-v06-${crypto.randomUUID()}`
  const old = new Dexie(oldName)
  old.version(1).stores({
    attempts: 'eventId, exerciseId, sessionId, createdAt, *conceptIds',
    reviews: 'eventId, &attemptId, exerciseId, createdAt',
    reviewStates: 'exerciseId, card.due',
    sessions: 'id, status, startedAt',
    completions: 'lessonId',
    settings: 'id',
    metadata: 'key',
    syncOutbox: 'eventId, createdAt',
  })
  old.version(2).stores({ diagnosticDrafts: 'sessionId, exerciseId, updatedAt' })
  await old.table('attempts').bulkAdd(v06.attempts)
  await old.table('sessions').bulkAdd(v06.sessions)
  await old.table('reviews').bulkAdd(v06.reviews)
  await old.table('diagnosticDrafts').bulkAdd(v06.diagnosticDrafts)
  await old.table('completions').bulkAdd(v06.completions)
  await old.table('reviewStates').add({
    exerciseId: v06.reviews[0]!.exerciseId,
    lastEventId: v06.reviews[0]!.eventId,
    card: v06.reviews[0]!.cardAfter,
  })
  await old.table('settings').add(v06.settings)
  await old.table('metadata').bulkAdd([
    { key: 'deviceId', value: v06.attempts[0]!.deviceId },
    { key: 'dbSchemaVersion', value: '2' },
  ])
  old.close()
  const upgraded = new VoltwiseDatabase(oldName)
  devices.push(upgraded)
  await initializeDatabase(upgraded)
  expect(upgraded.verno).toBe(3)
  for (const attempt of v06.attempts)
    expect(await upgraded.attempts.get(attempt.eventId)).toEqual(attempt)
  for (const session of v06.sessions)
    expect(await upgraded.sessions.get(session.id)).toEqual(session)
  expect(await upgraded.diagnosticDrafts.toArray()).toEqual(v06.diagnosticDrafts)
  const before = await exportBackup(upgraded)
  const transport = await connect(upgraded)
  expect(await synchronize(upgraded, transport)).toBe(true)
  expect(await upgraded.attempts.toArray()).toEqual(before.attempts)
  expect(await upgraded.sessions.toArray()).toEqual(before.sessions)
  expect(await upgraded.diagnosticDrafts.toArray()).toEqual(before.diagnosticDrafts)
  expect(await upgraded.settings.get('preferences')).toEqual(v06.settings)
  expect((await upgraded.sessions.get(legacy.sessions[0]!.id))?.pendingAttemptId).toBe(
    legacy.attempts[0]!.eventId,
  )
  const fresh = devices[2]!,
    tf = await connect(fresh)
  expect(await synchronize(fresh, tf)).toBe(true)
  expect(await fresh.attempts.count()).toBe(4)
  expect(await fresh.diagnosticDrafts.count()).toBe(0)
  expect(await fresh.sessions.count()).toBe(0)
  const restored = devices[1]!
  await importBackup(v06, restored)
  expect(await restored.attempts.count()).toBe(4)
  expect(await restored.diagnosticDrafts.toArray()).toEqual(v06.diagnosticDrafts)
  // A deliberate backup transfer may resume an old pending rating on a new device.
  // Its original attempt device and new reviewing device must both survive.
  await advanceSession(legacy.sessions[0]!.id, 3, restored)
  const migratedReview = (await restored.reviews
    .where('attemptId')
    .equals(legacy.attempts[0]!.eventId)
    .first())!
  expect(migratedReview.deviceId).not.toBe(legacy.attempts[0]!.deviceId)
  const migratedTransport = await connect(restored)
  expect(await synchronize(restored, migratedTransport)).toBe(true)
  expect(await synchronize(fresh, tf)).toBe(true)
  expect(await fresh.reviews.get(migratedReview.eventId)).toEqual(migratedReview)
})

it('keeps the download cursor and outbox on quota failure, then succeeds without losing the local action', async () => {
  const a = devices[0]!,
    b = devices[1]!
  await answer(a, 'unit-current', 'a', 3)
  const ta = await connect(a),
    tb = await connect(b)
  expect(await synchronize(a, ta)).toBe(true)
  const originalAdd = b.attempts.add.bind(b.attempts)
  const failure = vi
    .spyOn(b.attempts, 'add')
    .mockRejectedValueOnce(new DOMException('synthetic quota', 'QuotaExceededError'))
  expect(await synchronize(b, tb)).toBe(false)
  expect((await b.syncState.get('cloud'))?.cursor).toBe(0)
  expect(await b.attempts.count()).toBe(0)
  expect(await b.sessionHistory.count()).toBe(0)
  failure.mockImplementation(originalAdd)
  expect(await synchronize(b, tb)).toBe(true)
  expect(await b.attempts.count()).toBe(1)
  const count = await a.attempts.count()
  const queueFailure = vi
    .spyOn(a.syncOutbox, 'put')
    .mockRejectedValueOnce(new DOMException('synthetic quota', 'QuotaExceededError'))
  await expect(answer(a, 'unit-current', 'a', 2)).rejects.toThrow('synthetic quota')
  expect(await a.attempts.count()).toBe(count)
  queueFailure.mockRestore()
})

it('preserves unsupported records and UUID conflicts without advancing a cursor or overwriting history', async () => {
  const a = devices[0]!,
    b = devices[1]!,
    ta = await connect(a),
    tb = await connect(b)
  await answer(a, 'unit-current', 'a', 3)
  await synchronize(a, ta)
  const original = await ta.download(0)
  const corrupted = structuredClone(original)
  const review = corrupted.events.find((e) => e.event.kind === 'review')!
  // The engine must reject a future version, rather than drop it or acknowledge its cursor.
  ;(review.event as unknown as { schemaVersion: number }).schemaVersion = 2
  const incompatible: SyncTransport = {
    ...tb,
    async download() {
      return corrupted
    },
  }
  expect(await synchronize(b, incompatible)).toBe(false)
  expect((await b.syncState.get('cloud'))?.cursor).toBe(0)
  expect((await b.syncState.get('cloud'))?.blocked).toBe(true)
  expect(await b.reviews.count()).toBe(0)
  await b.syncState.update('cloud', { blocked: false })
  expect(await synchronize(b, tb)).toBe(true)
  const originalAttempt = (await b.attempts.toArray())[0]!
  const conflict = structuredClone(original)
  const changed = conflict.events.find((e) => e.event.kind === 'attempt')!
  if (changed.event.kind === 'attempt') changed.event.data.answer = 'changed'
  const badHash: SyncTransport = {
    ...tb,
    async download() {
      return conflict
    },
  }
  await b.syncState.update('cloud', { cursor: 0 })
  expect(await synchronize(b, badHash)).toBe(false)
  expect(await b.attempts.get(originalAttempt.eventId)).toEqual(originalAttempt)
})
