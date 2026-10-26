import { evaluateLogic, type LogicGraph, type LogicInputs } from './boolean-logic'

export const generatorMotors = [
  { name: 'Motor 1', powerKw: 2, address: 'E24.0' },
  { name: 'Motor 2', powerKw: 3, address: 'E24.1' },
  { name: 'Motor 3', powerKw: 5, address: 'E24.2' },
  { name: 'Motor 4', powerKw: 7, address: 'E24.3' },
] as const
export function inputsFromBits(bits: string): LogicInputs {
  if (!/^[01]{4}$/.test(bits))
    throw new Error('Vier Bits in Reihenfolge E24.3 bis E24.0 erforderlich.')
  return {
    'E24.0': bits[3] === '1',
    'E24.1': bits[2] === '1',
    'E24.2': bits[1] === '1',
    'E24.3': bits[0] === '1',
  }
}
export function generatorState(bits: string) {
  const inputs = inputsFromBits(bits)
  const motors = generatorMotors.map((m) => ({ ...m, running: !inputs[m.address] }))
  const totalKw = motors.reduce((sum, m) => sum + (m.running ? m.powerKw : 0), 0)
  return { bits, inputs, motors, totalKw, indicator: totalKw < 10, boundary: totalKw === 10 }
}
export const generatorCases = () =>
  Array.from({ length: 16 }, (_, i) => generatorState((15 - i).toString(2).padStart(4, '0')))
export const generatorExpression = '(E24.1 ∧ E24.2) ∨ (E24.3 ∧ (E24.0 ∨ E24.1 ∨ E24.2))'
export const referenceFup: LogicGraph = {
  version: 1,
  blocks: [
    { id: 'b1', kind: 'AND', inputs: ['E24.1', 'E24.2'] },
    { id: 'b2', kind: 'OR', inputs: ['E24.0', 'E24.1', 'E24.2'] },
    { id: 'b3', kind: 'AND', inputs: ['E24.3', 'b2.Q'] },
    { id: 'b4', kind: 'OR', inputs: ['b1.Q', 'b3.Q'] },
  ],
  output: 'b4.Q',
}
export function checkGeneratorGraph(graph: unknown) {
  return generatorCases()
    .filter((row) => evaluateLogic(graph, row.inputs).output !== row.indicator)
    .map((row) => row.bits)
}
