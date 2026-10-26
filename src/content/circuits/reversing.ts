import { reversingNets, reversingRevision } from '../../domain/reversing'
import type {
  CircuitComponent,
  Point,
  ReversingCircuitDefinition,
  SymbolKind,
} from '../../schematics/model'

function part(
  id: string,
  kind: SymbolKind,
  designator: string,
  label: string,
  position: Point,
  roles: [string, string],
  deviceId?: string,
): CircuitComponent {
  return {
    id,
    kind,
    designator,
    label,
    position,
    rotation: 0,
    deviceId,
    labelOffset: [38, -8],
    properties: kind === 'source' ? { voltage: 24 } : {},
    terminals: roles.map((role, i) => ({
      id: `${id}.${i === 0 ? 'a' : 'b'}`,
      role,
      offset: [0, i === 0 ? -40 : 40] as Point,
    })),
  }
}

export const reversingCircuit: ReversingCircuitDefinition = {
  id: 'control-reversing-v1',
  version: 1,
  title: 'Zwei Richtungen. Eine Freigabe.',
  description: '24 V DC · Wendeschützsteuerung · K1 Vor / K2 Rück · B1 Befehlsfreigabe',
  grid: 10,
  bounds: { width: 1000, height: 1020 },
  nominalVoltage: 24,
  simulationMode: 'reversing',
  revision: reversingRevision,
  devices: [
    { id: 'k1', kind: 'contactor' },
    { id: 'k2', kind: 'contactor' },
    { id: 'f1', kind: 'overload' },
    { id: 'b1', kind: 'restart-monitor' },
  ],
  components: [
    part('g1', 'source', 'G1', '24 V DC', [80, 350], ['positive', 'negative']),
    part('b1', 'restart-permit', 'B1', 'Freigabe¹', [320, 120], ['in', 'out'], 'b1'),
    part('s0', 'pushbutton-nc', 'S0', 'Stop', [320, 250], ['11', '12']),
    part('f1', 'overload-contact', 'F1', 'Überlast', [320, 380], ['95', '96'], 'f1'),
    part('s1', 'pushbutton-no', 'S1', 'Vor', [280, 540], ['13', '14']),
    part('k1-hold', 'contact-no', 'K1', 'Halten ↔ K1', [460, 540], ['13', '14'], 'k1'),
    part('s2', 'pushbutton-no', 'S2', 'Rück', [660, 540], ['13', '14']),
    part('k2-hold', 'contact-no', 'K2', 'Halten ↔ K2', [840, 540], ['13', '14'], 'k2'),
    part('k2-nc', 'contact-nc', 'K2', 'Sperrt K1', [280, 720], ['21', '22'], 'k2'),
    part('k1-nc', 'contact-nc', 'K1', 'Sperrt K2', [660, 720], ['21', '22'], 'k1'),
    part('k1-coil', 'coil', 'K1', 'Vor', [280, 870], ['A1', 'A2'], 'k1'),
    part('k2-coil', 'coil', 'K2', 'Rück', [660, 870], ['A1', 'A2'], 'k2'),
  ],
  nets: reversingNets.map((n) => ({
    id: n.id,
    label: (
      {
        positive: '+24 V',
        permitted: 'Nach B1',
        protected: 'Nach Stop',
        reference: '0 V / A2',
        feed: 'Gemeinsame Startfreigabe',
        'forward-command': 'Vor: nach Start / Halten',
        'reverse-command': 'Rück: nach Start / Halten',
        'forward-coil': 'Vor: Spulenzuleitung',
        'reverse-coil': 'Rück: Spulenzuleitung',
      } as Record<string, string>
    )[n.id]!,
    terminals: [...n.terminals],
  })),
  junctions: [],
  wires: [],
  annotations: [
    {
      id: 'supply-label',
      point: [40, 35],
      text: 'STEUERSTROMKREIS · +24 V / 0 V',
      kind: 'voltage',
    },
    { id: 'b1-note', point: [510, 110], text: '¹ B1: Loslass- und Befehlslogik', kind: 'label' },
    { id: 'b1-note-2', point: [510, 140], text: 'Beide Startbefehle → gesperrt', kind: 'label' },
    { id: 'forward-label', point: [230, 990], text: 'K1 · VOR', kind: 'label' },
    { id: 'reverse-label', point: [610, 990], text: 'K2 · RÜCK', kind: 'label' },
  ],
  validation: {
    method:
      'reversing-v1: feste Anschlussgruppen, diskrete Schaltzustände und ideale DC-Potenziale',
  },
}
const anchors = new Map<string, Point>()
for (const c of reversingCircuit.components)
  for (const t of c.terminals)
    anchors.set(t.id, [c.position[0] + t.offset[0], c.position[1] + t.offset[1]])
function junction(id: string, netId: string, point: Point) {
  reversingCircuit.junctions.push({ id, netId, point })
  anchors.set(id, point)
}
function wire(netId: string, from: string, to: string, via: Point[] = []) {
  reversingCircuit.wires.push({
    id: `rw${reversingCircuit.wires.length}`,
    netId,
    from,
    to,
    points: [anchors.get(from)!, ...via, anchors.get(to)!],
  })
}
wire('positive', 'g1.a', 'b1.a', [
  [80, 60],
  [320, 60],
])
wire('permitted', 'b1.b', 's0.a')
wire('protected', 's0.b', 'f1.a')
junction('j-feed', 'feed', [320, 460])
wire('feed', 'f1.b', 'j-feed')
for (const [id, x] of [
  ['s1', 280],
  ['k1-hold', 460],
  ['s2', 660],
  ['k2-hold', 840],
] as const) {
  junction(`j-feed-${id}`, 'feed', [x, 460])
  wire('feed', `j-feed-${id}`, `${id}.a`)
}
for (const [from, to] of [
  ['j-feed-s1', 'j-feed'],
  ['j-feed', 'j-feed-k1-hold'],
  ['j-feed-k1-hold', 'j-feed-s2'],
  ['j-feed-s2', 'j-feed-k2-hold'],
])
  wire('feed', from!, to!)
for (const [net, start, hold, interlock, x, hx] of [
  ['forward-command', 's1', 'k1-hold', 'k2-nc', 280, 460],
  ['reverse-command', 's2', 'k2-hold', 'k1-nc', 660, 840],
] as const) {
  junction(`j-${start}`, net, [x, 630])
  wire(net, `${start}.b`, `j-${start}`)
  wire(net, `${hold}.b`, `j-${start}`, [[hx, 630]])
  wire(net, `j-${start}`, `${interlock}.a`)
}
wire('forward-coil', 'k2-nc.b', 'k1-coil.a')
wire('reverse-coil', 'k1-nc.b', 'k2-coil.a')
junction('j-zero', 'reference', [280, 950])
wire('reference', 'k1-coil.b', 'j-zero')
wire('reference', 'k2-coil.b', 'j-zero', [[660, 950]])
wire('reference', 'j-zero', 'g1.b', [[80, 950]])
