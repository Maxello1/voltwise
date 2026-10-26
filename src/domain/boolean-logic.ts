import { z } from 'zod'

export const inputIds = ['E24.0', 'E24.1', 'E24.2', 'E24.3'] as const
export type InputId = (typeof inputIds)[number]
export type LogicInputs = Record<InputId, boolean>
export const logicGraphSchema = z
  .object({
    version: z.literal(1),
    blocks: z
      .array(
        z
          .object({
            id: z.string().regex(/^b[0-9]{1,2}$/),
            kind: z.enum(['AND', 'OR', 'NOT']),
            inputs: z.array(z.string().max(20)).min(1).max(4),
          })
          .strict(),
      )
      .max(12),
    output: z.string().max(20),
  })
  .strict()
export type LogicGraph = z.infer<typeof logicGraphSchema>
/** Each block has explicit IN1..IN4 and Q; only <input> or <block>.Q is a source. */
export function validateLogicGraph(input: unknown): LogicGraph {
  const graph = logicGraphSchema.parse(input)
  const ids = new Set(graph.blocks.map((b) => b.id))
  if (ids.size !== graph.blocks.length) throw new Error('Doppelte Bausteinkennung.')
  const visiting = new Set<string>(),
    visited = new Set<string>()
  const visit = (terminal: string): void => {
    if ((inputIds as readonly string[]).includes(terminal)) return
    const match = /^(b[0-9]{1,2})\.Q$/.exec(terminal)
    const block = match && graph.blocks.find((b) => b.id === match[1])
    if (!block) throw new Error(`Unbekannter Ausgangsanschluss: ${terminal}`)
    if (visiting.has(block.id)) throw new Error('Kombinatorischer Zyklus ist nicht erlaubt.')
    if (visited.has(block.id)) return
    if (
      (block.kind === 'NOT' && block.inputs.length !== 1) ||
      (block.kind !== 'NOT' && block.inputs.length < 2)
    )
      throw new Error('Falsche Anzahl Eingänge.')
    visiting.add(block.id)
    block.inputs.forEach(visit)
    visiting.delete(block.id)
    visited.add(block.id)
  }
  // Validate even unused blocks, so malformed/cyclic hidden branches cannot be stored.
  graph.blocks.forEach((b) => visit(`${b.id}.Q`))
  visit(graph.output)
  return graph
}
export function evaluateLogic(input: unknown, values: LogicInputs) {
  const graph = validateLogicGraph(input),
    signals: Record<string, boolean> = { ...values }
  if (inputIds.some((id) => typeof values[id] !== 'boolean'))
    throw new Error('Vier binäre Eingänge erforderlich.')
  const read = (terminal: string): boolean => {
    if (terminal in signals) return signals[terminal]!
    const block = graph.blocks.find((b) => `${b.id}.Q` === terminal)!
    const inputs = block.inputs.map(read)
    const value =
      block.kind === 'NOT'
        ? !inputs[0]
        : block.kind === 'AND'
          ? inputs.every(Boolean)
          : inputs.some(Boolean)
    signals[terminal] = value
    return value
  }
  const output = read(graph.output)
  graph.blocks.forEach((b) => read(`${b.id}.Q`))
  return { output, signals }
}
