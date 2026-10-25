import Dexie from 'dexie'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { VoltwiseDatabase, initializeDatabase } from '../../src/storage/db'
import { startSession, submitAnswer, advanceSession } from '../../src/storage/learning'
import { saveDiagnosticDraft } from '../../src/storage/diagnostics'
import { exportBackup, importBackup, parseBackup } from '../../src/storage/backup'
import { diagnosticSolutions } from '../fixtures/diagnostic-solutions'
import legacy from '../fixtures/backup-v1-pending-0.5.json'

let database: VoltwiseDatabase
beforeEach(async () => {
  database = new VoltwiseDatabase(`diagnostic-${crypto.randomUUID()}`)
  await initializeDatabase(database)
})
afterEach(async () => {
  await database.delete()
})

it('restores an unsubmitted investigation, then atomically appends one graded attempt with no FSRS rating', async () => {
  const id = 'diag-start-v1-l3'
  const session = (await startSession(
    'practice',
    undefined,
    database,
    undefined,
    undefined,
    undefined,
    id,
  ))!
  const answer = diagnosticSolutions['diag-start-v1']!
  for (const action of answer.actions) await saveDiagnosticDraft(session.id, id, action, database)
  await saveDiagnosticDraft(
    session.id,
    id,
    { location: answer.location, mechanism: answer.mechanism },
    database,
  )
  expect(await database.attempts.count()).toBe(0)
  database.close()
  await database.open()
  const draft = (await database.diagnosticDrafts.get(session.id))!
  expect(draft.answer).toEqual(answer)
  const attempts = await Promise.all([
    submitAnswer(session.id, JSON.stringify(draft.answer), false, 1200, database),
    submitAnswer(session.id, JSON.stringify(draft.answer), false, 1200, database),
  ])
  expect(attempts[0]?.eventId).toBe(attempts[1]?.eventId)
  expect(attempts[0]?.correct).toBe(true)
  expect(await database.attempts.count()).toBe(1)
  await expect(saveDiagnosticDraft(session.id, id, ['forward', false], database)).rejects.toThrow(
    /offene Schritt/,
  )
  await advanceSession(session.id, undefined, database)
  expect(await database.reviews.count()).toBe(0)
  expect(await database.reviewStates.count()).toBe(0)
  expect((await database.sessions.get(session.id))?.status).toBe('complete')
})

it('preserves local drafts, hints, old pending sessions and all history in additive v2 and legacy v1 restores', async () => {
  const session = (await startSession(
    'practice',
    undefined,
    database,
    undefined,
    undefined,
    undefined,
    'diag-supply-v1-l1',
  ))!
  await saveDiagnosticDraft(session.id, 'diag-supply-v1-l1', ['measure', 'g1.a', 'g1.b'], database)
  await saveDiagnosticDraft(session.id, 'diag-supply-v1-l1', { hint: true }, database)
  const backup = await exportBackup(database)
  expect(backup.version).toBe(2)
  const restored = new VoltwiseDatabase(`restore-${crypto.randomUUID()}`)
  try {
    await initializeDatabase(restored)
    await importBackup(backup, restored)
    await importBackup(backup, restored)
    expect(await restored.diagnosticDrafts.toArray()).toEqual(backup.diagnosticDrafts)
    const draft = (await restored.diagnosticDrafts.get(session.id))!
    await saveDiagnosticDraft(
      session.id,
      draft.exerciseId,
      { location: 'g1', mechanism: 'no-supply', hint: false },
      restored,
    )
    await importBackup(backup, restored)
    const current = (await restored.diagnosticDrafts.get(session.id))!
    expect(current.answer).toMatchObject({ location: 'g1', hint: true })
    const attempt = await submitAnswer(
      session.id,
      JSON.stringify(current.answer),
      false,
      2000,
      restored,
    )
    expect(attempt).toMatchObject({ correct: true, hints: 1 })
    await importBackup(legacy, restored)
    expect(await restored.attempts.get(legacy.attempts[0]!.eventId)).toEqual(legacy.attempts[0])
    expect((await restored.sessions.get(legacy.sessions[0]!.id))?.pendingAttemptId).toBe(
      legacy.attempts[0]!.eventId,
    )
    await expect(
      importBackup(
        {
          ...backup,
          diagnosticDrafts: [
            { ...draft, answer: { ...draft.answer, actions: [['measure', 'geometry', 'g1.b']] } },
          ],
        },
        restored,
      ),
    ).rejects.toThrow()
    expect(await restored.attempts.count()).toBe(2)
    const valid = await exportBackup(restored)
    const diagnosticAttempt = valid.attempts.find((a) => a.exerciseId === 'diag-supply-v1-l1')!
    expect(() =>
      parseBackup({
        ...valid,
        attempts: valid.attempts.map((a) =>
          a.eventId === diagnosticAttempt.eventId ? { ...a, answer: 'malformed JSON' } : a,
        ),
      }),
    ).toThrow()
  } finally {
    await restored.delete()
  }
})

