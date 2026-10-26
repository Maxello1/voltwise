/** Independent classroom reference solutions, not reconstructed from exercise answer fields. */
export const schoolApplicationAnswers: Record<string, object> = {
  'school-wave-build-v1': {
    version: 1,
    kind: 'waveform',
    amplitude: 100,
    frequencyHz: 50,
    phaseDegrees: 90,
  },
  'school-sine-chain-v1': {
    version: 1,
    kind: 'numeric-steps',
    values: { s0: '20 ms', s1: '18°', s2: '100,430523 V' },
  },
  'school-vector-place-v1': { version: 1, kind: 'phasor', x: 27.5, y: (15 * Math.sqrt(3)) / 2 },
  'school-r-chain-v1': {
    version: 1,
    kind: 'numeric-steps',
    values: { s0: '200 mA', s1: '4,8 W', s2: '0 var' },
  },
  'school-l-chain-v1': {
    version: 1,
    kind: 'numeric-steps',
    values: { s0: '31,415927 Ω', s1: '763,943727 mA', s2: '18,334649 var' },
  },
  'school-c-chain-v1': {
    version: 1,
    kind: 'numeric-steps',
    values: { s0: '31,830989 Ω', s1: '753,982237 mA', s2: '-18,095574 var' },
  },
  'school-loop-chain-v1': {
    version: 1,
    kind: 'numeric-steps',
    values: { s0: '48 mN', s1: '1,92 mN·m' },
  },
  'school-part-commutator-v1': { version: 1, kind: 'motor-parts', partId: 'commutator' },
  'school-part-brushes-v1': { version: 1, kind: 'motor-parts', partId: 'brushes' },
  'school-part-winding-v1': { version: 1, kind: 'motor-parts', partId: 'winding' },
  'school-emf-chain-v1': {
    version: 1,
    kind: 'numeric-steps',
    values: { s0: '12 A', s1: '2 A', s2: '8 W' },
  },
  'school-emf-reconstruct-v1': {
    version: 1,
    kind: 'numeric-steps',
    values: { s0: '8 V', s1: '40 V' },
  },
  'school-loads-chain-v1': {
    version: 1,
    kind: 'numeric-steps',
    values: { s0: '9 kW', s1: '10 kW', s2: '12 kW' },
  },
  'school-truth-loads-v1': {
    version: 1,
    kind: 'numeric-steps',
    values: { s0: '5 kW', s1: '8 kW', s2: '12 kW' },
  },
  'school-complement-loads-v1': {
    version: 1,
    kind: 'numeric-steps',
    values: { s0: '2 kW', s1: '10 kW', s2: '15 kW' },
  },
}
