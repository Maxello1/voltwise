import { beforeEach, afterEach, describe, it, expect } from 'vitest'
import fixture from '../fixtures/backup-v1-pending-0.3.json'
import { VoltwiseDatabase, initializeDatabase } from '../../src/storage/db'
import { startSession, submitAnswer, advanceSession } from '../../src/storage/learning'
import { exportBackup, importBackup, parseBackup } from '../../src/storage/backup'
import { resolveExercise } from '../../src/content/exercise-catalogue'

let database: VoltwiseDatabase
const startRound = (code: string, target = database) =>
  startSession('practice', undefined, target, undefined, undefined, code)
beforeEach(async () => {
  database = new VoltwiseDatabase(`dc-test-${crypto.randomUUID()}`)
  await initializeDatabase(database)
})
afterEach(async () => {
  await database.delete()
})

describe('generated exercise persistence and compatibility', () => {
  it('restores the exact generated problem and pending answer after closing the database', async () => {
    const round = (await startRound('000000'))!
    expect(round.exerciseIds).toHaveLength(5)
    const original = resolveExercise(round.exerciseIds[0]!)
    const pending = await submitAnswer(round.id, '10 mA', true, 1250, database)
    database.close()
    await database.open()
    const resumed = (await startRound('999999'))!
    expect(resumed.id).toBe(round.id)
    expect(resumed.pendingAttemptId).toBe(pending?.eventId)
    expect(resolveExercise(resumed.exerciseIds[0]!)).toEqual(original)
    expect((await database.attempts.get(pending!.eventId))?.hints).toBe(1)
    await advanceSession(round.id, undefined, database)
    expect(await database.reviews.count()).toBe(0)
    expect(await database.reviewStates.count()).toBe(0)
  })
  it('completes five generated applications with the original reference answers and no memory cards', async () => {
    const round = (await startRound('000000'))!
    for (const answer of ['0,01 A', '900 Ω', '0,09 W', '0,1 A', '0,4 A']) {
      expect((await submitAnswer(round.id, answer, false, 1000, database))?.correct).toBe(true)
      await advanceSession(round.id, undefined, database)
    }
    expect((await database.sessions.get(round.id))?.status).toBe('complete')
    expect(await database.attempts.count()).toBe(5)
    expect(await database.reviews.count()).toBe(0)
    expect(await database.reviewStates.count()).toBe(0)
  })
  it('roundtrips generated IDs, parameters and hint use through a fresh-device JSON backup twice', async () => {
    const round = (await startRound('123456'))!
    await submitAnswer(round.id, '40 mA', true, 1000, database)
    const backup = JSON.parse(JSON.stringify(await exportBackup(database)))
    const restored = new VoltwiseDatabase(`restore-dc-${crypto.randomUUID()}`)
    try {
      await initializeDatabase(restored)
      await importBackup(backup, restored)
      await importBackup(backup, restored)
      expect(await restored.attempts.toArray()).toEqual(backup.attempts)
      expect(await restored.sessions.toArray()).toEqual(backup.sessions)
      expect(resolveExercise((await restored.sessions.get(round.id))!.exerciseIds[3]!)).toEqual(
        resolveExercise(round.exerciseIds[3]!),
      )
      expect(await restored.reviews.count()).toBe(0)
    } finally {
      await restored.delete()
    }
  })
  it('rejects unknown generator versions or forged concept/version metadata before changing local data', async () => {
    const round = (await startRound('000000'))!
    await submitAnswer(round.id, '10 mA', false, 1000, database)
    const backup = await exportBackup(database)
    const unknown = structuredClone(backup)
    unknown.attempts[0]!.exerciseId = 'dc2-ohm-current-000000'
    expect(() => parseBackup(unknown)).toThrow('Unbekannte Aufgabe')
    const forged = structuredClone(backup)
    forged.attempts[0]!.conceptIds = ['meters']
    await expect(importBackup(forged, database)).rejects.toThrow('Unbekannte Aufgabe')
    forged.attempts[0]!.conceptIds = backup.attempts[0]!.conceptIds
    forged.attempts[0]!.exerciseVersion = 2
    await expect(importBackup(forged, database)).rejects.toThrow('Unbekannte Aufgabe')
    expect(await database.attempts.toArray()).toEqual(backup.attempts)
  })
  it('preserves one active session when two different rounds start concurrently', async () => {
    const [first, second] = await Promise.all([startRound('000000'), startRound('999999')])
    expect(first?.id).toBe(second?.id)
    expect(first?.exerciseIds).toEqual(second?.exerciseIds)
    expect(await database.sessions.count()).toBe(1)
  })
  it('imports a synthetic 0.3-format pending-review fixture and resumes it before new calculations', async () => {
    const originalDevice = (await database.metadata.get('deviceId'))?.value
    await importBackup(fixture, database)
    await importBackup(fixture, database)
    const resumed = (await startRound('123456'))!
    expect(resumed.id).toBe(fixture.sessions[0]!.id)
    expect(resumed.pendingAttemptId).toBe(fixture.attempts[0]!.eventId)
    expect(await database.attempts.toArray()).toEqual(fixture.attempts)
    expect((await database.settings.get('preferences'))?.theme).toBe('dark')
    expect(await database.completions.count()).toBe(1)
    await advanceSession(resumed.id, 3, database)
    const review = (await database.reviews.toCollection().first())!
    expect(review.deviceId).toBe(originalDevice)
    expect(review.attemptId).toBe(fixture.attempts[0]!.eventId)
    expect((await database.sessions.get(resumed.id))?.exerciseIds[1]).toBe('voltage-symbol')
    expect((await database.metadata.get('dbSchemaVersion'))?.value).toBe('2')
  })
})
