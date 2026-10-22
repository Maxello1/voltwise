import type {
  CircuitComponent,
  ControlCircuitDefinition,
  Point,
  SymbolKind,
} from '../../schematics/model'
import type { ControlKind } from '../../domain/control'

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
    properties: kind === 'source' ? { voltage: 24 } : {},
    terminals: [
      { id: `${id}.a`, role: roles[0], offset: [0, -40] },
      { id: `${id}.b`, role: roles[1], offset: [0, 40] },
    ],
  }
}

/** Curated drawings, never arbitrary ladder synthesis. Terminal sets pin each supported model. */
function controlCircuit(kind: ControlKind): ControlCircuitDefinition {
  const basic = kind === 'momentary-lamp'
  const overload = kind === 'overload'
  const circuit: ControlCircuitDefinition = {
    id: basic ? 'control-lamp-v1' : overload ? 'control-overload-v1' : 'control-hold-v1',
    version: 1,
    title: basic
      ? 'Ein Tastendruck. Ein Licht.'
      : overload
        ? 'Den Fehler im Strompfad finden.'
        : 'Loslassen. Und eingeschaltet bleiben.',
    description: basic
      ? '24 V DC · S1 als Schließertaster · H1 als Meldeleuchte'
      : `24 V DC · Start/Stop · K1-Selbsthaltung${overload ? ' · F1-Überlastkontakt' : ''} · B1-Wiederanlaufsperre`,
    grid: 10,
    bounds: { width: 660, height: basic ? 420 : overload ? 840 : 720 },
    nominalVoltage: 24,
    simulationMode: 'finite-state',
    control: {
      revision: 'control-v1',
      kind,
      bindings: basic
        ? { supply: 'g1', start: 's1', lamp: 'h1' }
        : {
            supply: 'g1',
            start: 's1',
            stop: 's0',
            coil: 'k1-coil',
            hold: 'k1-hold',
            permit: 'b1-permit',
            ...(overload ? { overload: 'f1-contact' } : {}),
          },
    },
    devices: basic
      ? []
      : [
          { id: 'k1', kind: 'contactor' },
          { id: 'b1', kind: 'restart-monitor' },
          ...(overload ? [{ id: 'f1', kind: 'overload' as const }] : []),
        ],
    components: [],
    nets: [],
    junctions: [],
    wires: [],
    annotations: [{ id: 'voltage', point: [30, 30], text: '+24 V / 0 V · ideal', kind: 'voltage' }],
    validation: {
      method: 'Begrenztes Zustandsmodell control-v1; geprüfte Übergänge und Anschlussgruppen',
    },
  }
  const sourceY = basic ? 210 : 350
  const branchY = overload ? 520 : 400
  const coilY = branchY + 180
  circuit.components = [
    part('g1', 'source', 'G1', '24 V DC', [90, sourceY], ['positive', 'negative']),
    ...(basic
      ? [
          part('s1', 'pushbutton-no', 'S1', 'Taster · 13–14', [300, 140], ['13', '14']),
          part('h1', 'lamp', 'H1', 'Meldeleuchte', [300, 280], ['X1', 'X2']),
        ]
      : [
          part('b1-permit', 'restart-permit', 'B1', 'Freigabe', [300, 120], ['in', 'out'], 'b1'),
          part('s0', 'pushbutton-nc', 'S0', 'Stop · 11–12', [300, 240], ['11', '12']),
          ...(overload
            ? [
                part(
                  'f1-contact',
                  'overload-contact',
                  'F1',
                  'Überlast · 95–96',
                  [300, 360],
                  ['95', '96'],
                  'f1',
                ),
              ]
            : []),
          part('s1', 'pushbutton-no', 'S1', 'Start · 13–14', [300, branchY], ['13', '14']),
          part('k1-hold', 'contact-no', 'K1', '13–14 ↔ Spule', [490, branchY], ['13', '14'], 'k1'),
          part('k1-coil', 'coil', 'K1', 'Spule · A1–A2', [300, coilY], ['A1', 'A2'], 'k1'),
        ]),
  ]
  // Wire helper resolves known terminal positions; geometry does not define connectivity.
  const anchors = new Map<string, Point>()
  for (const c of circuit.components)
    for (const t of c.terminals)
      anchors.set(t.id, [c.position[0] + t.offset[0], c.position[1] + t.offset[1]])
  function wire(netId: string, from: string, to: string, via: Point[] = []) {
    circuit.wires.push({
      id: `w${circuit.wires.length + 1}`,
      netId,
      from,
      to,
      points: [anchors.get(from)!, ...via, anchors.get(to)!],
    })
  }
  function net(id: string, label: string, terminals: string[]) {
    circuit.nets.push({ id, label, terminals })
  }
  if (basic) {
    net('positive', '+24 V → Taster', ['g1.a', 's1.a'])
    net('switched', 'Taster → Leuchte', ['s1.b', 'h1.a'])
    net('reference', 'Leuchte → 0 V', ['h1.b', 'g1.b'])
    wire('positive', 'g1.a', 's1.a', [
      [90, 60],
      [300, 60],
    ])
    wire('switched', 's1.b', 'h1.a')
    wire('reference', 'h1.b', 'g1.b', [
      [300, 360],
      [90, 360],
    ])
  } else {
    net('positive', '+24 V → Freigabe', ['g1.a', 'b1-permit.a'])
    net('permitted', 'Freigabe → Stop', ['b1-permit.b', 's0.a'])
    wire('positive', 'g1.a', 'b1-permit.a', [
      [90, 60],
      [300, 60],
    ])
    wire('permitted', 'b1-permit.b', 's0.a')
    if (overload) {
      net('protected', 'Stop → Überlastkontakt', ['s0.b', 'f1-contact.a'])
      wire('protected', 's0.b', 'f1-contact.a')
    }
    const upstream = overload ? 'f1-contact.b' : 's0.b'
    net('start-feed', 'Vor Start und Hilfskontakt', [upstream, 's1.a', 'k1-hold.a'])
    net('coil-feed', 'Nach Start und Hilfskontakt', ['s1.b', 'k1-hold.b', 'k1-coil.a'])
    net('reference', 'A2 → 0 V', ['k1-coil.b', 'g1.b'])
    for (const [id, netId, point] of [
      ['j-top', 'start-feed', [300, branchY - 70]],
      ['j-bottom', 'coil-feed', [300, branchY + 70]],
    ] as const) {
      circuit.junctions.push({ id, netId, point })
      anchors.set(id, point)
    }
    wire('start-feed', upstream, 'j-top')
    wire('start-feed', 'j-top', 's1.a')
    wire('start-feed', 'j-top', 'k1-hold.a', [[490, branchY - 70]])
    wire('coil-feed', 's1.b', 'j-bottom')
    wire('coil-feed', 'k1-hold.b', 'j-bottom', [[490, branchY + 70]])
    wire('coil-feed', 'j-bottom', 'k1-coil.a')
    wire('reference', 'k1-coil.b', 'g1.b', [
      [300, coilY + 80],
      [90, coilY + 80],
    ])
    circuit.annotations.push({
      id: 'guard-note',
      point: [360, 175],
      text: 'B1: zusätzliche Logik',
      kind: 'voltage',
    })
  }
  return circuit
}
export const controlLamp = controlCircuit('momentary-lamp')
export const controlHold = controlCircuit('self-hold')
export const controlOverload = controlCircuit('overload')
