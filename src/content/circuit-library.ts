import type { CircuitDefinition } from '../schematics/model'
import { parallelDemo } from './circuit'
import { dividerDemo, lampDemo, meteringDemo, seriesDemo } from './circuits/dc'

export interface CircuitStudy {
  circuit: CircuitDefinition
  shortTitle: string
  tier: number
  note: string
  challenge: string
  steps: { title: string; formula: string }[]
}

export const circuitLibrary: CircuitStudy[] = [
  {
    circuit: parallelDemo,
    shortTitle: 'Parallelschaltung',
    tier: 2,
    note: 'Beide Widerstände verbinden dieselben zwei Knoten. An jedem liegen deshalb 24 V. Die Zweigströme addieren sich.',
    challenge: 'Zwei Zweige, ein Gesamtstrom.',
    steps: [
      { title: 'Zweig R1', formula: 'I₁ = 24 V / 100 Ω = 0,24 A' },
      { title: 'Zweig R2', formula: 'I₂ = 24 V / 200 Ω = 0,12 A' },
      { title: 'Knotenregel', formula: 'Iges = 0,24 A + 0,12 A = 0,36 A' },
    ],
  },
  {
    circuit: seriesDemo,
    shortTitle: 'Reihenschaltung',
    tier: 1,
    note: 'Ohne Verzweigung fließt durch R1 und R2 derselbe Strom. Die Widerstände und ihre Teilspannungen addieren sich.',
    challenge: 'Gleicher Strom. Verschiedene Teilspannungen.',
    steps: [
      { title: 'Widerstände addieren', formula: 'Rges = 100 Ω + 200 Ω = 300 Ω' },
      { title: 'Gemeinsamer Strom', formula: 'I = 24 V / 300 Ω = 0,08 A' },
      { title: 'Spannungsaufteilung', formula: 'U₁ = 8 V · U₂ = 16 V · Summe: 24 V' },
    ],
  },
  {
    circuit: dividerDemo,
    shortTitle: 'Spannungsteiler',
    tier: 2,
    note: 'Uaus liegt zwischen dem mittleren Knoten und Quellenminus, also über R2. Es ist kein Verbraucher angeschlossen: Der Teiler ist unbelastet.',
    challenge: 'Finde den Ausgang und berechne seine Spannung.',
    steps: [
      { title: 'Gesamtwiderstand', formula: 'Rges = 1 kΩ + 2 kΩ = 3 kΩ' },
      { title: 'Teilerstrom', formula: 'I = 12 V / 3 000 Ω = 0,004 A' },
      { title: 'Ausgang über R2', formula: 'Uaus = 12 V · 2 / 3 = 8 V' },
    ],
  },
  {
    circuit: lampDemo,
    shortTitle: 'Schalter & Lampe',
    tier: 1,
    note: 'S1 ist hier geschlossen und ideal widerstandslos. Die Lampe wird vereinfacht als fester 60-Ω-Widerstand betrachtet. Echte Glühlampen ändern ihren Widerstand mit der Temperatur.',
    challenge: 'Lies den Kontakt und verfolge den Strompfad.',
    steps: [
      { title: 'Geschlossener Kontakt', formula: 'S1: ideal 0 Ω · Rges = 60 Ω' },
      { title: 'Lampenstrom', formula: 'I = 12 V / 60 Ω = 0,2 A' },
      { title: 'Lampenleistung', formula: 'P = 12 V · 0,2 A = 2,4 W' },
    ],
  },
  {
    circuit: meteringDemo,
    shortTitle: 'Richtig messen',
    tier: 2,
    note: 'A1 liegt im Strompfad und hat ideal 0 Ω. V1 liegt parallel zu R1 und nimmt ideal keinen Strom auf. Deshalb verändern die idealen Messgeräte die Lastwerte nicht.',
    challenge: 'Ordne die Messgeräte ihren Aufgaben zu.',
    steps: [
      { title: 'Laststrom / A1', formula: 'I = 24 V / 100 Ω = 0,24 A' },
      { title: 'Spannung an R1 / V1', formula: 'U_R1 = 24 V · U_A1 = 0 V' },
      { title: 'Ideale Messgeräte', formula: 'I_V1 = 0 A · P_Last = 5,76 W' },
    ],
  },
]
export const circuitById = new Map(circuitLibrary.map((study) => [study.circuit.id, study.circuit]))
