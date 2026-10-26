import { describe, expect, it } from 'vitest'
import {
  addPhasors,
  angleAtTime,
  angularDistance,
  angularFrequency,
  capacitiveReactance,
  degrees,
  endpointPhasor,
  frequency,
  idealAc,
  inductiveReactance,
  peak,
  period,
  phasorComponents,
  radians,
  rms,
  sineValue,
} from '../../src/domain/ac'
import {
  armatureCurrent,
  counterEmf,
  excitationNets,
  excitationTypes,
  lorentzForce,
  motorParts,
  motorState,
  torque,
} from '../../src/domain/dc-motor'
import { evaluateLogic, inputIds, validateLogicGraph } from '../../src/domain/boolean-logic'
import {
  checkGeneratorGraph,
  generatorCases,
  generatorMotors,
  generatorState,
  inputsFromBits,
  referenceFup,
} from '../../src/domain/plc-generator'
import { parseQuantity } from '../../src/domain/units'

describe('AC SI mathematics and sine-reference convention', () => {
  it('checks independent classroom time, RMS and instantaneous fixtures', () => {
    expect(period(50)).toBe(0.02)
    expect(frequency(0.004)).toBe(250)
    expect(angularFrequency(50)).toBeCloseTo(314.1592653589793)
    expect(degrees(angleAtTime(50, 0.001))).toBeCloseTo(18)
    expect(radians(180)).toBeCloseTo(Math.PI)
    expect(degrees(Math.PI / 2)).toBeCloseTo(90)
    expect(rms(325)).toBeCloseTo(229.8097038856)
    expect(peak(24)).toBeCloseTo(33.94112549695)
    expect(sineValue({ amplitude: 325, frequencyHz: 50, phaseDegrees: 0 }, 0.001)).toBeCloseTo(
      100.43052317185,
    )
    expect(sineValue({ amplitude: 100, frequencyHz: 50, phaseDegrees: 90 }, 0)).toBeCloseTo(100)
  })
  it('adds model-coordinate vectors with the same frequency and a defined zero-vector convention', () => {
    const sum = addPhasors(
      { magnitude: 20, angleDegrees: 0, frequencyHz: 50 },
      { magnitude: 15, angleDegrees: 60, frequencyHz: 50 },
    )
    expect(sum.x).toBeCloseTo(27.5)
    expect(sum.y).toBeCloseTo(12.99038105676658)
    expect(sum.magnitude).toBeCloseTo(30.4138126514911)
    expect(sum.angleDegrees).toBeCloseTo(25.284996046051788)
    expect(endpointPhasor(-3, 4).magnitude).toBe(5)
    expect(phasorComponents({ magnitude: 5, angleDegrees: 180, frequencyHz: 50 }).x).toBeCloseTo(-5)
    expect(
      addPhasors(
        { magnitude: 5, angleDegrees: 0, frequencyHz: 50 },
        { magnitude: 5, angleDegrees: 180, frequencyHz: 50 },
      ).angleDegrees,
    ).toBe(0)
    expect(angularDistance(-179, 179)).toBe(2)
    expect(angularDistance(0, 360)).toBe(0)
    expect(() =>
      addPhasors(
        { magnitude: 1, angleDegrees: 0, frequencyHz: 50 },
        { magnitude: 1, angleDegrees: 0, frequencyHz: 60 },
      ),
    ).toThrow('dieselbe Frequenz')
  })
  it.each(['R', 'L', 'C'] as const)(
    'keeps %s equations, phase and waveform projections consistent',
    (component) => {
      const value = component === 'R' ? 120 : component === 'L' ? 0.1 : 100e-6
      const model = idealAc(component, 50, 24, value),
        doubled = idealAc(component, 100, 24, value)
      expect(model.currentPhaseDegrees).toBe(component === 'R' ? 0 : component === 'L' ? -90 : 90)
      expect(doubled.currentRms / model.currentRms).toBeCloseTo(
        component === 'R' ? 1 : component === 'L' ? 0.5 : 2,
      )
      expect(model.currentRms).toBeCloseTo(
        component === 'R' ? 0.2 : component === 'L' ? 0.763943726841 : 0.753982236861,
      )
      expect(model.activePowerW).toBeCloseTo(component === 'R' ? 4.8 : 0)
      expect(model.reactivePowerVar).toBeCloseTo(
        component === 'R' ? 0 : component === 'L' ? 18.334649444186 : -18.095573684677,
      )
      const signal = {
        amplitude: peak(model.currentRms),
        frequencyHz: 50,
        phaseDegrees: model.currentPhaseDegrees,
      }
      for (const t of [0, 0.001, 0.005, 0.01, 0.02]) {
        const angle = 100 * Math.PI * t + (model.currentPhaseDegrees * Math.PI) / 180
        expect(sineValue(signal, t)).toBeCloseTo(model.currentRms * Math.SQRT2 * Math.sin(angle))
      }
    },
  )
  it('rejects unsupported frequency, component, magnitude and non-finite cases', () => {
    for (const invalid of [0, -1, NaN, Infinity]) {
      expect(() => period(invalid)).toThrow()
      expect(() => frequency(invalid)).toThrow()
      expect(() => idealAc('L', 50, 24, invalid)).toThrow()
      expect(() => capacitiveReactance(invalid, 1e-4)).toThrow()
    }
    expect(() => inductiveReactance(50, 0)).toThrow()
    expect(() => radians(Infinity)).toThrow()
    expect(() => sineValue({ amplitude: -1, frequencyHz: 50, phaseDegrees: 0 }, 0)).toThrow()
    expect(() => capacitiveReactance(1e-300, 1e-300)).toThrow()
  })
})

