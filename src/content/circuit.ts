import type { CircuitDefinition } from '../schematics/model'
export const parallelDemo: CircuitDefinition = {
  id: 'parallel-24v',
  version: 1,
  title: 'Zwei Wege. Eine Spannung.',
  description: '24 V Gleichspannung · zwei parallele Widerstände',
  grid: 10,
  bounds: { width: 640, height: 320 },
  nominalVoltage: 24,
  simulationMode: 'verified-static',
  components: [
    {
      id: 'v1',
      kind: 'source',
      designator: 'G1',
      label: '24 V DC',
      position: [120, 160],
      rotation: 0,
      properties: { voltage: 24 },
      terminals: [
        { id: 'v1.p', role: 'positive', offset: [0, -40] },
        { id: 'v1.n', role: 'negative', offset: [0, 40] },
      ],
    },
    {
      id: 'r1',
      kind: 'resistor',
      designator: 'R1',
      label: '100 Ω',
      position: [320, 160],
      rotation: 0,
      properties: { resistance: 100 },
      terminals: [
        { id: 'r1.a', role: 'passive', offset: [0, -40] },
        { id: 'r1.b', role: 'passive', offset: [0, 40] },
      ],
    },
    {
      id: 'r2',
      kind: 'resistor',
      designator: 'R2',
      label: '200 Ω',
      position: [500, 160],
      rotation: 0,
      properties: { resistance: 200 },
      terminals: [
        { id: 'r2.a', role: 'passive', offset: [0, -40] },
        { id: 'r2.b', role: 'passive', offset: [0, 40] },
      ],
    },
  ],
  nets: [
    { id: 'positive', terminals: ['v1.p', 'r1.a', 'r2.a'] },
    { id: 'reference', terminals: ['v1.n', 'r1.b', 'r2.b'] },
  ],
  junctions: [
    { id: 'jp', netId: 'positive', point: [320, 60] },
    { id: 'jn', netId: 'reference', point: [320, 260] },
  ],
  wires: [
    {
      id: 'wp1',
      netId: 'positive',
      from: 'v1.p',
      to: 'jp',
      points: [
        [120, 120],
        [120, 60],
        [320, 60],
      ],
    },
    {
      id: 'wp2',
      netId: 'positive',
      from: 'jp',
      to: 'r1.a',
      points: [
        [320, 60],
        [320, 120],
      ],
    },
    {
      id: 'wp3',
      netId: 'positive',
      from: 'jp',
      to: 'r2.a',
      points: [
        [320, 60],
        [500, 60],
        [500, 120],
      ],
    },
    {
      id: 'wn1',
      netId: 'reference',
      from: 'v1.n',
      to: 'jn',
      points: [
        [120, 200],
        [120, 260],
        [320, 260],
      ],
    },
    {
      id: 'wn2',
      netId: 'reference',
      from: 'jn',
      to: 'r1.b',
      points: [
        [320, 260],
        [320, 200],
      ],
    },
    {
      id: 'wn3',
      netId: 'reference',
      from: 'jn',
      to: 'r2.b',
      points: [
        [320, 260],
        [500, 260],
        [500, 200],
      ],
    },
  ],
  annotations: [
    { id: 'p', point: [90, 96], text: '+', kind: 'label' },
    { id: 'n', point: [90, 234], text: '−', kind: 'label' },
    { id: 'label-top', point: [410, 40], text: 'U = 24 V', kind: 'voltage' },
  ],
  validation: {
    method: 'Ohm und Knotenregel; analytisch geprüft',
    expected: { totalCurrent: 0.36, equivalentResistance: 200 / 3, totalPower: 8.64 },
  },
}
