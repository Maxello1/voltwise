import { describe, expect, it } from 'vitest'
import { gradeExercise, parseQuantity } from '../../src/domain/grading'
import { exercises, exerciseById } from '../../src/content/curriculum'
import { schoolApplicationAnswers } from '../fixtures/school-answers'

describe('locale-aware quantity grading', () => {
  it.each(['0,36', '0.36 A', '360 mA', '3,6e-1 A', '360000 µA'])(
    'normalizes %s to amperes',
    (input) => {
      expect(parseQuantity(input, 'A')).toEqual({ value: 0.36 })
    },
  )
  it.each([
    '',
    'abc',
    '1.000,5 A',
    '1,000.5 A',
    'Infinity',
    '1/2 A',
    '0,36 V',
    '2 MA',
    '1e999 A',
    '0,36m',
  ])('rejects invalid or incompatible %s', (input) => {
    expect(parseQuantity(input, 'A').error).toBeTruthy()
  })
  it('converts kiloohms and respects SI case', () => {
    expect(parseQuantity('0,6 kΩ', 'Ω')).toEqual({ value: 600 })
    expect(parseQuantity('1 MΩ', 'Ω')).toEqual({ value: 1000000 })
    expect(parseQuantity('1 mΩ', 'Ω').error).toBeTruthy()
  })
  it('applies tolerance in base units', () => {
    const exercise = exerciseById.get('parallel-equivalent')!
    expect(gradeExercise(exercise, '66,67 Ω').correct).toBe(true)
    expect(gradeExercise(exercise, '66,6 Ω').correct).toBe(false)
    expect(gradeExercise(exercise, '100 W').invalid).toBeTruthy()
  })
  it('checks recalled content without revealing the answer first', () => {
    const exercise = exerciseById.get('voltage-symbol')!
    expect(gradeExercise(exercise, ' u ').correct).toBe(true)
    expect(gradeExercise(exercise, 'V').correct).toBe(false)
  })
  it.each(['Ohm (Ω)', '  OHM ( Ω )!!  ', 'Ω (Ohm)', 'Ohm...'])(
    'accepts consistent declared word/symbol aliases: %s',
    (answer) => {
      expect(gradeExercise(exerciseById.get('resistance-unit')!, answer).correct).toBe(true)
    },
  )
  it.each(['Ohm (V)', 'nicht Ohm', 'Ohm oder Volt', 'Volt (Ω)', 'Ohmm'])(
    'does not guess the meaning of an ambiguous or incorrect recall: %s',
    (answer) => {
      expect(gradeExercise(exerciseById.get('resistance-unit')!, answer).correct).toBe(false)
    },
  )
  it('accepts Unicode compatibility text but rejects punctuation-only answers without an attempt', () => {
    expect(gradeExercise(exerciseById.get('voltage-symbol')!, 'Ｕ').correct).toBe(true)
    expect(gradeExercise(exerciseById.get('voltage-symbol')!, '...').invalid).toBeTruthy()
  })
  it('provides unique, explained exercises and all declared answers grade correctly', () => {
    expect(exercises.length).toBeGreaterThanOrEqual(12)
    expect(new Set(exercises.map((e) => e.id)).size).toBe(exercises.length)
    for (const exercise of exercises) {
      // Interactive submissions require a recorded investigation; their independent paths live in diagnostics.test.ts.
      if (exercise.type === 'diagnostic') continue
      const answer =
        exercise.type === 'application'
          ? JSON.stringify(schoolApplicationAnswers[exercise.id])
          : exercise.type === 'numeric'
            ? `${exercise.answer} ${exercise.unit}`
            : exercise.type === 'recall'
              ? exercise.aliases[0]!
              : exercise.answer
      expect(gradeExercise(exercise, answer).correct, exercise.id).toBe(true)
      expect(exercise.explanation.length).toBeGreaterThan(40)
    }
  })
})
