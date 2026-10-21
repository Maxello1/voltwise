export type Point = readonly [number, number]
export type SymbolKind = 'source' | 'resistor' | 'switch' | 'lamp' | 'ground'
export interface CircuitComponent {
  id: string
  kind: SymbolKind
  designator: string
  label: string
  position: Point
  rotation: 0 | 90 | 180 | 270
  properties: Record<string, number | string>
  terminals: { id: string; role: string; offset: Point }[]
}
export interface CircuitDefinition {
  id: string
  version: number
  title: string
  description: string
  grid: number
  bounds: { width: number; height: number }
  nominalVoltage: number
  simulationMode: 'verified-static'
  components: CircuitComponent[]
  nets: { id: string; terminals: string[] }[]
  junctions: { id: string; netId: string; point: Point }[]
  wires: { id: string; netId: string; from: string; to: string; points: Point[] }[]
  annotations: { id: string; point: Point; text: string; kind: 'label' | 'voltage' }[]
  validation: {
    method: string
    expected: { totalCurrent: number; equivalentResistance: number; totalPower: number }
  }
}
export function terminalPoint(component: CircuitComponent, offset: Point): Point {
  const [x, y] = offset
  const rotated: Point =
    component.rotation === 90
      ? [-y, x]
      : component.rotation === 180
        ? [-x, -y]
        : component.rotation === 270
          ? [y, -x]
          : [x, y]
  return [component.position[0] + rotated[0], component.position[1] + rotated[1]]
}
