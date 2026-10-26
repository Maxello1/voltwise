import type { CircuitDefinition } from '../schematics/model'
import { parallelDemo } from './circuit'
import { dividerDemo, lampDemo, meteringDemo, seriesDemo } from './circuits/dc'
import { controlLamp, controlHold, controlOverload } from './circuits/control'
import { reversingCircuit } from './circuits/reversing'

export interface CircuitStudy {
  circuit: CircuitDefinition
  shortTitle: string
  tier: number
  note: string
  challenge: string
  steps: { title: string; formula: string }[]
}

export const dcCircuitLibrary: CircuitStudy[] = [
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
export const controlCircuitLibrary: CircuitStudy[] = [
  {
    circuit: controlLamp,
    shortTitle: 'Taster & Meldeleuchte',
    tier: 1,
    note: 'S1 ist ein momentaner Schließer. Nur der gedrückte Taster schließt den Strompfad zur Leuchte. Kein Haltezweig.',
    challenge: 'Was ändert sich beim Loslassen?',
    steps: [
      { title: 'Ruhe', formula: 'S1 offen → H1 aus' },
      { title: 'Drücken', formula: 'S1 geschlossen → H1 ein' },
      { title: 'Loslassen', formula: 'S1 öffnet wieder → H1 aus' },
    ],
  },
  {
    circuit: controlHold,
    shortTitle: 'Schütz & Selbsthaltung',
    tier: 2,
    note: 'K1 13–14 überbrückt Start. S0 unterbricht beide parallelen Zweige. B1 ergänzt die explizite Wiederanlaufsperre.',
    challenge: 'Verfolge den Haltestrompfad.',
    steps: [
      { title: 'Start', formula: 'S1 schließt → Spule und Hilfskontakt K1 ein' },
      { title: 'Halten', formula: 'S1 öffnet → K1 hält über 13–14' },
      { title: 'Stop', formula: 'S0 öffnet → K1 fällt ab' },
    ],
  },
  {
    circuit: controlOverload,
    shortTitle: 'Überlast & Fehlersuche',
    tier: 3,
    note: 'F1 95–96 öffnet bei vorgegebener Überlast und speichert die Auslösung. Ursache beseitigen und manuell zurücksetzen. Ein neuer Start ist erforderlich.',
    challenge: 'Finde die Unterbrechung.',
    steps: [
      { title: 'Auslösen', formula: 'F1 öffnet → K1 und Haltekontakt fallen ab' },
      { title: 'Quittieren', formula: 'Ursache weg + Taster los + 24 V → Reset möglich' },
      { title: 'Neu starten', formula: 'Reset allein startet K1 nicht' },
    ],
  },
]
export const circuitLibrary: CircuitStudy[] = [
  ...dcCircuitLibrary,
  ...controlCircuitLibrary,
  {
    circuit: reversingCircuit,
    shortTitle: 'Wenden & Verriegeln',
    tier: 4,
    note: 'K1 und K2 verriegeln die Gegenrichtung über 21–22. B1 wertet zusätzlich die Startbefehle aus. Keine Motor- oder Sicherheitsberechnung.',
    challenge: 'Finde den Fehler mit Messbelegen.',
    steps: [
      { title: 'Vor', formula: 'S1 → K1 · K1 hält · K2 wird gesperrt' },
      { title: 'Wenden', formula: 'Stop → beide Starttaster los → neue Richtung' },
      { title: 'Befehlskonflikt', formula: 'Vor + Rück → B1 sperrt beide Schütze' },
    ],
  },
]
export const circuitById = new Map(circuitLibrary.map((study) => [study.circuit.id, study.circuit]))
