import { afterEach, beforeEach, expect, it } from 'vitest'
import { VoltwiseDatabase, initializeDatabase } from '../../src/storage/db'
import { startSession, submitAnswer, advanceSession } from '../../src/storage/learning'
import { exportBackup, importBackup, parseBackup } from '../../src/storage/backup'
import { resolveExercise } from '../../src/content/exercise-catalogue'
import { answerLabel } from '../../src/domain/grading'
import { validateSyncEvent } from '../../src/sync/protocol'
import { schoolApplicationAnswers } from '../fixtures/school-answers'
import legacy from '../fixtures/backup-v1-pending-0.5.json'
import v06 from '../fixtures/backup-v2-v06.json'

let databases: VoltwiseDatabase[]
beforeEach(async () => {
  databases = [
    new VoltwiseDatabase(`school-a-${crypto.randomUUID()}`),
    new VoltwiseDatabase(`school-b-${crypto.randomUUID()}`),
  ]
  for (const db of databases) await initializeDatabase(db)
})
afterEach(async () => {
  for (const db of databases) await db.delete()
})
it('saves every structured answer atomically, survives pending reload, and restores additive backup3 twice', async () => {
  const [a, b] = databases as [VoltwiseDatabase, VoltwiseDatabase]
  for (const [exerciseId, answer] of Object.entries(schoolApplicationAnswers)) {
    const session = (await startSession(
      'practice',
      undefined,
      a,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      exerciseId,
    ))!
    const [one, duplicate] = await Promise.all([
      submitAnswer(session.id, JSON.stringify(answer), false, 100, a),
      submitAnswer(session.id, JSON.stringify(answer), false, 100, a),
    ])
    expect(one?.eventId).toBe(duplicate?.eventId)
    expect(one?.correct, exerciseId).toBe(true)
    a.close()
    await a.open()
    expect((await a.sessions.get(session.id))?.pendingAttemptId).toBe(one!.eventId)
    const backup = await exportBackup(a)
    expect(backup.version).toBe(3)
    await importBackup(backup, b)
    await importBackup(backup, b)
    expect(await b.attempts.get(one!.eventId)).toEqual(one)
    expect((await b.sessions.get(session.id))?.pendingAttemptId).toBe(one!.eventId)
    for (const event of backup.syncEvents) expect(validateSyncEvent(event)).toEqual(event)
    await advanceSession(session.id, undefined, a)
    await advanceSession(session.id, undefined, b)
  }
  expect(await a.attempts.count()).toBe(15)
  expect(await b.attempts.count()).toBe(15)
  expect(await a.reviews.count()).toBe(0)
  expect(await b.reviewStates.count()).toBe(0)
  const invalid = await exportBackup(a)
  invalid.attempts[0]!.answer = JSON.stringify({ version: 99, kind: 'waveform' })
  expect(() => parseBackup(invalid)).toThrow()
  expect(await a.attempts.count()).toBe(15)
})
it('resumes older pending facts before school rounds and preserves migration3 and diagnostics through imports', async () => {
  const db = databases[0]!
  await importBackup(legacy, db)
  const pending = (await startSession(
    'practice',
    undefined,
    db,
    undefined,
    undefined,
    undefined,
    undefined,
    { area: 'ac', code: '123456' },
  ))!
  expect(pending.id).toBe(legacy.sessions[0]!.id)
  expect(await db.attempts.toArray()).toEqual(legacy.attempts)
  await importBackup(v06, databases[1]!)
  expect(await databases[1]!.diagnosticDrafts.count()).toBe(v06.diagnosticDrafts.length)
  expect((await db.metadata.get('dbSchemaVersion'))?.value).toBe('3')
  expect(await db.completions.toArray()).toEqual(legacy.completions)
})
it('completes reproducible AC/motor/PLC numeric rounds with exact IDs and no memory reviews', async () => {
  const db = databases[0]!
  for (const area of ['ac', 'motor', 'plc'] as const) {
    const session = (await startSession(
      'practice',
      undefined,
      db,
      undefined,
      undefined,
      undefined,
      undefined,
      { area, code: '123456' },
    ))!
    expect(session.exerciseIds).toHaveLength(area === 'ac' ? 10 : area === 'motor' ? 4 : 2)
    for (const id of session.exerciseIds) {
      expect(
        (await submitAnswer(session.id, answerLabel(resolveExercise(id)!), false, 100, db))
          ?.correct,
      ).toBe(true)
      await advanceSession(session.id, undefined, db)
    }
    expect((await db.sessions.get(session.id))?.status).toBe('complete')
  }
  expect(await db.attempts.count()).toBe(16)
  expect(await db.reviews.count()).toBe(0)
})
