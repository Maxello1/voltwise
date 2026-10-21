import { describe, expect, it } from 'vitest'
import { parallelCircuit } from '../../src/domain/electrical'
import { parallelDemo } from '../../src/content/circuit'
import { validateCircuit } from '../../src/schematics/validation'
import type { CircuitDefinition } from '../../src/schematics/model'

describe('verified 24 V parallel circuit', () => {
  it('solves branches, equivalent resistance and total power', () => {
    const actual = parallelCircuit(24, [100, 200])
    expect(actual.branchCurrents[0]).toBeCloseTo(0.24, 12)
    expect(actual.branchCurrents[1]).toBeCloseTo(0.12, 12)
    expect(actual.totalCurrent).toBeCloseTo(0.36, 12)
    expect(actual.equivalentResistance).toBeCloseTo(200 / 3, 12)
    expect(actual.totalPower).toBeCloseTo(8.64, 12)
    expect(actual.totalPower).toBeCloseTo(
      actual.branchCurrents.reduce((sum, i, index) => sum + i * i * [100, 200][index]!, 0),
      12,
    )
  })
  it.each([
    [24, []],
    [24, [0]],
    [24, [-1]],
    [NaN, [100]],
    [24, [Infinity]],
  ] as [number, number[]][])('rejects unsupported physical input', (voltage, resistances) => {
    expect(() => parallelCircuit(voltage, resistances)).toThrow()
  })
  it('validates every endpoint, net and junction in the demo', () => {
    expect(validateCircuit(parallelDemo)).toEqual([])
  })
  it('rejects nonexistent terminal and net references', () => {
    const broken = structuredClone(parallelDemo)
    broken.nets[0]!.terminals.push('missing.terminal')
    broken.wires[0]!.netId = 'missing-net'
    expect(validateCircuit(broken).join(' ')).toContain('Unbekannter Anschluss')
    expect(validateCircuit(broken).join(' ')).toContain('Unbekanntes Netz')
  })
  it('rejects diagonal routing, off-grid points, duplicate and disconnected terminals', () => {
    const broken = structuredClone(parallelDemo)
    broken.wires[0]!.points[1] = [127, 60]
    broken.nets[0]!.terminals.push('r1.a')
    broken.wires = broken.wires.filter((wire) => wire.id !== 'wp2')
    const errors = validateCircuit(broken).join(' ')
    expect(errors).toContain('Raster')
    expect(errors).toContain('orthogonale')
    expect(errors).toContain('Doppelter Anschluss')
    expect(errors).toContain('nicht durch Leitungen verbunden')
  })
  it('keeps crossing wires in distinct nets without inventing a junction', () => {
    const circuit: CircuitDefinition = {
      ...parallelDemo,
      components: [
        [40, 100],
        [160, 100],
        [100, 40],
        [100, 160],
      ].map((point, index) => ({
        id: `c${index}`,
        kind: 'ground',
        designator: `X${index}`,
        label: '',
        position: point as [number, number],
        rotation: 0,
        properties: {},
        terminals: [{ id: `t${index}`, role: 'test', offset: [0, 0] }],
      })),
      nets: [
        { id: 'horizontal', terminals: ['t0', 't1'] },
        { id: 'vertical', terminals: ['t2', 't3'] },
      ],
      junctions: [],
      wires: [
        {
          id: 'h',
          netId: 'horizontal',
          from: 't0',
          to: 't1',
          points: [
            [40, 100],
            [160, 100],
          ],
        },
        {
          id: 'v',
          netId: 'vertical',
          from: 't2',
          to: 't3',
          points: [
            [100, 40],
            [100, 160],
          ],
        },
      ],
    }
    expect(validateCircuit(circuit)).toEqual([])
    circuit.junctions.push({ id: 'ambiguous', point: [100, 100], netId: 'horizontal' })
    expect(validateCircuit(circuit).join(' ')).toContain('anderes Netz')
  })
})
