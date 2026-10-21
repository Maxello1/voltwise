import { describe, expect, it } from 'vitest'
import { circuitLibrary, circuitById } from '../../src/content/circuit-library'
import { exercises } from '../../src/content/curriculum'
import { parallelCircuit, seriesCircuit, unloadedVoltageDivider } from '../../src/domain/electrical'
import { validateCircuit } from '../../src/schematics/validation'
import { terminalPoint } from '../../src/schematics/model'

describe('curated DC circuit library', () => {
  it('ships five distinct, topologically valid circuits with linked practice', () => {
    expect(circuitLibrary).toHaveLength(5)
    expect(circuitById.size).toBe(5)
    for (const { circuit } of circuitLibrary) {
      expect(validateCircuit(circuit), circuit.id).toEqual([])
      expect(exercises.filter((e) => e.circuitId === circuit.id).length).toBeGreaterThanOrEqual(2)
      const source = circuit.components.find((c) => c.kind === 'source')!
      expect(source.properties.voltage).toBe(circuit.nominalVoltage)
      for (const component of circuit.components) {
        expect(component.position[0]).toBeGreaterThanOrEqual(0)
        expect(component.position[0]).toBeLessThanOrEqual(circuit.bounds.width)
        for (const terminal of component.terminals) {
          const [x, y] = terminalPoint(component, terminal.offset)
          expect(x % circuit.grid).toBe(0)
          expect(y % circuit.grid).toBe(0)
          expect(y).toBeGreaterThanOrEqual(0)
          expect(y).toBeLessThanOrEqual(circuit.bounds.height)
        }
      }
    }
  })
  it('links every circuit exercise to a real diagram and selectable answer', () => {
    for (const exercise of exercises.filter((e) => e.circuitId)) {
      const circuit = circuitById.get(exercise.circuitId!)
      expect(circuit, exercise.id).toBeDefined()
      if (exercise.type === 'schematic')
        expect(
          circuit!.components.some((c) => c.id === exercise.answer),
          exercise.id,
        ).toBe(true)
    }
  })
  it.each(circuitLibrary.map((entry) => [entry.circuit.id, entry.circuit] as const))(
    'checks source power and total resistance for %s from actual component values',
    (id, circuit) => {
      const loads = circuit.components
        .filter((c) => c.kind === 'resistor' || c.kind === 'lamp')
        .map((c) => Number(c.properties.resistance))
      const result =
        id === 'parallel-24v'
          ? parallelCircuit(circuit.nominalVoltage, loads)
          : seriesCircuit(circuit.nominalVoltage, loads)
      const expected = circuit.validation.expected
      expect(result.totalCurrent).toBeCloseTo(expected.totalCurrent, 12)
      expect(result.equivalentResistance).toBeCloseTo(expected.equivalentResistance, 12)
      expect(result.totalPower).toBeCloseTo(expected.totalPower, 12)
      expect(circuit.nominalVoltage * result.totalCurrent).toBeCloseTo(expected.totalPower, 12)
    },
  )
  it('defines the same current path through both series resistors', () => {
    const circuit = circuitById.get('series-24v')!
    expect(circuit.nets.find((n) => n.terminals.includes('r1.b'))?.terminals).toEqual([
      'r1.b',
      'r2.a',
    ])
    const solution = seriesCircuit(24, [100, 200])
    expect(solution.voltageDrops).toEqual([8, 16])
    expect(solution.powers.reduce((sum, power) => sum + power, 0)).toBeCloseTo(1.92, 12)
  })
  it('places the unloaded divider output across the lower resistor', () => {
    const circuit = circuitById.get('divider-12v')!
    const output = circuit.junctions.find((j) => j.id === 'jout')!
    expect(circuit.nets.find((n) => n.id === output.netId)?.terminals).toEqual(['r1.b', 'r2.a'])
    const result = unloadedVoltageDivider(12, 1000, 2000)
    expect(result.outputVoltage).toBe(8)
    expect(result.totalCurrent).toBe(0.004)
    expect(result.voltageDrops.reduce((sum, drop) => sum + drop, 0)).toBe(12)
  })
  it('uses a closed ideal contact and explicitly ohmic lamp model', () => {
    const circuit = circuitById.get('lamp-12v')!
    expect(circuit.components.find((c) => c.id === 's1')?.properties.state).toBe('closed')
    expect(circuit.components.find((c) => c.id === 'h1')?.properties.model).toBe('ohmic-ideal')
    expect(circuit.nets.find((n) => n.terminals.includes('s1.b'))?.terminals).toContain('h1.a')
    expect(seriesCircuit(12, [60]).totalCurrent).toBeCloseTo(0.2, 12)
  })
  it('puts the ammeter in series and the voltmeter across exactly the load nodes', () => {
    const circuit = circuitById.get('meters-24v')!
    const netOf = (terminal: string) => circuit.nets.find((n) => n.terminals.includes(terminal))?.id
    expect(netOf('g1.p')).toBe(netOf('a1.a'))
    expect(netOf('a1.a')).not.toBe(netOf('a1.b'))
    expect(netOf('a1.b')).toBe(netOf('r1.a'))
    expect(netOf('vm1.a')).toBe(netOf('r1.a'))
    expect(netOf('vm1.b')).toBe(netOf('r1.b'))
    expect(
      circuit.components.find((c) => c.kind === 'ammeter')?.properties.internalResistance,
    ).toBe(0)
    expect(circuit.components.find((c) => c.kind === 'voltmeter')?.properties.model).toBe('ideal')
  })
})

describe('bounded series and divider calculations', () => {
  it.each([
    [24, []],
    [24, [0]],
    [24, [-1]],
    [Infinity, [10]],
    [24, [NaN]],
    [24, [Number.MAX_VALUE, Number.MAX_VALUE]],
  ] as [number, number[]][])('rejects unsupported series input', (voltage, resistances) => {
    expect(() => seriesCircuit(voltage, resistances)).toThrow()
  })
  it('rejects finite inputs that overflow instead of returning an impossible result', () => {
    expect(() => seriesCircuit(1e308, [1e-300])).toThrow()
    expect(() => parallelCircuit(1e308, [1e-300])).toThrow()
  })
  it('obeys voltage and power conservation across a range of supported values', () => {
    for (const voltage of [0, 1.5, 12, 24, 48])
      for (const upper of [10, 100, 1000])
        for (const lower of [20, 200, 2000]) {
          const result = unloadedVoltageDivider(voltage, upper, lower)
          expect(result.outputVoltage).toBeCloseTo((voltage * lower) / (upper + lower), 10)
          expect(result.voltageDrops.reduce((sum, drop) => sum + drop, 0)).toBeCloseTo(voltage, 10)
          expect(result.powers.reduce((sum, power) => sum + power, 0)).toBeCloseTo(
            result.totalPower,
            10,
          )
        }
  })
})
