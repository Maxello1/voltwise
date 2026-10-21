import type { CircuitComponent, CircuitDefinition, Point, SymbolKind } from '../../schematics/model'

function component(
  id: string,
  kind: SymbolKind,
  designator: string,
  label: string,
  position: Point,
  properties: CircuitComponent['properties'],
  rotation: CircuitComponent['rotation'] = 0,
  labelOffset?: Point,
): CircuitComponent {
  return {
    id,
    kind,
    designator,
    label,
    position,
    properties,
    rotation,
    labelOffset,
    terminals:
      kind === 'source'
        ? [
            { id: `${id}.p`, role: 'positive', offset: [0, -40] },
            { id: `${id}.n`, role: 'negative', offset: [0, 40] },
          ]
        : [
            { id: `${id}.a`, role: 'passive', offset: [0, -40] },
            { id: `${id}.b`, role: 'passive', offset: [0, 40] },
          ],
  }
}

export const seriesDemo: CircuitDefinition = {
  id: 'series-24v',
  version: 1,
  title: 'Ein Weg. Derselbe Strom.',
  description: '24 V Gleichspannung · 100 Ω und 200 Ω in Reihe',
  grid: 10,
  bounds: { width: 640, height: 440 },
  nominalVoltage: 24,
  simulationMode: 'verified-static',
  components: [
    component('g1', 'source', 'G1', '24 V DC', [100, 220], { voltage: 24 }),
    component('r1', 'resistor', 'R1', '100 Ω', [380, 140], { resistance: 100 }),
    component('r2', 'resistor', 'R2', '200 Ω', [380, 300], { resistance: 200 }),
  ],
  nets: [
    { id: 'positive', label: 'Quellenplus → R1', terminals: ['g1.p', 'r1.a'] },
    { id: 'between', label: 'Zwischen R1 und R2', terminals: ['r1.b', 'r2.a'] },
    { id: 'reference', label: 'R2 → Quellenminus', terminals: ['r2.b', 'g1.n'] },
  ],
  junctions: [],
  wires: [
    {
      id: 'wp',
      netId: 'positive',
      from: 'g1.p',
      to: 'r1.a',
      points: [
        [100, 180],
        [100, 60],
        [380, 60],
        [380, 100],
      ],
    },
    {
      id: 'wm',
      netId: 'between',
      from: 'r1.b',
      to: 'r2.a',
      points: [
        [380, 180],
        [380, 260],
      ],
    },
    {
      id: 'wn',
      netId: 'reference',
      from: 'r2.b',
      to: 'g1.n',
      points: [
        [380, 340],
        [380, 380],
        [100, 380],
        [100, 260],
      ],
    },
  ],
  annotations: [
    { id: 'p', point: [70, 168], text: '+', kind: 'label' },
    { id: 'n', point: [70, 280], text: '−', kind: 'label' },
  ],
  validation: {
    method: 'Ohm, Spannungs- und Leistungsbilanz; analytisch geprüft',
    expected: { totalCurrent: 0.08, equivalentResistance: 300, totalPower: 1.92 },
  },
}

export const dividerDemo: CircuitDefinition = {
  id: 'divider-12v',
  version: 1,
  title: 'Spannung im richtigen Verhältnis.',
  description: '12 V · unbelasteter Spannungsteiler mit 1 kΩ und 2 kΩ',
  grid: 10,
  bounds: { width: 640, height: 440 },
  nominalVoltage: 12,
  simulationMode: 'verified-static',
  components: [
    component('g1', 'source', 'G1', '12 V DC', [100, 220], { voltage: 12 }),
    component('r1', 'resistor', 'R1', '1 kΩ', [380, 140], { resistance: 1000 }),
    component('r2', 'resistor', 'R2', '2 kΩ', [380, 300], { resistance: 2000 }),
  ],
  nets: [
    { id: 'positive', label: 'Eingang · 12 V', terminals: ['g1.p', 'r1.a'] },
    { id: 'output', label: 'Ausgang · zwischen R1 und R2', terminals: ['r1.b', 'r2.a'] },
    { id: 'reference', label: 'Bezug · Quellenminus', terminals: ['r2.b', 'g1.n'] },
  ],
  junctions: [
    { id: 'jout', netId: 'output', point: [380, 220] },
    { id: 'jref', netId: 'reference', point: [380, 380] },
  ],
  wires: [
    {
      id: 'wp',
      netId: 'positive',
      from: 'g1.p',
      to: 'r1.a',
      points: [
        [100, 180],
        [100, 60],
        [380, 60],
        [380, 100],
      ],
    },
    {
      id: 'wo1',
      netId: 'output',
      from: 'r1.b',
      to: 'jout',
      points: [
        [380, 180],
        [380, 220],
      ],
    },
    {
      id: 'wo2',
      netId: 'output',
      from: 'jout',
      to: 'r2.a',
      points: [
        [380, 220],
        [380, 260],
      ],
    },
    {
      id: 'wn1',
      netId: 'reference',
      from: 'r2.b',
      to: 'jref',
      points: [
        [380, 340],
        [380, 380],
      ],
    },
    {
      id: 'wn2',
      netId: 'reference',
      from: 'jref',
      to: 'g1.n',
      points: [
        [380, 380],
        [100, 380],
        [100, 260],
      ],
    },
  ],
  annotations: [
    { id: 'p', point: [70, 168], text: '+', kind: 'label' },
    { id: 'n', point: [70, 280], text: '−', kind: 'label' },
    { id: 'output', point: [410, 224], text: 'Uaus über R2', kind: 'voltage' },
  ],
  validation: {
    method: 'Unbelasteter Spannungsteiler; Ohm und Spannungsbilanz',
    expected: { totalCurrent: 0.004, equivalentResistance: 3000, totalPower: 0.048 },
  },
}

