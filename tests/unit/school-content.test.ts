import { expect, it } from 'vitest'
import { schoolExercises, schoolLessons, schoolTopics } from '../../src/content/school-curriculum'
import {
  schoolProblem,
  schoolRound,
  schoolTemplateNames,
  resolveSchoolProblem,
  type SchoolArea,
} from '../../src/domain/school-practice'
import { answerLabel, gradeExercise } from '../../src/domain/grading'
import { schoolApplicationAnswers } from '../fixtures/school-answers'
import { gradeApplication, validApplicationSpec } from '../../src/domain/application'

it('ships 15 original school lessons and 75 useful tasks with provenance and applied formats', () => {
  expect(schoolLessons).toHaveLength(15)
  expect(schoolTopics).toHaveLength(15)
  expect(schoolExercises).toHaveLength(75)
  expect(schoolExercises.filter((e) => e.type === 'application')).toHaveLength(15)
  expect(schoolExercises.filter((e) => !e.provenance)).toEqual([])
  expect(schoolTopics.filter((t) => t.area === 'SPS-Grundlagen').every((t) => !t.lab)).toBe(true)
  expect(schoolExercises.filter((e) => e.explanation.length <= 40).map((e) => e.id)).toEqual([])
})
it('grades independent references for every new structured application and rejects plausible mistakes', () => {
  for (const exercise of schoolExercises)
    if (exercise.type === 'application') {
      const fixture = schoolApplicationAnswers[exercise.id]
      expect(fixture, exercise.id).toBeDefined()
      expect(gradeExercise(exercise, JSON.stringify(fixture)), exercise.id).toMatchObject({
        correct: true,
      })
      expect(gradeExercise(exercise, '{broken').invalid).toBeTruthy()
      expect(
        gradeExercise(exercise, JSON.stringify({ ...fixture, version: 2 })).invalid,
      ).toBeTruthy()
      expect(exercise.reviewable).toBe(false)
      if (exercise.activity.kind === 'numeric-steps') {
        const altered = structuredClone(fixture) as { values: Record<string, string> }
        altered.values.s0 = '999999 V'
        expect(gradeExercise(exercise, JSON.stringify(altered)).correct).toBe(false)
      }
    }
  const spec = {
    kind: 'phasor' as const,
    magnitude: 30.4138126515,
    angleDegrees: 25.284996046,
    magnitudeTolerance: 0.3,
    angleTolerance: 1,
  }
  expect(
    gradeApplication(spec, JSON.stringify({ version: 1, kind: 'phasor', x: 35, y: 0 })).correct,
  ).toBe(false)
  expect(
    gradeApplication(spec, JSON.stringify({ version: 1, kind: 'phasor', x: 27.5, y: 12.990381 }))
      .correct,
  ).toBe(true)
})
it('rejects malformed authored references and pins the released generator families', () => {
  expect(validApplicationSpec({ kind: 'motor-parts', partId: 'missing' })).toBe(false)
  expect(
    validApplicationSpec({
      kind: 'phasor',
      magnitude: NaN,
      angleDegrees: 0,
      magnitudeTolerance: 1,
      angleTolerance: 1,
    }),
  ).toBe(false)
  expect(
    validApplicationSpec({ kind: 'waveform', amplitude: -1, frequencyHz: 0, phaseDegrees: 0 }),
  ).toBe(false)
  expect(validApplicationSpec({ kind: 'numeric-steps', steps: [] })).toBe(false)
  const fixtures = (['ac', 'motor', 'plc'] as const).flatMap((area) =>
    schoolRound(area, '000000').map((e) => (e.type === 'numeric' ? [e.id, e.answer, e.unit] : [])),
  )
  expect(fixtures).toMatchInlineSnapshot(`
    [
      [
        "ac1-period-000000",
        0.005,
        "s",
      ],
      [
        "ac1-frequency-000000",
        25,
        "Hz",
      ],
      [
        "ac1-angle-000000",
        27.000000000000004,
        "°",
      ],
      [
        "ac1-rms-000000",
        16.97056274847714,
        "V",
      ],
      [
        "ac1-peak-000000",
        0.28284271247461906,
        "A",
      ],
      [
        "ac1-instant-000000",
        7.416407864998737,
        "V",
      ],
      [
        "ac1-inductive-000000",
        15.707963267948967,
        "Ω",
      ],
      [
        "ac1-capacitive-000000",
        31.830988618379067,
        "Ω",
      ],
      [
        "ac1-current-000000",
        0.4,
        "A",
      ],
      [
        "ac1-vector-000000",
        31.224989991991993,
        "V",
      ],
      [
        "motor1-force-000000",
        0.02,
        "N",
      ],
      [
        "motor1-torque-000000",
        0.0064,
        "N·m",
      ],
      [
        "motor1-armature-000000",
        3,
        "A",
      ],
      [
        "motor1-startup-000000",
        3,
        "A",
      ],
      [
        "plc1-load-000000",
        0,
        "W",
      ],
      [
        "plc1-margin-000000",
        0,
        "W",
      ],
    ]
  `)
})
it('pins independent curated numeric reference values, including the force-count and reactive-power signs', () => {
  const references: Record<string, number> = {
    'period-50': 1 / 50,
    'frequency-4ms': 1000 / 4,
    'angle-1ms': (360 * 50) / 1000,
    'instant-325': 325 * Math.sin(Math.PI / 10),
    'rms-325': 325 / Math.sqrt(2),
    'peak-24': 24 * Math.sqrt(2),
    'current-rms': Math.sqrt(2),
    'vector-sum': Math.sqrt(925),
    'opposite-vectors': 7,
    'r-current': 24 / 120,
    'r-power': 24 ** 2 / 120,
    'l-reactance': 10 * Math.PI,
    'l-current': 24 / 40,
    'c-reactance': 100 / Math.PI,
    'c-unit': 47 / 1e6,
    'force-reference': 0.048,
    'force-angle': 0.024,
    'single-torque': 0.00096,
    'neutral-torque': 0,
    startup: 12,
    'running-current': 2,
    'load-nine': 9000,
    'load-twelve': 12000,
  }
  for (const e of schoolExercises)
    if (e.type === 'numeric') {
      const key = e.id.slice('school-'.length, -'-v1'.length)
      expect(references[key], key).toBeDefined()
      expect(e.answer, e.id).toBeCloseTo(references[key]!, 9)
      expect(gradeExercise(e, answerLabel(e)).correct).toBe(true)
      expect(
        gradeExercise(e, `${e.answer + Math.max(Math.abs(e.answer), 1)} ${e.unit}`).correct,
      ).toBe(false)
    }
})

