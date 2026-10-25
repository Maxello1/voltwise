import Dexie from 'dexie'
import { afterEach, beforeEach, expect, it } from 'vitest'
import fixture from '../fixtures/backup-v1-pending-0.3.json'
import { VoltwiseDatabase, initializeDatabase } from '../../src/storage/db'
import { advanceSession, startSession, submitAnswer } from '../../src/storage/learning'
import { exportBackup, importBackup } from '../../src/storage/backup'
import { concepts, lessons, topics, exercises } from '../../src/content/curriculum'
import { planPractice, practiceRecommendations } from '../../src/domain/practice-plan'

let database: VoltwiseDatabase
beforeEach(async () => {
  database = new VoltwiseDatabase(`controls-${crypto.randomUUID()}`)
  await initializeDatabase(database)
})
afterEach(async () => {
  await database.delete()
})

it('appends all overload attempts, resumes a pending answer, and restores it idempotently with no FSRS cards', async () => {
  const session = (await startSession('schematic', undefined, database, 'control-overload-v1'))!
  expect(session.exerciseIds).toHaveLength(4)
  const first = await submitAnswer(session.id, 'f1-contact', true, 1200, database)
  expect(first?.correct).toBe(true)
  database.close()
  await database.open()
  expect(
    (await startSession('schematic', undefined, database, 'control-lamp-v1'))?.pendingAttemptId,
  ).toBe(first?.eventId)
  await advanceSession(session.id, undefined, database)
  for (const answer of ['ready', 'inhibit', 'latched']) {
    expect((await submitAnswer(session.id, answer, false, 1000, database))?.correct).toBe(true)
    await advanceSession(session.id, undefined, database)
  }
  expect(await database.attempts.get(first!.eventId)).toEqual(first)
  expect(await database.reviews.count()).toBe(0)
  expect(await database.reviewStates.count()).toBe(0)
  const repeat = (await startSession('schematic', undefined, database, 'control-overload-v1'))!
  await submitAnswer(repeat.id, 's0', false, 600, database)
  expect(await database.attempts.count()).toBe(5)
  const backup = JSON.parse(JSON.stringify(await exportBackup(database)))
  expect(backup.version).toBe(2)
  const restored = new VoltwiseDatabase(`restore-${crypto.randomUUID()}`)
  try {
    await initializeDatabase(restored)
    await importBackup(backup, restored)
    await importBackup(backup, restored)
    expect(await restored.attempts.toArray()).toEqual(backup.attempts)
    expect(await restored.sessions.toArray()).toEqual(backup.sessions)
    expect(await restored.reviews.count()).toBe(0)
    expect((await startSession('practice', undefined, restored))?.id).toBe(repeat.id)
  } finally {
    await restored.delete()
  }
})

it('uses application evidence for recommendations while scheduling only the explicit contact knowledge rating', async () => {
  const targeted = (await startSession(
    'practice',
    undefined,
    database,
    undefined,
    'control-contacts',
  ))!
  expect(targeted.exerciseIds[0]).toBe('control-nc-rest-v1')
  await submitAnswer(targeted.id, 'open', false, 1000, database)
  expect(await database.reviews.count()).toBe(0)
  await advanceSession(targeted.id, 2, database)
  expect(await database.reviews.count()).toBe(1)
  await submitAnswer(targeted.id, 's1', true, 1000, database)
  await advanceSession(targeted.id, undefined, database)
  expect(await database.reviews.count()).toBe(1)
  const attempts = await database.attempts.toArray()
  expect(practiceRecommendations(concepts, attempts)[0]?.concept.id).toBe('control-contacts')
  const future = await database.reviewStates.toArray()
  const plan = planPractice({
    topics,
    concepts,
    exercises,
    lessons,
    attempts,
    reviewStates: future,
    completions: [],
    now: new Date('2020-01-01T00:00:00Z'),
    conceptId: 'control-contacts',
  })
  expect(plan.some((item) => item.exercise.id === 'control-nc-rest-v1')).toBe(false)
  expect(plan[0]?.kind).toBe('support')
})

it('reopens an independently declared schema-1 database without altering events, session queues or generated v1 IDs', async () => {
  const name = `previous-release-${crypto.randomUUID()}`
  const previous = new Dexie(name)
  // Exact v0.4 stores; this deliberately does not instantiate the current database class.
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
  await previous.table('attempts').bulkAdd(fixture.attempts)
  await previous.table('sessions').bulkAdd(fixture.sessions)
  await previous.table('settings').add(fixture.settings)
  await previous.table('completions').bulkAdd(fixture.completions)
  await previous.table('metadata').add({ key: 'deviceId', value: fixture.attempts[0]!.deviceId })
  const generatedSession = {
    id: crypto.randomUUID(),
    mode: 'practice',
    exerciseIds: ['dc1-ohm-current-000000', 'dc1-series-current-000000'],
    position: 2,
    status: 'complete',
    startedAt: '2026-10-21T18:00:00.000Z',
    completedAt: '2026-10-21T18:01:00.000Z',
  }
  await previous.table('sessions').add(generatedSession)
  previous.close()
  const upgraded = new VoltwiseDatabase(name)
  try {
    await initializeDatabase(upgraded)
    expect(upgraded.verno).toBe(2)
    expect(await upgraded.attempts.toArray()).toEqual(fixture.attempts)
    expect(await upgraded.sessions.get(generatedSession.id)).toEqual(generatedSession)
    const active = (await startSession('schematic', undefined, upgraded, 'control-hold-v1'))!
    expect(active).toEqual(fixture.sessions[0])
    expect((await upgraded.settings.get('preferences'))?.theme).toBe('dark')
    const backup = await exportBackup(upgraded)
    await importBackup(backup, database)
    expect(await database.attempts.toArray()).toEqual(fixture.attempts)
    expect(await database.sessions.get(generatedSession.id)).toEqual(generatedSession)
    await advanceSession(active.id, 3, upgraded)
    expect((await upgraded.reviews.toCollection().first())?.attemptId).toBe(
      fixture.attempts[0]!.eventId,
    )
    expect(await upgraded.attempts.toArray()).toEqual(fixture.attempts)
  } finally {
    await upgraded.delete()
  }
})