export const lampDemo: CircuitDefinition = {
  id: 'lamp-12v',
  version: 1,
  title: 'Ein Kontakt schließt den Kreis.',
  description: '12 V · geschlossener Schalter · idealisierte 60-Ω-Lampe',
  grid: 10,
  bounds: { width: 640, height: 360 },
  nominalVoltage: 12,
  simulationMode: 'verified-static',
  components: [
    component('g1', 'source', 'G1', '12 V DC', [100, 180], { voltage: 12 }),
    component('s1', 'switch', 'S1', 'geschlossen', [320, 60], { state: 'closed' }, 270, [-18, 64]),
    component('h1', 'lamp', 'H1', '60 Ω', [500, 180], { resistance: 60, model: 'ohmic-ideal' }),
  ],
  nets: [
    { id: 'positive', label: 'Quellenplus → Schalter', terminals: ['g1.p', 's1.a'] },
    { id: 'switched', label: 'Schalter → Lampe', terminals: ['s1.b', 'h1.a'] },
    { id: 'reference', label: 'Lampe → Quellenminus', terminals: ['h1.b', 'g1.n'] },
  ],
  junctions: [],
  wires: [
    {
      id: 'wp',
      netId: 'positive',
      from: 'g1.p',
      to: 's1.a',
      points: [
        [100, 140],
        [100, 60],
        [280, 60],
      ],
    },
    {
      id: 'ws',
      netId: 'switched',
      from: 's1.b',
      to: 'h1.a',
      points: [
        [360, 60],
        [500, 60],
        [500, 140],
      ],
    },
    {
      id: 'wn',
      netId: 'reference',
      from: 'h1.b',
      to: 'g1.n',
      points: [
        [500, 220],
        [500, 300],
        [100, 300],
        [100, 220],
      ],
    },
  ],
  annotations: [
    { id: 'p', point: [70, 128], text: '+', kind: 'label' },
    { id: 'n', point: [70, 244], text: '−', kind: 'label' },
  ],
  validation: {
    method: 'Geschlossener idealer Schalter; Lampe als fester ohmscher Widerstand',
    expected: { totalCurrent: 0.2, equivalentResistance: 60, totalPower: 2.4 },
  },
}

export const meteringDemo: CircuitDefinition = {
  id: 'meters-24v',
  version: 1,
  title: 'Strom im Pfad. Spannung am Bauteil.',
  description: '24 V · 100 Ω · ideale Strom- und Spannungsmessung',
  grid: 10,
  bounds: { width: 640, height: 360 },
  nominalVoltage: 24,
  simulationMode: 'verified-static',
  components: [
    component('g1', 'source', 'G1', '24 V DC', [80, 180], { voltage: 24 }),
    component(
      'a1',
      'ammeter',
      'A1',
      'ideal',
      [200, 60],
      { model: 'ideal', internalResistance: 0 },
      270,
      [-18, 64],
    ),
    component('r1', 'resistor', 'R1', '100 Ω', [340, 180], { resistance: 100 }),
    component('vm1', 'voltmeter', 'V1', 'ideal', [500, 180], { model: 'ideal' }),
  ],
  nets: [
    { id: 'positive', label: 'Quellenplus → Amperemeter', terminals: ['g1.p', 'a1.a'] },
    { id: 'measured', label: 'Lastspannung · Plus', terminals: ['a1.b', 'r1.a', 'vm1.a'] },
    { id: 'reference', label: 'Bezug · Quellenminus', terminals: ['g1.n', 'r1.b', 'vm1.b'] },
  ],
  junctions: [
    { id: 'jp', netId: 'measured', point: [340, 60] },
    { id: 'jn', netId: 'reference', point: [340, 300] },
  ],
  wires: [
    {
      id: 'wp',
      netId: 'positive',
      from: 'g1.p',
      to: 'a1.a',
      points: [
        [80, 140],
        [80, 60],
        [160, 60],
      ],
    },
    {
      id: 'wa',
      netId: 'measured',
      from: 'a1.b',
      to: 'jp',
      points: [
        [240, 60],
        [340, 60],
      ],
    },
    {
      id: 'wrp',
      netId: 'measured',
      from: 'jp',
      to: 'r1.a',
      points: [
        [340, 60],
        [340, 140],
      ],
    },
    {
      id: 'wvp',
      netId: 'measured',
      from: 'jp',
      to: 'vm1.a',
      points: [
        [340, 60],
        [500, 60],
        [500, 140],
      ],
    },
    {
      id: 'wgn',
      netId: 'reference',
      from: 'g1.n',
      to: 'jn',
      points: [
        [80, 220],
        [80, 300],
        [340, 300],
      ],
    },
    {
      id: 'wrn',
      netId: 'reference',
      from: 'r1.b',
      to: 'jn',
      points: [
        [340, 220],
        [340, 300],
      ],
    },
    {
      id: 'wvn',
      netId: 'reference',
      from: 'vm1.b',
      to: 'jn',
      points: [
        [500, 220],
        [500, 300],
        [340, 300],
      ],
    },
  ],
  annotations: [
    { id: 'p', point: [50, 128], text: '+', kind: 'label' },
    { id: 'n', point: [50, 244], text: '−', kind: 'label' },
  ],
  validation: {
    method: 'Ideales Amperemeter: 0 Ω; ideales Voltmeter: kein Messstrom',
    expected: { totalCurrent: 0.24, equivalentResistance: 100, totalPower: 5.76 },
  },
}
