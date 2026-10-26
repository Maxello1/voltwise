import type { ReversingCircuitDefinition, SymbolKind } from './model'
import { reversingNets } from '../domain/reversing'

export function validateReversingCircuit(circuit: ReversingCircuitDefinition): string[] {
  const errors: string[] = []
  const expected: [string, SymbolKind, string, string, string?][] = [
    ['g1', 'source', 'positive', 'negative'],
    ['b1', 'restart-permit', 'in', 'out', 'b1'],
    ['s0', 'pushbutton-nc', '11', '12'],
    ['f1', 'overload-contact', '95', '96', 'f1'],
    ['s1', 'pushbutton-no', '13', '14'],
    ['s2', 'pushbutton-no', '13', '14'],
    ['k1-hold', 'contact-no', '13', '14', 'k1'],
    ['k2-hold', 'contact-no', '13', '14', 'k2'],
    ['k1-nc', 'contact-nc', '21', '22', 'k1'],
    ['k2-nc', 'contact-nc', '21', '22', 'k2'],
    ['k1-coil', 'coil', 'A1', 'A2', 'k1'],
    ['k2-coil', 'coil', 'A1', 'A2', 'k2'],
  ]
  if (
    circuit.revision !== 'reversing-v1' ||
    circuit.nominalVoltage !== 24 ||
    circuit.components.length !== expected.length ||
    circuit.components.find((c) => c.id === 'g1')?.properties.voltage !== 24
  )
    errors.push('Ungültiges Wendeschützmodell')
  for (const [id, kind, a, b, device] of expected) {
    const c = circuit.components.find((c) => c.id === id)
    if (
      !c ||
      c.kind !== kind ||
      c.deviceId !== device ||
      c.terminals.length !== 2 ||
      c.terminals.some((t, i) => t.id !== `${id}.${i ? 'b' : 'a'}` || t.role !== (i ? b : a))
    )
      errors.push(`Ungültige Geräte-/Anschlussbindung: ${id}`)
  }
  if (
    JSON.stringify([...circuit.devices].sort((a, b) => a.id.localeCompare(b.id))) !==
    JSON.stringify([
      { id: 'b1', kind: 'restart-monitor' },
      { id: 'f1', kind: 'overload' },
      { id: 'k1', kind: 'contactor' },
      { id: 'k2', kind: 'contactor' },
    ])
  )
    errors.push('Ungültige Gerätezuordnung')
  if (
    circuit.nets.length !== reversingNets.length ||
    reversingNets.some(
      (n) =>
        !circuit.nets.some(
          (c) =>
            c.id === n.id &&
            [...c.terminals].sort().join('|') === [...n.terminals].sort().join('|'),
        ),
    )
  )
    errors.push('Topologie passt nicht zu reversing-v1')
  return errors
}
