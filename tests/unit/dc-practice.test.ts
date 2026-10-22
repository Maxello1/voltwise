import { describe, expect, it } from 'vitest'
import {
  createDcProblem,
  createDcRound,
  dcNumber,
  dcTemplates,
  resolveDcProblem,
} from '../../src/domain/dc-practice'
import { gradeExercise, answerLabel } from '../../src/domain/grading'
import { resolveExercise } from '../../src/content/exercise-catalogue'
import { resolvePracticeCircuit } from '../../src/content/practice-circuits'
import { parallelDemo } from '../../src/content/circuit'
import { seriesDemo } from '../../src/content/circuits/dc'
import { validateCircuit } from '../../src/schematics/validation'
import { validateCurriculum } from '../../src/content/validation'
import { concepts, lessons, subject, topics } from '../../src/content/curriculum'

describe('versioned DC practice rounds', () => {
  it('pins v1 round 000000 to independently checked reference values', () => {
    const round = createDcRound('000000')
    expect(round.map((exercise) => exercise.id)).toEqual(
      dcTemplates.map((template) => `dc1-${template}-000000`),
    )
    expect(round.map((exercise) => exercise.answer)).toEqual([
      12 / 1200,
      18 / 0.02,
      18 * 0.005,
      48 / (330 + 150),
      24 / 150 + 24 / 100,
    ])
    expect(round[0]!.prompt).toContain('1200 Ω')
    expect(round[3]!.prompt).toContain('48 V')
    expect(round[4]!.prompt).toContain('150 Ω')
  })
  it('pins a second seed and reproduces the full task from only its persisted ID', () => {
    const round = createDcRound('123456')
    expect(round.map((exercise) => exercise.answer)).toEqual([
      48 / 1200,
      36 / 0.04,
      36 * 0.03,
      12 / (330 + 100),
      9 / 150 + 9 / 150,
    ])
    for (const exercise of round) expect(resolveExercise(exercise.id)).toEqual(exercise)
    expect(createDcRound('123456')).toEqual(round)
    expect(createDcRound('999999')).not.toEqual(round)
  })
  it.each(['', '12345', '1234567', '-12345', '1e0000', '12.345', '１２３４５６', ' 123456'])(
    'rejects invalid code %s instead of silently changing the problem',
    (code) => {
      expect(() => createDcRound(code)).toThrow('sechs Ziffern')
    },
  )
  it.each([
    'dc2-ohm-current-123456',
    'dc1-unrecognized-123456',
    'dc1-ohm-current-1',
    'dc1-power-123456-extra',
    'unknown',
  ])('rejects unknown versions and malformed persisted IDs: %s', (id) => {
    expect(resolveExercise(id)).toBeUndefined()
  })
  it('checks parameter bounds, independent equations, rounding and misleading answers over 512 seeds', () => {
    for (let index = 0; index < 512; index++) {
      const code = String((index * 7919) % 1000000).padStart(6, '0')
      const round = createDcRound(code)
      expect(new Set(round.map((exercise) => exercise.id)).size).toBe(5)
      expect(validateCurriculum({ subject, topics, concepts, lessons, exercises: round })).toEqual(
        [],
      )
      for (const exercise of round) {
        const problem = resolveDcProblem(exercise.id)!
        const {
          voltage: u,
          resistance: r1,
          secondResistance: r2,
          milliamperes: ma,
          template,
        } = problem
        expect(u).toBeGreaterThan(0)
        expect(u).toBeLessThanOrEqual(48)
        expect(r1).toBeGreaterThanOrEqual(100)
        expect(r2).toBeLessThanOrEqual(1200)
        const expected =
          template === 'ohm-current'
            ? u / r1
            : template === 'ohm-resistance'
              ? (u * 1000) / ma
              : template === 'power'
                ? (u * ma) / 1000
                : template === 'series-current'
                  ? u / (r1 + r2)
                  : (u * (r1 + r2)) / (r1 * r2)
        expect(exercise.answer).toBeCloseTo(expected, 10)
        expect(Number.isFinite(exercise.answer)).toBe(true)
        expect(exercise.reviewable).toBe(false)
        expect(gradeExercise(exercise, answerLabel(exercise)).correct).toBe(true)
        expect(gradeExercise(exercise, `${dcNumber(expected)} ${exercise.unit}`).correct).toBe(true)
        expect(gradeExercise(exercise, `${expected * 1.01} ${exercise.unit}`).correct).toBe(false)
        expect(gradeExercise(exercise, '0').correct).toBe(false)
        expect(gradeExercise(exercise, '1 Hz').invalid).toBeTruthy()
      }
    }
  })
  it('rebuilds diagrams with matching topology, labels, answers and power balance without mutating the library', () => {
    const original = structuredClone([seriesDemo, parallelDemo])
    for (const code of ['000000', '123456', '999999', '420021']) {
      for (const template of ['series-current', 'parallel-current'] as const) {
        const { exercise, voltage, resistance, secondResistance } = createDcProblem(template, code)
        const circuit = resolvePracticeCircuit(exercise.circuitId!)!
        if (circuit.simulationMode !== 'verified-static') throw new Error('Expected static DC')
        expect(validateCircuit(circuit)).toEqual([])
        expect(circuit.nominalVoltage).toBe(voltage)
        expect(circuit.components.find((component) => component.kind === 'source')?.label).toBe(
          `${voltage} V DC`,
        )
        expect(
          circuit.components.find((component) => component.id === 'r1')?.properties.resistance,
        ).toBe(resistance)
        expect(circuit.components.find((component) => component.id === 'r2')?.label).toBe(
          `${secondResistance} Ω`,
        )
        expect(circuit.validation.expected.totalCurrent).toBe(exercise.answer)
        const expectedPower =
          template === 'series-current'
            ? exercise.answer ** 2 * (resistance + secondResistance)
            : voltage ** 2 / resistance + voltage ** 2 / secondResistance
        expect(circuit.validation.expected.totalPower).toBeCloseTo(expectedPower, 10)
      }
    }
    expect([seriesDemo, parallelDemo]).toEqual(original)
    expect(resolvePracticeCircuit('dc1-power-000000')).toBeUndefined()
  })
})