describe('motor geometry, signs and bounded armature model', () => {
  it('checks independent force, one-force torque, full-loop torque and current fixtures', () => {
    expect(lorentzForce(0.8, 2, 0.03)).toBeCloseTo(0.048)
    expect(lorentzForce(0.8, 2, 0.03, 30)).toBeCloseTo(0.024)
    expect(lorentzForce(0.8, 2, 0.03, 0)).toBe(0)
    expect(torque(0.048, 0.02)).toBeCloseTo(0.00096)
    expect(motorState(0).torqueNm).toBeCloseTo(0.00192)
    expect(armatureCurrent(24, 0, 2)).toBe(12)
    expect(armatureCurrent(24, 20, 2)).toBe(2)
    expect(armatureCurrent(24, 28, 2)).toBe(-2)
    expect(counterEmf(2, 0.1, 100)).toBeCloseTo(20)
    expect(() => armatureCurrent(24, 0, 0)).toThrow()
  })
  it('checks every rotor degree against an independent cross-product torque and both reversals', () => {
    for (let angle = 0; angle < 360; angle++) {
      const s = motorState(angle),
        uncommutated = motorState(angle, { commutated: false })
      expect(Math.hypot(s.x, s.y)).toBeCloseTo(1)
      expect(s.torqueNm).toBeCloseTo(0.00192 * Math.abs(Math.cos((angle * Math.PI) / 180)))
      expect(uncommutated.torqueNm).toBeCloseTo(0.00192 * Math.cos((angle * Math.PI) / 180))
      expect(motorState(angle, { fieldPolarity: -1 }).torqueNm).toBeCloseTo(-s.torqueNm)
      expect(motorState(angle, { supplyPolarity: -1 }).forceDirection).toBe(-s.forceDirection)
      expect(s.torqueNm).toBeCloseTo(2 * 0.02 * s.forceN * s.forceDirection * s.x)
    }
    expect(motorState(89).currentDirection).toBe(1)
    expect(motorState(90).currentDirection).toBe(0)
    expect(motorState(91).currentDirection).toBe(-1)
    expect(motorState(270).neutral).toBe(true)
    expect(motorState(271).currentDirection).toBe(1)
  })
  it('declares selectable components and five distinct explicit excitation topologies', () => {
    expect(new Set(motorParts.map((p) => p.id)).size).toBe(7)
    const topologies = excitationTypes.map(excitationNets)
    expect(new Set(topologies.map((t) => JSON.stringify(t))).size).toBe(5)
    for (const nets of topologies) {
      const terminals = nets.flat()
      expect(new Set(terminals).size).toBe(terminals.length)
      expect(terminals).toEqual(expect.arrayContaining(['U+', 'U-', 'A1', 'A2']))
    }
    expect(excitationNets('Doppelschluss')).toEqual([
      ['U+', 'D1', 'F1'],
      ['D2', 'A1'],
      ['A2', 'F2', 'U-'],
    ])
  })
})

