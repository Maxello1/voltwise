import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { VoltwiseDatabase, initializeDatabase } from '../../src/storage/db'
import { advanceSession, startSession, submitAnswer } from '../../src/storage/learning'
import { exportBackup, importBackup } from '../../src/storage/backup'
import type { LearningSession } from '../../src/domain/models'
import { exerciseById } from '../../src/content/curriculum'
import { scheduleReview } from '../../src/domain/review'

let database: VoltwiseDatabase
async function session(exerciseId = 'unit-current') {
  const value: LearningSession = {
    id: crypto.randomUUID(),
    mode: 'practice',
    exerciseIds: [exerciseId],
    position: 0,
    status: 'active',
    startedAt: new Date().toISOString(),
  }
  await database.sessions.add(value)
  return value
}
beforeEach(async () => {
  database = new VoltwiseDatabase(`test-${crypto.randomUUID()}`)
  await initializeDatabase(database)
})
afterEach(async () => {
  await database.delete()
})

describe('transactional learning persistence', () => {
  it('starts only due review facts in the same earliest-due order as the preview', async () => {
    const card = scheduleReview(undefined, 3, new Date()).after
    for (const [exerciseId, due] of [
      ['unit-current', '2020-01-02T12:00:00.000Z'],
      ['voltmeter', '2020-01-01T12:00:00.000Z'],
      ['ammeter', '2099-01-01T12:00:00.000Z'],
      ['ohm-current', '2020-01-01T12:00:00.000Z'],
    ] as const)
      await database.reviewStates.put({
        exerciseId,
        lastEventId: crypto.randomUUID(),
        card: { ...card, due },
      })
    const selected = await startSession('review', undefined, database)
    expect(selected?.exerciseIds).toEqual(['voltmeter', 'unit-current'])
  })
  it('starts only the requested circuit exercises while keeping existing sessions resumable', async () => {
    const current = await startSession('schematic', undefined, database, 'meters-24v')
    expect(current?.exerciseIds).toEqual([
      'meter-identify-ammeter',
      'meter-identify-voltmeter',
      'meter-current',
    ])
    expect((await startSession('schematic', undefined, database, 'series-24v'))?.id).toBe(
      current?.id,
    )
    expect(await database.sessions.count()).toBe(1)
  })
  it('persists a targeted concept session and resumes it before a different selection', async () => {
    const current = await startSession('practice', undefined, database, undefined, 'ohm-law')
    expect(current?.exerciseIds).toHaveLength(5)
    expect(current?.exerciseIds[0]).toBe('ohm-current')
    expect(
      current?.exerciseIds.every((id) => exerciseById.get(id)?.conceptIds.includes('ohm-law')),
    ).toBe(true)
    const pending = await submitAnswer(current!.id, '0,5 A', false, 1500, database)
    database.close()
    await database.open()
    expect((await startSession('practice', 'basics', database))?.pendingAttemptId).toBe(
      pending?.eventId,
    )
    expect(await database.reviews.count()).toBe(0)
    expect(await database.sessions.count()).toBe(1)
  })
  it('starts an explained mixed selection from persisted lesson prerequisites', async () => {
    await database.completions.put({
      lessonId: 'quantities',
      completedAt: new Date().toISOString(),
    })
    // Finished foundation facts remain scheduled; they should not block the newly eligible topic.
    for (const exerciseId of ['unit-current', 'voltage-symbol', 'resistance-unit']) {
      const current = await session(exerciseId)
      const answer =
        exerciseId === 'unit-current' ? 'a' : exerciseId === 'voltage-symbol' ? 'U' : 'Ohm'
      await submitAnswer(current.id, answer, false, 100, database)
      await advanceSession(current.id, 4, database)
    }
    const selected = await startSession('practice', undefined, database)
    expect(selected?.exerciseIds).toHaveLength(5)
    expect(selected?.exerciseIds).not.toContain('unit-current')
    expect(await database.reviews.count()).toBe(3)
  })
  it('saves an answer before rating, restores the pending step, then persists FSRS history', async () => {
    const current = await session()
    const attempt = await submitAnswer(current.id, 'a', false, 1234, database)
    expect(await database.attempts.count()).toBe(1)
    expect(await database.reviews.count()).toBe(0)
    await database.close()
    await database.open()
    expect((await database.sessions.get(current.id))?.pendingAttemptId).toBe(attempt?.eventId)
    await advanceSession(current.id, 2, database)
    const review = await database.reviews.toCollection().first()
    expect(review?.rating).toBe(2)
    expect(attempt?.correct).toBe(true)
    expect(review?.attemptId).toBe(attempt?.eventId)
    expect((await database.reviewStates.get('unit-current'))?.card.reps).toBe(1)
    expect((await database.sessions.get(current.id))?.status).toBe('complete')
  })
  it('deduplicates repeated answer submission and advancement', async () => {
    const current = await session()
    const first = await submitAnswer(current.id, 'a', false, 20, database)
    const repeat = await submitAnswer(current.id, 'w', false, 30, database)
    expect(repeat?.eventId).toBe(first?.eventId)
    await advanceSession(current.id, 3, database)
    await advanceSession(current.id, 3, database)
    expect(await database.attempts.count()).toBe(1)
    expect(await database.reviews.count()).toBe(1)
  })
  it('leaves invalid numeric inputs unrecorded', async () => {
    const current = await session('ohm-current')
    await expect(submitAnswer(current.id, '240 V', false, 10, database)).rejects.toThrow('Einheit')
    expect(await database.attempts.count()).toBe(0)
    expect((await database.sessions.get(current.id))?.position).toBe(0)
  })
  it('keeps application practice outside the memory scheduler', async () => {
    const current = await session('ohm-current')
    await submitAnswer(current.id, '240 mA', true, 10, database)
    await advanceSession(current.id, undefined, database)
    expect(await database.reviews.count()).toBe(0)
    expect((await database.attempts.toCollection().first())?.hints).toBe(1)
    expect((await database.sessions.get(current.id))?.status).toBe('complete')
  })
  it('requires an explicit memory rating before advancing', async () => {
    const current = await session()
    await submitAnswer(current.id, 'a', false, 10, database)
    await expect(advanceSession(current.id, undefined, database)).rejects.toThrow('bewerte')
    expect((await database.sessions.get(current.id))?.position).toBe(0)
  })
  it('retains completed lessons and device identity on reopen', async () => {
    const deviceId = (await database.metadata.get('deviceId'))?.value
    await database.completions.add({
      lessonId: 'quantities',
      completedAt: new Date().toISOString(),
    })
    database.close()
    await database.open()
    await initializeDatabase(database)
    expect((await database.metadata.get('deviceId'))?.value).toBe(deviceId)
    expect(await database.completions.count()).toBe(1)
  })
  it('resumes an active session rather than replacing it', async () => {
    const current = await session()
    expect((await startSession('schematic', undefined, database))?.id).toBe(current.id)
  })
  it('creates just one active session when two tabs start together', async () => {
    const [first, second] = await Promise.all([
      startSession('practice', undefined, database),
      startSession('practice', undefined, database),
    ])
    expect(first?.id).toBe(second?.id)
    expect(await database.sessions.count()).toBe(1)
  })
  it('rejects stale submissions from a different step or pending answer', async () => {
    const current = await session()
    await expect(
      submitAnswer(current.id, 'a', false, 10, database, 'voltage-symbol'),
    ).rejects.toThrow('anderen Fenster')
    const attempt = await submitAnswer(current.id, 'a', false, 10, database, 'unit-current')
    await expect(advanceSession(current.id, 3, database, crypto.randomUUID())).rejects.toThrow(
      'anderen Fenster',
    )
    expect((await database.sessions.get(current.id))?.pendingAttemptId).toBe(attempt?.eventId)
  })
})

