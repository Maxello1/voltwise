import type { ControlModel } from '../domain/control'

export type Point = readonly [number, number]
export type SymbolKind =
  | 'source'
  | 'resistor'
  | 'switch'
  | 'lamp'
  | 'ground'
  | 'ammeter'
  | 'voltmeter'
  | 'contact-no'
  | 'contact-nc'
  | 'pushbutton-no'
  | 'pushbutton-nc'
  | 'coil'
  | 'overload-contact'
  | 'restart-permit'
export interface CircuitComponent {
  id: string
  kind: SymbolKind
  designator: string
  label: string
  position: Point
  rotation: 0 | 90 | 180 | 270
  labelOffset?: Point
  properties: Record<string, number | string>
  deviceId?: string
  terminals: { id: string; role: string; offset: Point }[]
}
interface CircuitBase {
  id: string
  version: number
  title: string
  description: string
  grid: number
  bounds: { width: number; height: number }
  nominalVoltage: number
  components: CircuitComponent[]
  nets: { id: string; label?: string; terminals: string[] }[]
  junctions: { id: string; netId: string; point: Point }[]
  wires: { id: string; netId: string; from: string; to: string; points: Point[] }[]
  annotations: { id: string; point: Point; text: string; kind: 'label' | 'voltage' }[]
}
export type StaticCircuitDefinition = CircuitBase & {
  simulationMode: 'verified-static'
  validation: {
    method: string
    expected: { totalCurrent: number; equivalentResistance: number; totalPower: number }
  }
}
export type ControlCircuitDefinition = CircuitBase & {
  simulationMode: 'finite-state'
  control: ControlModel
  devices: { id: string; kind: 'relay' | 'contactor' | 'overload' | 'restart-monitor' }[]
  validation: { method: string }
}
export type CircuitDefinition = StaticCircuitDefinition | ControlCircuitDefinition
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
