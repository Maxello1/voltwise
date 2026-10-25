import {
  initialReversingState,
  type ReversingFault,
  type ReversingState,
} from '../domain/reversing'

export interface DiagnosticScenario {
  id: string
  version: 1
  circuitId: 'control-reversing-v1'
  circuitVersion: 1
  modelRevision: 'reversing-v1'
  measurementSet: 'reversing-terminals-v1'
  fault: ReversingFault
  location: string
  mechanism: string
  initial: ReversingState
  symptom: string
  explanation: string
  hint: string
  difficulties: readonly [1 | 2 | 3, 1 | 2 | 3]
  witness: {
    red: string
    black: string
    voltage: number
    supply?: boolean
    forward?: boolean
    stop?: boolean
    direction?: ReversingState['direction']
  }[]
}
export const diagnosticMechanisms = [
  { id: 'no-supply', text: 'Die Steuerspannung fehlt; die Spulen erhalten keine 24 V.' },
  { id: 'start-path', text: 'Der betätigte Startkontakt schließt den Anzugspfad nicht.' },
  { id: 'stop-path', text: 'Der losgelassene Stopkontakt unterbricht den gemeinsamen Pfad.' },
  {
    id: 'holding-path',
    text: 'Der Hilfsschließer bleibt trotz erregter Spule offen; die Selbsthaltung fehlt.',
  },
  {
    id: 'overload-path',
    text: '95–96 bleibt trotz quittierter Auslösung offen und unterbricht die Freigabe.',
  },
  {
    id: 'restart-path',
    text: 'B1 wartet nach einer Unterbrechung auf das Loslassen beider Starttaster.',
  },
] as const
const common = {
  version: 1,
  circuitId: 'control-reversing-v1',
  circuitVersion: 1,
  modelRevision: 'reversing-v1',
  measurementSet: 'reversing-terminals-v1',
} as const
export const diagnosticScenarios: DiagnosticScenario[] = [
  {
    ...common,
    id: 'diag-supply-v1',
    fault: 'supply',
    location: 'g1',
    mechanism: 'no-supply',
    initial: { ...initialReversingState(), ready: false },
    difficulties: [1, 2],
    symptom: 'Weder Vor noch Rück lässt sich einschalten. Die Steuerversorgung ist angefordert.',
    explanation:
      'Am Ausgang G1 fehlen die 24 V. In diesem Modell fällt der abgeschaltete Ausgang auf 0 V gegen G1−. B1 und beide Schütze bleiben aus. Eine Netzverbindung allein beweist keine vorhandene Spannung.',
    hint: 'Beginne mit Rot an G1+ und Schwarz an G1−. Prüfe dann K1 A1 gegen A2.',
    witness: [{ red: 'g1.a', black: 'g1.b', voltage: 0, supply: true }],
  },
  {
    ...common,
    id: 'diag-start-v1',
    fault: 'start-open',
    location: 's1',
    mechanism: 'start-path',
    initial: initialReversingState(),
    difficulties: [1, 3],
    symptom: 'Vor startet nicht. Stop und Überlast sind in ihrer freigegebenen Ausgangslage.',
    explanation:
      'S1 bleibt auch gedrückt offen. Bei angefordertem Vor liegen 24 V über 13–14, während A1 über die Spule auf 0 V liegt. K1 kann nicht anziehen; sein Hilfsschließer bleibt deshalb ebenfalls offen.',
    hint: 'Drücke Vor. Prüfe S1 13 gegen 14 und vergleiche Betätigung mit Kontaktzustand.',
    witness: [{ red: 's1.a', black: 's1.b', voltage: 24, forward: true, direction: 'off' }],
  },
  {
    ...common,
    id: 'diag-stop-v1',
    fault: 'stop-open',
    location: 's0',
    mechanism: 'stop-path',
    initial: initialReversingState(),
    difficulties: [1, 2],
    symptom: 'Beide Richtungen bleiben aus, obwohl Stop losgelassen ist.',
    explanation:
      'S0 ist ein Öffner und müsste losgelassen geschlossen sein. Er bleibt fehlerhaft offen. Bei angefordertem Vor fallen 24 V über 11–12 ab; der gemeinsame Pfad zu beiden Richtungen ist unterbrochen.',
    hint: 'Stop losgelassen lassen, Vor drücken. Miss S0 11 gegen 12.',
    witness: [{ red: 's0.a', black: 's0.b', voltage: 24, forward: true, stop: false }],
  },
  {
    ...common,
    id: 'diag-hold-v1',
    fault: 'hold-open',
    location: 'k1-hold',
    mechanism: 'holding-path',
    initial: initialReversingState(),
    difficulties: [2, 3],
    symptom: 'Vor zieht beim Drücken an und fällt beim Loslassen wieder ab.',
    explanation:
      'K1 13–14 bleibt trotz erregter K1-Spule offen. Solange S1 gedrückt ist, liegen 24 V an A1–A2. Nach Loslassen fehlen Haltepfad und Spulenspannung. B1 verlangt nach diesem Abfall erneut das Loslassen beider Starttaster.',
    hint: 'Miss K1 A1 gegen A2 zuerst mit Vor gedrückt (24 V), dann nach dem Loslassen (0 V). Inspiziere den K1-Hilfsschließer bei angezogener Spule.',
    witness: [
      { red: 'k1-coil.a', black: 'k1-coil.b', voltage: 24, forward: true, direction: 'forward' },
      { red: 'k1-coil.a', black: 'k1-coil.b', voltage: 0, forward: false, direction: 'off' },
    ],
  },
  {
    ...common,
    id: 'diag-overload-v1',
    fault: 'overload-open',
    location: 'f1',
    mechanism: 'overload-path',
    initial: initialReversingState(),
    difficulties: [2, 3],
    symptom:
      'Nach einer Überlastauslösung und Quittierung startet keine Richtung. Die Auslöseursache ist beseitigt; die Auslösung ist quittiert.',
    explanation:
      'Der F1-Öffner 95–96 bleibt hier fehlerhaft offen, obwohl die Auslösung bereits quittiert wurde. Bei gedrücktem Vor liegen 24 V über diesem Kontakt. Das ist ein Kontaktfehler, zusätzlich zur normalen gespeicherten Auslösung eines intakten F1.',
    hint: 'Unterscheide gespeicherte Auslösung und tatsächlichen Kontaktzustand. Drücke Vor und miss F1 95 gegen 96.',
    witness: [{ red: 'f1.a', black: 'f1.b', voltage: 24, forward: true }],
  },
  {
    ...common,
    id: 'diag-restart-v1',
    fault: 'restart-blocked',
    location: 'b1',
    mechanism: 'restart-path',
    initial: {
      ...initialReversingState(),
      inputs: { ...initialReversingState().inputs, forward: true },
      ready: false,
    },
    difficulties: [1, 3],
    symptom:
      'Nach Rückkehr der Versorgung bleibt Vor aus. Der Vor-Taster wurde beim Ausfall festgehalten und ist noch gedrückt.',
    explanation:
      'B1 fehlt die Loslassbedingung. 24 V über in–out zeigen die offene Freigabe bei gehaltenem Vor. Beide Starttaster loslassen und anschließend neu starten gibt das Modell frei. Das ist die dokumentierte B1-Bedingung, kein defekter Schütz und keine Eigenschaft einer gewöhnlichen Selbsthaltung.',
    hint: 'Miss B1 in gegen out, solange Vor noch gehalten ist. Probiere anschließend Loslassen und erneutes Drücken.',
    witness: [{ red: 'b1.a', black: 'b1.b', voltage: 24, forward: true, direction: 'off' }],
  },
]
export function diagnosticScenario(id: string): DiagnosticScenario {
  const result = diagnosticScenarios.find((s) => s.id === id)
  if (!result) throw new Error('Unbekannte Fehlersuchversion.')
  return result
}