it('performs the numbered v1 to v2 migration without changing old attempts, queues, settings or pending ratings', async () => {
  const name = `v05-${crypto.randomUUID()}`
  const previous = new Dexie(name)
  previous.version(1).stores({
    attempts: 'eventId, exerciseId, sessionId, createdAt, *conceptIds',
    reviews: 'eventId, &attemptId, exerciseId, createdAt',
    reviewStates: 'exerciseId, card.due',
    sessions: 'id, status, startedAt',
    completions: 'lessonId',
    settings: 'id',
    metadata: 'key',
    syncOutbox: 'eventId, createdAt',
  })
  await previous.open()
  await previous.table('attempts').bulkAdd(legacy.attempts)
  await previous.table('sessions').bulkAdd(legacy.sessions)
  await previous.table('completions').bulkAdd(legacy.completions)
  await previous.table('settings').add(legacy.settings)
  await previous.table('metadata').add({ key: 'deviceId', value: legacy.attempts[0]!.deviceId })
  previous.close()
  const upgraded = new VoltwiseDatabase(name)
  try {
    await upgraded.open()
    expect(upgraded.verno).toBe(2)
    expect(await upgraded.attempts.toArray()).toEqual(legacy.attempts)
    expect(await upgraded.sessions.toArray()).toEqual(legacy.sessions)
    expect(await upgraded.settings.get('preferences')).toEqual(legacy.settings)
    expect(await upgraded.diagnosticDrafts.count()).toBe(0)
    expect((await upgraded.metadata.get('dbSchemaVersion'))?.value).toBe('2')
    await initializeDatabase(upgraded)
    const resumed = await startSession(
      'practice',
      undefined,
      upgraded,
      undefined,
      undefined,
      undefined,
      'diag-start-v1-l1',
    )
    expect(resumed?.pendingAttemptId).toBe(legacy.attempts[0]!.eventId)
    await advanceSession(resumed!.id, 3, upgraded)
    expect(await upgraded.reviews.count()).toBe(1)
    const backup = await exportBackup(upgraded)
    expect(parseBackup(backup).attempts).toEqual(legacy.attempts)
    expect(parseBackup(legacy).version).toBe(2)
  } finally {
    await upgraded.delete()
  }
})

it('merges concurrent draft actions and rejects stale submissions rather than losing newer measurements', async () => {
  const id = 'diag-start-v1-l1'
  const session = (await startSession(
    'practice',
    undefined,
    database,
    undefined,
    undefined,
    undefined,
    id,
  ))!
  await Promise.all([
    saveDiagnosticDraft(session.id, id, ['measure', 'g1.a', 'g1.b'], database),
    saveDiagnosticDraft(session.id, id, ['forward', true], database),
  ])
  const stale = (await database.diagnosticDrafts.get(session.id))!
  expect(stale.answer.actions).toHaveLength(2)
  await saveDiagnosticDraft(session.id, id, { location: 's1', mechanism: 'start-path' }, database)
  await expect(
    submitAnswer(session.id, JSON.stringify(stale.answer), false, 500, database),
  ).rejects.toThrow(/anderen Fenster/)
  expect(await database.attempts.count()).toBe(0)
})