describe('validated additive backup restoration', () => {
  it('rates an imported pending answer with the restoring device identity', async () => {
    const current = await session()
    await submitAnswer(current.id, 'a', false, 10, database)
    const backup = await exportBackup(database)
    const restored = new VoltwiseDatabase(`restore-${crypto.randomUUID()}`)
    try {
      await initializeDatabase(restored)
      await importBackup(backup, restored)
      await advanceSession(current.id, 3, restored)
      expect((await restored.reviews.toCollection().first())?.deviceId).toBe(
        (await restored.metadata.get('deviceId'))?.value,
      )
      expect((await restored.reviews.toCollection().first())?.deviceId).not.toBe(
        backup.attempts[0]?.deviceId,
      )
    } finally {
      await restored.delete()
    }
  })
  it('restores on a fresh database and importing twice is idempotent', async () => {
    const current = await session()
    await submitAnswer(current.id, 'a', false, 10, database)
    await advanceSession(current.id, 3, database)
    await database.completions.put({
      lessonId: 'quantities',
      completedAt: new Date().toISOString(),
    })
    const backup = JSON.parse(JSON.stringify(await exportBackup(database)))
    const restored = new VoltwiseDatabase(`restore-${crypto.randomUUID()}`)
    try {
      await initializeDatabase(restored)
      await importBackup(backup, restored)
      await importBackup(backup, restored)
      expect(await restored.attempts.toArray()).toEqual(backup.attempts)
      expect(await restored.reviews.toArray()).toEqual(backup.reviews)
      expect(await restored.completions.count()).toBe(1)
      expect((await restored.reviewStates.get('unit-current'))?.card).toEqual(
        backup.reviews[0].cardAfter,
      )
    } finally {
      await restored.delete()
    }
  })
  it('rejects unsupported versions and missing references without changing local data', async () => {
    const backup = await exportBackup(database)
    await expect(importBackup({ ...backup, version: 2 }, database)).rejects.toThrow()
    const current = await session()
    await submitAnswer(current.id, 'a', false, 10, database)
    const valid = await exportBackup(database)
    await expect(importBackup({ ...valid, sessions: [] }, database)).rejects.toThrow(
      'Sitzungsreferenz',
    )
    expect(await database.attempts.count()).toBe(1)
  })
  it('rolls back the entire import on an immutable-event conflict', async () => {
    const current = await session()
    await submitAnswer(current.id, 'a', false, 10, database)
    const backup = await exportBackup(database)
    const additional = { ...backup.attempts[0]!, eventId: crypto.randomUUID() }
    const tampered = { ...backup.attempts[0]!, correct: false }
    await expect(
      importBackup({ ...backup, attempts: [additional, tampered] }, database),
    ).rejects.toThrow('Konflikt')
    expect(await database.attempts.count()).toBe(1)
  })
})
