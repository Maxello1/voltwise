import type { DiagnosticAnswer } from '../../src/domain/diagnostic-schema'

/** Editorial reference paths, declared independently of scenario witness metadata. */
export const diagnosticSolutions: Record<string, DiagnosticAnswer> = {
  'diag-supply-v1': {
    version: 1,
    hint: false,
    location: 'g1',
    mechanism: 'no-supply',
    actions: [
      ['measure', 'g1.a', 'g1.b'],
      ['inspect', 'g1'],
    ],
  },
  'diag-start-v1': {
    version: 1,
    hint: false,
    location: 's1',
    mechanism: 'start-path',
    actions: [
      ['measure', 'g1.a', 'g1.b'],
      ['forward', true],
      ['measure', 's1.a', 's1.b'],
      ['inspect', 's1'],
    ],
  },
  'diag-stop-v1': {
    version: 1,
    hint: false,
    location: 's0',
    mechanism: 'stop-path',
    actions: [
      ['measure', 'g1.a', 'g1.b'],
      ['forward', true],
      ['measure', 's0.a', 's0.b'],
      ['inspect', 's0'],
    ],
  },
  'diag-hold-v1': {
    version: 1,
    hint: false,
    location: 'k1-hold',
    mechanism: 'holding-path',
    actions: [
      ['measure', 'g1.a', 'g1.b'],
      ['forward', true],
      ['inspect', 'k1-hold'],
      ['measure', 'k1-coil.a', 'k1-coil.b'],
      ['forward', false],
      ['measure', 'k1-coil.a', 'k1-coil.b'],
    ],
  },
  'diag-overload-v1': {
    version: 1,
    hint: false,
    location: 'f1',
    mechanism: 'overload-path',
    actions: [
      ['measure', 'g1.a', 'g1.b'],
      ['forward', true],
      ['measure', 'f1.a', 'f1.b'],
      ['inspect', 'f1'],
    ],
  },
  'diag-restart-v1': {
    version: 1,
    hint: false,
    location: 'b1',
    mechanism: 'restart-path',
    actions: [
      ['measure', 'g1.a', 'g1.b'],
      ['measure', 'b1.a', 'b1.b'],
      ['inspect', 'b1'],
    ],
  },
}
