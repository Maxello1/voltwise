import type { Concept, Exercise, Lesson, Topic } from '../domain/models'
import { diagnosticScenarios } from './diagnostic-scenarios'

export const diagnosticTopic: Topic = {
  id: 'advanced-controls',
  subjectId: 'electrical',
  title: 'Wenden & Fehlersuche',
  description: 'Verriegelungen lesen, Spannungen deuten und Ursachen belegen.',
  prerequisites: ['controls'],
  tier: 5,
  color: 'blue',
}
export const diagnosticConcepts: Concept[] = [
  { id: 'interlocking', topicId: diagnosticTopic.id, title: 'Wendeschütze und Verriegelung' },
  { id: 'diagnostic-voltage', topicId: diagnosticTopic.id, title: 'Spannung als Diagnosebeleg' },
  {
    id: 'diagnostic-transfer',
    topicId: diagnosticTopic.id,
    title: 'Fehler systematisch eingrenzen',
  },
]
export const diagnosticLesson: Lesson = {
  id: 'reversing-diagnostics-v1',
  version: 1,
  topicId: diagnosticTopic.id,
  title: 'Zwei Richtungen systematisch prüfen',
  minutes: 9,
  sections: [
    {
      title: 'Zwei Zweige, gemeinsame Abschaltung',
      body: 'S0 und F1 liegen vor der Verzweigung und unterbrechen beide Richtungen. S1 startet K1 (Vor), S2 startet K2 (Rück). Der zugeordnete Hilfsschließer 13–14 hält die eigene Spule. Der Öffner 21–22 des jeweils anderen Schützes liegt vor der Spule und verhindert das Zuschalten der Gegenrichtung.',
    },
    {
      title: 'B1 macht die Befehle eindeutig',
      body: 'Das zusätzliche abstrakte B1 gibt nach Stop, Überlast oder Spannungsausfall erst frei, wenn beide Starttaster losgelassen wurden. Zwei gleichzeitige Startbefehle sperren B1 und lassen beide Schütze abfallen. Zum Wenden: Stop drücken, beide Starttaster loslassen, Stop loslassen, die neue Richtung drücken. Ein unerwarteter Spulenabfall verlangt ebenfalls Loslassen. Diese Regeln gehören ausdrücklich zu B1; sie folgen nicht allein aus zwei gewöhnlichen Öffnerverriegelungen.',
    },
    {
      title: 'Potenziale statt Leitungsfarben',
      body: 'G1− ist das Bezugspotenzial 0 V. Der aktive ideale Ausgang G1+ hat 24 V; der abgeschaltete Ausgang hat im Modell 0 V. Geschlossene ideale Kontakte verbinden gleiche Potenziale. Eine nicht gespeiste Spulenklemme A1 liegt über den passiven DC-Spulenpfad an A2 auf 0 V. Ein allseitig isoliertes Teilnetz hat kein bestimmtes Bezugspotenzial. Dort zeigt die Messung „unbestimmt“, außer beide Punkte gehören zur selben Potenzialgruppe: Ihre Differenz ist 0 V. Es werden keine Ströme, Widerstände oder Einschalttransienten berechnet.',
      formula: 'U(Rot, Schwarz) = φ(Rot) − φ(Schwarz)',
    },
    {
      title: 'Beobachtung, Beleg, Erklärung',
      body: 'Erst das Symptom nachstellen, dann Versorgung und betroffene Kontaktstrecke messen. 24 V über einem offenen Kontakt beweisen nur unter den genannten Bedingungen die Unterbrechung. 0 V allein beweisen keinen geschlossenen Kontakt. Beim fehlenden Haltekontakt vergleiche A1–A2 während des Drückens und nach dem Loslassen. Die Fehlersuche bewertet Fehlerort, gewählten Wirkmechanismus und passende protokollierte Belege mit je zwei Punkten. Freier Text wird nicht automatisch gedeutet.',
    },
    {
      title: 'Grenzen des Lehrmodells',
      body: 'Die Kontakte schalten ideal und ohne Verzögerung. Es gibt keinen mechanischen Verriegelungsnachweis, keinen Motor-Leistungskreis, keine Drehzahl und keine Auslaufzeit. Die Steuerfreigabe ist kein Sicherheitsbaustein. Diese virtuelle Fehlersuche ist keine Anleitung zum Messen an eingeschalteten Industrieanlagen.',
    },
  ],
}
const base = {
  version: 1,
  topicId: diagnosticTopic.id,
  reviewable: false,
  circuitId: 'control-reversing-v1',
}
export const diagnosticExercises: Exercise[] = [
  ...diagnosticScenarios.flatMap((s) =>
    s.difficulties.map((difficulty) => ({
      ...base,
      id: `${s.id}-l${difficulty}`,
      difficulty,
      type: 'diagnostic' as const,
      scenarioId: s.id,
      conceptIds: ['diagnostic-transfer', 'diagnostic-voltage'],
      title: `${difficulty === 1 ? 'Geführt' : difficulty === 2 ? 'Eigenständig' : 'Herausforderung'} · Fall ${diagnosticScenarios.indexOf(s) + 1}`,
      prompt: s.symptom,
      hint: s.hint,
      explanation: s.explanation,
    })),
  ),
  {
    ...base,
    id: 'reversing-identify-interlock-v1',
    difficulty: 1,
    conceptIds: ['interlocking'],
    type: 'schematic',
    title: 'Welcher Kontakt sperrt Vor?',
    prompt: 'Wähle den Öffner aus, der K1 sperrt, solange K2 angezogen ist.',
    answer: 'k2-nc',
    answerLabel: 'K2 · 21–22 im Vor-Zweig',
    hint: 'Der Kontakt liegt im linken Zweig vor K1 A1.',
    explanation:
      'Der K2-Öffner 21–22 öffnet mit der K2-Spule. Er ist elektrisch in Reihe zur K1-Spule geschaltet; die Gerätezuordnung erfolgt über K2.',
  },
  {
    ...base,
    id: 'reversing-conflict-v1',
    difficulty: 2,
    conceptIds: ['interlocking'],
    type: 'choice',
    title: 'Zwei Startbefehle gleichzeitig',
    prompt:
      'Beide Schütze sind aus. Vor und Rück werden in einem Eingangsschritt gleichzeitig gedrückt. Wie reagiert das ausdrücklich dargestellte B1-Modell?',
    options: [
      {
        id: 'blocked',
        text: 'B1 sperrt; beide Schütze bleiben aus, bis beide Starttaster losgelassen wurden.',
      },
      { id: 'forward', text: 'Vor gewinnt immer.' },
      { id: 'both', text: 'Beide Spulen werden kurz erregt.' },
    ],
    answer: 'blocked',
    hint: 'B1 enthält zusätzlich eine Befehlsauswertung.',
    explanation:
      'B1 behandelt gleichzeitige Startbefehle als Konflikt. Eine reine Öffnerverriegelung ohne weitere Logik würde die Gleichzeitigkeit zweier realer Anzugsvorgänge nicht mit dieser diskreten Regel entscheiden.',
  },
  {
    ...base,
    id: 'reversing-voltage-sign-v1',
    difficulty: 2,
    conceptIds: ['diagnostic-voltage'],
    type: 'numeric',
    title: 'Messspitzen vertauscht',
    prompt:
      'G1+ liegt auf 24 V, G1− auf 0 V. Rot ist an G1− und Schwarz an G1+. Welche Spannung zeigt das ideale Voltmeter?',
    answer: -24,
    unit: 'V',
    tolerance: 0,
    hint: 'Rechne Potenzial Rot minus Potenzial Schwarz.',
    explanation:
      'U = 0 V − 24 V = −24 V. Die vertauschte Messrichtung ändert das Vorzeichen, nicht den Betrag.',
  },
]