describe('SPS theory oracle (no hardware or SPS laboratory)', () => {
  const oracle: [string, number, boolean][] = [
    ['1111', 0, true],
    ['1110', 2, true],
    ['1101', 3, true],
    ['1100', 5, true],
    ['1011', 5, true],
    ['1010', 7, true],
    ['1001', 8, true],
    ['1000', 10, false],
    ['0111', 7, true],
    ['0110', 9, true],
    ['0101', 10, false],
    ['0100', 12, false],
    ['0011', 12, false],
    ['0010', 14, false],
    ['0001', 15, false],
    ['0000', 17, false],
  ]
  it.each(oracle)('matches the explicit independent table for %s', (bits, kw, output) => {
    const state = generatorState(bits)
    expect(state.totalKw).toBe(kw)
    expect(state.indicator).toBe(output)
    expect(evaluateLogic(referenceFup, inputsFromBits(bits)).output).toBe(output)
    expect(state.motors.map((m) => m.running)).toEqual([...bits].reverse().map((b) => b === '0'))
  })
  it('covers all cases, addresses and equivalent logic; rejects invalid terminals and cycles', () => {
    expect(generatorCases().map((c) => [c.bits, c.totalKw, c.indicator])).toEqual(oracle)
    expect(generatorMotors.map((m) => m.address)).toEqual(inputIds)
    expect(checkGeneratorGraph(referenceFup)).toEqual([])
    const alternative = structuredClone(referenceFup)
    alternative.blocks[0]!.inputs.reverse()
    expect(checkGeneratorGraph(alternative)).toEqual([])
    expect(() => inputsFromBits('101')).toThrow()
    expect(() =>
      validateLogicGraph({
        version: 1,
        blocks: [{ id: 'b1', kind: 'NOT', inputs: ['b1.Q'] }],
        output: 'b1.Q',
      }),
    ).toThrow('Zyklus')
    expect(() => validateLogicGraph({ version: 1, blocks: [], output: 'E24.4' })).toThrow(
      'Ausgangsanschluss',
    )
    expect(() =>
      validateLogicGraph({
        version: 1,
        blocks: [{ id: 'b1', kind: 'AND', inputs: ['E24.0'] }],
        output: 'b1.Q',
      }),
    ).toThrow('Anzahl')
    for (const a of [false, true])
      for (const b of [false, true])
        for (const kind of ['AND', 'OR', 'NOT'] as const) {
          const graph = {
            version: 1,
            blocks: [{ id: 'b1', kind, inputs: kind === 'NOT' ? ['E24.0'] : ['E24.0', 'E24.1'] }],
            output: 'b1.Q',
          }
          expect(
            evaluateLogic(graph, { 'E24.0': a, 'E24.1': b, 'E24.2': false, 'E24.3': false }).output,
          ).toBe(kind === 'AND' ? a && b : kind === 'OR' ? a || b : !a)
        }
  })
})

it.each([
  ['20 ms', 's', 0.02],
  ['180°', 'rad', Math.PI],
  ['3,141592653589793 rad', '°', 180],
  ['100 mH', 'H', 0.1],
  ['47 µF', 'F', 47e-6],
  ['47000 nF', 'F', 47e-6],
  ['800 mT', 'T', 0.8],
  ['48 mN', 'N', 0.048],
  ['1,92 mN·m', 'N·m', 0.00192],
  ['-1,2 kvar', 'var', -1200],
] as const)('converts %s while keeping quantity dimensions separate', (answer, unit, value) => {
  expect(parseQuantity(answer, unit).value).toBeCloseTo(value, 12)
  expect(parseQuantity(answer, 'V').error).toBeTruthy()
})
