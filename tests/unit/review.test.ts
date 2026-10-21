import { describe, expect, it } from 'vitest'
import { scheduleReview } from '../../src/domain/review'
import { cardSchema, conceptMastery } from '../../src/domain/models'

describe('FSRS adapter', () => {
  const now = new Date('2026-10-21T10:00:00.000Z')
  it('serializes complete scheduling state and records the selected rating', () => {
    const result = scheduleReview(undefined, 3, now)
    expect(cardSchema.safeParse(result.after).success).toBe(true)
    expect(result.log.rating).toBe(3)
    expect(new Date(result.after.due).getTime()).toBeGreaterThan(now.getTime())
    expect(result.after.reps).toBe(1)
  })
  it('is deterministic without fuzz and does not mutate stored state', () => {
    const previous = scheduleReview(undefined, 3, now).after
    const copy = structuredClone(previous)
    const later = new Date('2026-10-22T10:00:00.000Z')
    expect(scheduleReview(previous, 2, later)).toEqual(scheduleReview(previous, 2, later))
    expect(previous).toEqual(copy)
  })
  it('schedules again earlier than easy', () => {
    expect(new Date(scheduleReview(undefined, 1, now).after.due).getTime()).toBeLessThan(
      new Date(scheduleReview(undefined, 4, now).after.due).getTime(),
    )
  })
  it('rejects a nonexistent rating', () =>
    expect(() => scheduleReview(undefined, 0, now)).toThrow())
  it('does not invent mastery before attempts exist', () => {
    expect(conceptMastery([{ id: 'c', title: 'Concept', topicId: 't' }], [])).toEqual([
      { conceptId: 'c', attempts: 0, correct: 0, score: null },
    ])
  })
})
