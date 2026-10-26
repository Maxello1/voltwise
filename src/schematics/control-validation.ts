import type { ControlCircuitDefinition, SymbolKind } from './model'

/** Reject unsupported device relationships AND electrical topology, not just plausible drawings. */
export function validateControlCircuit(circuit: ControlCircuitDefinition): string[] {
  const errors: string[] = []
  const { bindings: b, kind, revision } = circuit.control
  const basic = kind === 'momentary-lamp'
  const overload = kind === 'overload'
  if (revision !== 'control-v1' || !['momentary-lamp', 'self-hold', 'overload'].includes(kind))
    errors.push('Unbekanntes Steuerungsmodell')
  const roles: [keyof typeof b, SymbolKind, string[]][] = [
    ['supply', 'source', ['positive', 'negative']],
    ['start', 'pushbutton-no', ['13', '14']],
    ...(basic
      ? [['lamp', 'lamp', ['X1', 'X2']] as [keyof typeof b, SymbolKind, string[]]]
      : ([
          ['stop', 'pushbutton-nc', ['11', '12']],
          ['coil', 'coil', ['A1', 'A2']],
          ['hold', 'contact-no', ['13', '14']],
          ['permit', 'restart-permit', ['in', 'out']],
          ...(overload ? [['overload', 'overload-contact', ['95', '96']]] : []),
        ] as [keyof typeof b, SymbolKind, string[]][])),
  ]
  const boundIds = roles.map(([role]) => b[role])
  if (
    new Set(boundIds).size !== roles.length ||
    circuit.components.length !== roles.length ||
    Object.keys(b).length !== roles.length
  )
    errors.push('Ungültige Modellbindung')
  for (const [role, symbol, terminals] of roles) {
    const component = circuit.components.find((c) => c.id === b[role])
    if (
      !component ||
      component.kind !== symbol ||
      component.terminals.length !== 2 ||
      component.terminals.some(
        (t, i) => t.id !== `${component.id}.${i === 0 ? 'a' : 'b'}` || t.role !== terminals[i],
      )
    )
      errors.push(`Ungültige Anschlussrolle: ${role}`)
  }
  const deviceIds = new Set(circuit.devices.map((d) => d.id))
  if (deviceIds.size !== circuit.devices.length) errors.push('Doppelte Geräte-ID')
  for (const c of circuit.components)
    if (c.deviceId && !deviceIds.has(c.deviceId)) errors.push(`Unbekannte Gerätereferenz: ${c.id}`)
  if (!basic) {
    const component = (id?: string) => circuit.components.find((c) => c.id === id)
    const coil = component(b.coil),
      hold = component(b.hold),
      permit = component(b.permit)
    const deviceKind = (id?: string) => circuit.devices.find((d) => d.id === id)?.kind
    if (
      !coil?.deviceId ||
      coil.deviceId !== hold?.deviceId ||
      !['relay', 'contactor'].includes(deviceKind(coil.deviceId) ?? '')
    )
      errors.push('Hilfskontakt muss zur Schützspule gehören')
    if (deviceKind(permit?.deviceId) !== 'restart-monitor') errors.push('Wiederanlaufsperre fehlt')
    if (overload && deviceKind(component(b.overload)?.deviceId) !== 'overload')
      errors.push('Überlastgerät fehlt')
  }
  if (circuit.devices.length !== (basic ? 0 : overload ? 3 : 2)) errors.push('Unerwartete Geräte')
  if (
    circuit.nominalVoltage !== 24 ||
    circuit.components.find((c) => c.id === b.supply)?.properties.voltage !== 24
  )
    errors.push('Steuerungsmodell benötigt 24 V DC')
  const groups = basic
    ? [
        [`${b.supply}.a`, `${b.start}.a`],
        [`${b.start}.b`, `${b.lamp}.a`],
        [`${b.lamp}.b`, `${b.supply}.b`],
      ]
    : [
        [`${b.supply}.a`, `${b.permit}.a`],
        [`${b.permit}.b`, `${b.stop}.a`],
        ...(overload ? [[`${b.stop}.b`, `${b.overload}.a`]] : []),
        [`${overload ? b.overload : b.stop}.b`, `${b.start}.a`, `${b.hold}.a`],
        [`${b.start}.b`, `${b.hold}.b`, `${b.coil}.a`],
        [`${b.coil}.b`, `${b.supply}.b`],
      ]
  if (
    circuit.nets.length !== groups.length ||
    groups.some(
      (group) =>
        !circuit.nets.some(
          (net) => [...net.terminals].sort().join('|') === [...group].sort().join('|'),
        ),
    )
  )
    errors.push('Topologie passt nicht zum begrenzten Steuerungsmodell')
  return errors
}
