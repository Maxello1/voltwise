import { circuitById } from './circuit-library'
import { parallelDemo } from './circuit'
import { seriesDemo } from './circuits/dc'
import { dcNumber, resolveDcProblem } from '../domain/dc-practice'
import { parallelCircuit, seriesCircuit } from '../domain/electrical'
import type { CircuitDefinition } from '../schematics/model'

export function resolvePracticeCircuit(id: string): CircuitDefinition | undefined {
  const curated = circuitById.get(id)
  if (curated) return curated
  const problem = resolveDcProblem(id)
  if (!problem || !['series-current', 'parallel-current'].includes(problem.template)) return
  const series = problem.template === 'series-current'
  const circuit = structuredClone(series ? seriesDemo : parallelDemo)
  const { voltage, resistance, secondResistance, exercise } = problem
  circuit.id = id
  circuit.title = series ? 'Ein gemeinsamer Strompfad.' : 'Zwei parallele Strompfade.'
  circuit.description = exercise.prompt
  circuit.nominalVoltage = voltage
  for (const component of circuit.components) {
    if (component.kind === 'source') {
      component.properties.voltage = voltage
      component.label = `${dcNumber(voltage)} V DC`
    } else if (component.kind === 'resistor') {
      const value = component.id === 'r1' ? resistance : secondResistance
      component.properties.resistance = value
      component.label = `${dcNumber(value)} Ω`
    }
  }
  for (const annotation of circuit.annotations)
    if (annotation.kind === 'voltage') annotation.text = `U = ${dcNumber(voltage)} V`
  const result = (series ? seriesCircuit : parallelCircuit)(voltage, [resistance, secondResistance])
  circuit.validation = {
    method: 'Versionierte Zahlenvariante; Ohm und Erhaltungssätze analytisch geprüft',
    expected: {
      totalCurrent: result.totalCurrent,
      equivalentResistance: result.equivalentResistance,
      totalPower: result.totalPower,
    },
  }
  return circuit
}