function independent(area: SchoolArea, name: string, prompt: string): number {
  const values = [...prompt.matchAll(/(?<![A-Za-zÄ-ü0-9])[-+]?\d+(?:[.,]\d+)?/gu)].map((m) =>
    Number(m[0].replace(',', '.')),
  )
  const [a = 0, b = 0, c = 0, d = 0] = values
  if (area === 'ac')
    switch (name) {
      case 'period':
        return 1 / a
      case 'frequency':
        return 1000 / a
      case 'angle':
        return 0.36 * a * b
      case 'rms':
        return a / Math.sqrt(2)
      case 'peak':
        return a * Math.sqrt(2)
      case 'instant':
        return a * Math.sin((2 * Math.PI * b * d) / 1000)
      case 'inductive':
        return (2 * Math.PI * a * b) / 1000
      case 'capacitive':
        return 1e6 / (2 * Math.PI * a * b)
      case 'current':
        return a / b
      case 'vector':
        return Math.sqrt(a * a + c * c + 2 * a * c * Math.cos((d * Math.PI) / 180))
    }
  if (area === 'motor')
    switch (name) {
      case 'force':
        return (a * b * c) / 100
      case 'torque':
        return (2 * a * c) / 100
      case 'armature':
        return (a - b) / c
      case 'startup':
        return a / b
    }
  const bits = / = ([01]{4})/.exec(prompt)![1]!
  const powers = [7, 5, 3, 2]
  const kw = [...bits].reduce((sum, bit, i) => sum + (bit === '0' ? powers[i]! : 0), 0)
  return (name === 'margin' ? 10 - kw : kw) * 1000
}
it('freezes all 16 generated families with independent arithmetic over 128 codes and old-version rejection', () => {
  const names = (['ac', 'motor', 'plc'] as const).flatMap((area) =>
    schoolTemplateNames(area).map((name) => [area, name] as const),
  )
  expect(names).toHaveLength(16)
  for (let i = 0; i < 128; i++) {
    const code = ((i * 7919) % 1000000).toString().padStart(6, '0')
    for (const [area, name] of names) {
      const e = schoolProblem(area, name, code)!
      if (e.type !== 'numeric') throw new Error('Expected numeric template')
      expect(e.answer, e.id).toBeCloseTo(independent(area, name, e.prompt), 8)
      expect(Number.isFinite(e.answer)).toBe(true)
      expect(resolveSchoolProblem(e.id)).toEqual(e)
      expect(gradeExercise(e, answerLabel(e)).correct, e.id).toBe(true)
      expect(e.reviewable).toBe(false)
    }
  }
  expect(schoolRound('ac', '000000')).toHaveLength(10)
  for (const id of [
    'ac2-rms-000000',
    'motor1-force-12345',
    'plc1-unknown-123456',
    'ac1-unknown-000000',
  ])
    expect(resolveSchoolProblem(id)).toBeUndefined()
  expect(() => schoolRound('motor', 'bad')).toThrow()
})
