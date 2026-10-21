import { describe, expect, it } from 'vitest'
import { concepts, exercises, lessons, topics } from '../../src/content/curriculum'
import { planPractice, practiceRecommendations } from '../../src/domain/practice-plan'
import type { PracticePlanInput } from '../../src/domain/practice-plan'
import type { AttemptEvent, ReviewState } from '../../src/domain/models'
import { scheduleReview } from '../../src/domain/review'

const now = new Date('2026-10-21T12:00:00.000Z')
function attempt(exerciseId: string, overrides: Partial<AttemptEvent> = {}): AttemptEvent {
  const exercise = exercises.find((entry) => entry.id === exerciseId)!
  return {
    eventId: crypto.randomUUID(),
    deviceId: crypto.randomUUID(),
    sessionId: crypto.randomUUID(),
    exerciseId,
    exerciseVersion: exercise.version,
    conceptIds: exercise.conceptIds,
    createdAt: '2026-10-20T10:00:00.000Z',
    correct: false,
    hints: 0,
    answer: 'test',
    normalizedAnswer: 'test',
    durationMs: 100,
    ...overrides,
  }
}
function state(exerciseId: string, due: string): ReviewState {
  return {
    exerciseId,
    lastEventId: crypto.randomUUID(),
    card: { ...scheduleReview(undefined, 3, now).after, due },
  }
}
function plan(overrides: Partial<PracticePlanInput> = {}) {
  return planPractice({
    concepts,
    exercises,
    topics,
    lessons,
    attempts: [],
    reviewStates: [],
    completions: [],
    now,
    ...overrides,
  })
}

describe('explainable practice selection', () => {
  it('keeps unknown concepts unknown and begins with the curated foundation order', () => {
    expect(practiceRecommendations(concepts, [])).toEqual([])
    const selected = plan()
    expect(selected).toHaveLength(5)
    expect(selected.slice(0, 2).map((item) => item.exercise.id)).toEqual([
      'unit-current',
      'voltage-symbol',
    ])
    expect(
      selected.every((item) => item.exercise.topicId === 'basics' && item.kind === 'new'),
    ).toBe(true)
  })
  it('shows the real sample and treats a hinted correct answer as assisted', () => {
    const entries = [attempt('ohm-current'), attempt('ohm-resistance', { correct: true, hints: 1 })]
    const recommendation = practiceRecommendations(concepts, entries)[0]!
    expect(recommendation.conceptId).toBe('ohm-law')
    expect(recommendation.score).toBe(0)
    expect(recommendation.explanation).toContain('0 von 2 Versuchen ohne Hinweis richtig')
    expect(recommendation.explanation).toContain('Erste Anhaltspunkte')
  })
  it('uses only the latest twenty chronological attempts without mutating history', () => {
    const entries = Array.from({ length: 21 }, (_, i) =>
      attempt('ohm-current', {
        correct: i > 0,
        createdAt: new Date(now.getTime() - (21 - i) * 1000).toISOString(),
      }),
    ).reverse()
    const original = structuredClone(entries)
    expect(practiceRecommendations(concepts, entries)).toEqual([])
    plan({ attempts: entries })
    expect(entries).toEqual(original)
  })
  it('puts overdue facts first, ordered by due time, regardless of prerequisites', () => {
    const selected = plan({
      reviewStates: [
        state('ammeter', '2026-10-20T12:00:00.000Z'),
        state('voltmeter', '2026-10-19T12:00:00.000Z'),
      ],
    })
    expect(selected.slice(0, 2).map((item) => item.exercise.id)).toEqual(['voltmeter', 'ammeter'])
    expect(selected[0]?.kind).toBe('due')
    expect(selected[0]?.explanation).toContain('eigenen Erinnerungsbewertung')
  })
  it('does not bring a future memory card forward after an incorrect or hinted attempt', () => {
    const selected = plan({
      conceptId: 'units',
      attempts: [attempt('unit-current'), attempt('voltage-symbol', { correct: true, hints: 1 })],
      reviewStates: [
        state('unit-current', '2026-10-22T12:00:00.000Z'),
        state('voltage-symbol', '2026-10-22T12:00:00.000Z'),
      ],
      limit: 100,
    })
    expect(selected.map((item) => item.exercise.id)).not.toContain('unit-current')
    expect(selected.map((item) => item.exercise.id)).not.toContain('voltage-symbol')
  })
  it('respects read prerequisites for unseen mixed content and permits an explicit topic', () => {
    expect(plan({ limit: 100 }).some((item) => item.exercise.topicId === 'ohm')).toBe(false)
    expect(
      plan({
        completions: [{ lessonId: 'quantities', completedAt: now.toISOString() }],
        limit: 100,
      }).some((item) => item.exercise.topicId === 'ohm'),
    ).toBe(true)
    expect(
      plan({ topicId: 'measurement' }).every((item) => item.exercise.topicId === 'measurement'),
    ).toBe(true)
  })
  it('offers an unseen variation of the target concept before repeating a failed application', () => {
    const selected = plan({ conceptId: 'ohm-law', attempts: [attempt('ohm-current')] })
    expect(selected[0]?.exercise.id).toBe('ohm-resistance')
    expect(selected.map((item) => item.exercise.id)).toContain('ohm-voltage')
    expect(selected.map((item) => item.exercise.id)).not.toContain('ohm-current')
    expect(selected[0]?.explanation).toContain('0 von 1 Versuch')
    expect(selected.every((item) => item.exercise.conceptIds.includes('ohm-law'))).toBe(true)
  })
  it('still addresses a recent application error when the aggregate quote is high', () => {
    const history = Array.from({ length: 9 }, () => attempt('ohm-current', { correct: true }))
    history.push(attempt('ohm-current', { createdAt: now.toISOString() }))
    const selected = plan({ conceptId: 'ohm-law', attempts: history })
    expect(selected[0]?.exercise.id).toBe('ohm-current')
    expect(selected[0]?.explanation).toContain('letzten Versuch')
  })
  it('returns an empty plan if the only targeted facts are scheduled for the future', () => {
    expect(
      plan({
        conceptId: 'power',
        exercises: exercises.filter((exercise) => exercise.id === 'power-unit'),
        reviewStates: [state('power-unit', '2026-10-22T12:00:00.000Z')],
      }),
    ).toEqual([])
  })
  it('does not change the FSRS cards and prefers older successful application practice', () => {
    const cards = [state('power-unit', '2026-10-22T12:00:00.000Z')]
    const original = structuredClone(cards)
    const selected = plan({
      topicId: 'ohm',
      exercises: exercises.filter((exercise) =>
        ['ohm-current', 'ohm-resistance'].includes(exercise.id),
      ),
      attempts: [
        attempt('ohm-current', { correct: true, createdAt: now.toISOString() }),
        attempt('ohm-resistance', { correct: true }),
      ],
      reviewStates: cards,
    })
    expect(selected[0]?.exercise.id).toBe('ohm-resistance')
    expect(cards).toEqual(original)
  })
})
