import { terminalPoint, type CircuitDefinition, type Point } from './model'
const same = (a: Point | undefined, b: Point | undefined) =>
  !!a && !!b && a[0] === b[0] && a[1] === b[1]
export function validateCircuit(circuit: CircuitDefinition): string[] {
  const errors: string[] = []
  const netIds = new Set(circuit.nets.map((n) => n.id))
  const anchors = new Map<string, { point: Point; netId?: string }>()
  const ids = new Set<string>()
  const unique = (id: string) => {
    if (ids.has(id)) errors.push(`Doppelte ID: ${id}`)
    ids.add(id)
  }
  for (const net of circuit.nets) unique(net.id)
  for (const component of circuit.components) {
    unique(component.id)
    for (const terminal of component.terminals) {
      unique(terminal.id)
      const memberships = circuit.nets.filter((n) => n.terminals.includes(terminal.id))
      if (memberships.length !== 1)
        errors.push(`Anschluss ${terminal.id} muss genau einem Netz angehören`)
      anchors.set(terminal.id, {
        point: terminalPoint(component, terminal.offset),
        netId: memberships[0]?.id,
      })
    }
  }
  for (const net of circuit.nets) {
    if (new Set(net.terminals).size !== net.terminals.length)
      errors.push(`Doppelter Anschluss in ${net.id}`)
    for (const terminal of net.terminals)
      if (!anchors.has(terminal)) errors.push(`Unbekannter Anschluss: ${terminal}`)
  }
  for (const junction of circuit.junctions) {
    unique(junction.id)
    if (!netIds.has(junction.netId)) errors.push(`Unbekanntes Netz: ${junction.netId}`)
    anchors.set(junction.id, { point: junction.point, netId: junction.netId })
  }
  for (const wire of circuit.wires) {
    unique(wire.id)
    if (!netIds.has(wire.netId)) errors.push(`Unbekanntes Netz: ${wire.netId}`)
    for (const [anchorId, point] of [
      [wire.from, wire.points[0]],
      [wire.to, wire.points.at(-1)],
    ] as const) {
      const anchor = anchors.get(anchorId)
      if (!anchor || anchor.netId !== wire.netId)
        errors.push(`Ungültiger Netzanschluss: ${anchorId}`)
      if (!same(anchor?.point, point))
        errors.push(`Leitungsende passt nicht: ${wire.id}/${anchorId}`)
    }
    if (wire.points.length < 2) errors.push(`Leitung zu kurz: ${wire.id}`)
    wire.points.forEach(([x, y], index) => {
      if (
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        x % circuit.grid !== 0 ||
        y % circuit.grid !== 0
      )
        errors.push(`Punkt liegt nicht im Raster: ${wire.id}`)
      const previous = wire.points[index - 1]
      if (previous && previous[0] !== x && previous[1] !== y)
        errors.push(`Nicht orthogonale Leitung: ${wire.id}`)
    })
  }
  // Connectivity is defined by explicit anchor IDs, never inferred from crossing paths.
  for (const net of circuit.nets) {
    const edges = circuit.wires.filter((w) => w.netId === net.id)
    const reached = new Set<string>(net.terminals.slice(0, 1))
    let changed = true
    while (changed) {
      changed = false
      for (const edge of edges)
        if (reached.has(edge.from) || reached.has(edge.to)) {
          if (!reached.has(edge.from) || !reached.has(edge.to)) changed = true
          reached.add(edge.from)
          reached.add(edge.to)
        }
    }
    if (net.terminals.some((t) => !reached.has(t)))
      errors.push(`Netz nicht durch Leitungen verbunden: ${net.id}`)
  }
  // Distinct nets meeting geometrically are ambiguous unless both segments pass through (a crossing).
  for (const anchor of anchors.values()) {
    for (const wire of circuit.wires.filter((w) => w.netId !== anchor.netId)) {
      for (let index = 1; index < wire.points.length; index++) {
        const a = wire.points[index - 1]!,
          b = wire.points[index]!,
          p = anchor.point
        if (
          (a[0] === b[0] &&
            p[0] === a[0] &&
            p[1] >= Math.min(a[1], b[1]) &&
            p[1] <= Math.max(a[1], b[1])) ||
          (a[1] === b[1] &&
            p[1] === a[1] &&
            p[0] >= Math.min(a[0], b[0]) &&
            p[0] <= Math.max(a[0], b[0]))
        )
          errors.push('Anschluss berührt ein anderes Netz ohne zulässige Verbindung')
      }
    }
  }
  return errors
}
