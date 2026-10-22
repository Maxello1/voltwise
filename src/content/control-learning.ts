import type { Concept, Exercise, Lesson, Topic } from '../domain/models'

export const controlTopic: Topic = {
  id: 'controls',
  subjectId: 'electrical',
  title: 'Steuern & Selbsthaltung',
  description: 'Kontakte lesen, Schütze schalten und Fehler eingrenzen.',
  prerequisites: ['circuits'],
  tier: 4,
  color: 'sage',
}
export const controlConcepts: Concept[] = [
  { id: 'control-contacts', topicId: 'controls', title: 'Taster und Kontaktzustände' },
  { id: 'self-hold', topicId: 'controls', title: 'Schütz und Selbsthaltung' },
  { id: 'control-faults', topicId: 'controls', title: 'Überlast und Wiederanlauf' },
]
export const controlLesson: Lesson = {
  id: 'control-basics-v1',
  version: 1,
  topicId: 'controls',
  title: 'Vom Taster zur Selbsthaltung',
  minutes: 7,
  sections: [
    {
      title: 'Ruhezustand und Betätigung',
      body: 'Ein Schließer (NO) ist unbetätigt offen und schließt bei Betätigung. Ein Öffner (NC) ist unbetätigt geschlossen und öffnet bei Betätigung. Ein Taster kehrt nach dem Loslassen zurück. S1 ist ein Schließertaster mit den Anschlüssen 13–14. Im ersten 24-V-Lehrstromkreis leuchtet H1 nur, solange S1 gedrückt bleibt.',
    },
    {
      title: 'Spule und zugeordneter Hilfskontakt',
      body: 'Die Spule K1 hat die Anschlüsse A1–A2. Wird sie erregt, zieht das Schütz an. Sein mechanisch zugeordneter Hilfsschließer K1 13–14 schließt gleichzeitig. Spule und Kontakt sind zwei Zeichen desselben Geräts, keine elektrische Verbindung untereinander. Die Zuordnung folgt der Gerätekennung K1.',
    },
    {
      title: 'Der zweite Weg hält',
      body: 'Start S1 und der Hilfsschließer K1 liegen parallel. Beim Drücken von Start zieht K1 an. Danach hält der Hilfskontakt den Spulenstrompfad auch bei losgelassenem Start geschlossen. Der Stop-Öffner S0 liegt vor beiden Zweigen in Reihe: Drücken von Stop unterbricht beide Wege. Auch wenn Start gleichzeitig gedrückt wird, bleibt K1 abgefallen.',
      formula:
        'K1 an = 24 V ∧ B1 ∧ Stop geschlossen ∧ F1 geschlossen ∧ (Start geschlossen ∨ K1-Hilfskontakt geschlossen)',
    },
    {
      title: 'Überlast auslösen und manuell zurücksetzen',
      body: 'Im dritten Modell öffnet der Überlastkontakt F1 95–96 nach dem Auslösen und bleibt gespeichert offen. K1 fällt ab. Das Beseitigen der Fehlerursache allein schließt F1 noch nicht. Im Lehrmodell ist ein manueller Reset nur bei vorhandenen 24 V, beseitigter Fehlerursache sowie losgelassenem Start und Stop möglich. Reset quittiert F1, startet K1 aber nicht. Ein neuer Startdruck ist erforderlich. Die Überlast wird hier vorgegeben; es gibt keine Motorstrom- oder Erwärmungsberechnung.',
    },
    {
      title: 'Spannung zurück bedeutet nicht Start',
      body: 'Bei Spannungsausfall fällt K1 sofort ab und sein Hilfskontakt öffnet. Bei losgelassenem Start bleibt eine gewöhnliche Selbsthaltung nach Spannungsrückkehr aus. Bei festgehaltenem oder klemmendem Start könnte sie jedoch selbsttätig wieder anziehen. Deshalb zeigen die beiden K1-Modelle zusätzlich B1: eine abstrahierte Freigabe, die nach Stop, Ausfall oder Überlast erst nach Loslassen von Start wieder schließt. B1 ist zusätzliche Logik, kein gewöhnlicher K1-Hilfskontakt und kein nachgewiesener Sicherheitsbaustein.',
    },
    {
      title: 'Systematisch suchen',
      body: 'K1 zieht nicht an? Prüfe im Lehrmodell zuerst die Steuerspannung, dann B1, S0 und F1 und zuletzt den Startzweig. Ein offener Serienkontakt genügt zur Unterbrechung. Im Schaltplanraum kannst du alle drei Schaltungen ausprobieren und drei vorbereitete Fehlerszenarien laden. Dargestellt sind ideale, verzögerungsfreie Steuerstromkreise ohne Leistungskreis, Kurzschluss-, Leitungsbruch-, Schweißkontakt- oder Sicherheitsanalyse. Keine Anleitung zur Arbeit an Anlagen.',
    },
  ],
}
const base = { version: 1, topicId: 'controls', difficulty: 2 as const, reviewable: false }
export const controlExercises: Exercise[] = [
  {
    ...base,
    id: 'control-nc-rest-v1',
    conceptIds: ['control-contacts'],
    difficulty: 1,
    reviewable: true,
    type: 'choice',
    title: 'Öffner in Ruhe',
    prompt: 'Wie verhält sich ein idealer Öffnerkontakt (NC), wenn sein Taster nicht betätigt ist?',
    options: [
      { id: 'closed', text: 'Er ist geschlossen.' },
      { id: 'open', text: 'Er ist offen.' },
      { id: 'coil', text: 'Das hängt immer von einer Schützspule ab.' },
    ],
    answer: 'closed',
    hint: 'Der Name beschreibt, was bei Betätigung passiert.',
    explanation:
      'Ein Öffner ist in Ruhe geschlossen und öffnet bei Betätigung. Ein Schließer verhält sich umgekehrt. Die Ruhelage bezieht sich auf das unbetätigte Gerät.',
  },
  {
    ...base,
    id: 'control-identify-start-v1',
    conceptIds: ['control-contacts'],
    difficulty: 1,
    type: 'schematic',
    circuitId: 'control-lamp-v1',
    title: 'Den Taster erkennen',
    prompt: 'Wähle den momentanen Schließertaster aus, der H1 einschaltet.',
    answer: 's1',
    answerLabel: 'S1 · Schließertaster 13–14',
    hint: 'Die Betätigung ist links am Kontakt eingezeichnet.',
    explanation:
      'S1 ist ein Schließertaster. Beim Drücken schließt er 13–14; beim Loslassen öffnet er. H1 ist die Meldeleuchte und G1 die 24-V-Quelle.',
  },
  {
    ...base,
    id: 'control-lamp-release-v1',
    conceptIds: ['control-contacts'],
    type: 'choice',
    circuitId: 'control-lamp-v1',
    title: 'Was bleibt nach dem Loslassen?',
    prompt: '24 V sind vorhanden. Du drückst S1, H1 leuchtet. Dann lässt du S1 los. Was passiert?',
    options: [
      { id: 'off', text: 'H1 erlischt, weil S1 wieder öffnet.' },
      { id: 'hold', text: 'H1 bleibt durch Selbsthaltung an.' },
      { id: 'trip', text: 'Ein Überlastkontakt löst aus.' },
    ],
    answer: 'off',
    hint: 'Gibt es einen zweiten Strompfad um S1 herum?',
    explanation:
      'Hier gibt es keine Selbsthaltung und keinen Überlastkontakt. Der losgelassene Schließertaster unterbricht den einzigen Strompfad zur Leuchte.',
  },
  {
    ...base,
    id: 'control-identify-coil-v1',
    conceptIds: ['self-hold'],
    type: 'schematic',
    circuitId: 'control-hold-v1',
    title: 'Spule und Kontakt unterscheiden',
    prompt: 'Wähle die K1-Spule mit den Anschlüssen A1–A2 aus, nicht den zugehörigen Hilfskontakt.',
    answer: 'k1-coil',
    answerLabel: 'K1 · Spule A1–A2',
    hint: 'Die Spule liegt unterhalb der parallelen Start- und Haltezweige.',
    explanation:
      'Die K1-Spule liegt unten. Der Hilfsschließer K1 13–14 liegt parallel zu Start. Beide haben dieselbe Gerätekennung, aber getrennte elektrische Anschlüsse.',
  },
  {
    ...base,
    id: 'control-hold-release-v1',
    conceptIds: ['self-hold'],
    type: 'choice',
    circuitId: 'control-hold-v1',
    title: 'Der Haltezweig übernimmt',
    prompt:
      '24 V und B1 sind freigegeben, Stop ist losgelassen. Start wird gedrückt und wieder losgelassen. Was hält K1 angezogen?',
    options: [
      { id: 'aux', text: 'Der geschlossene K1-Hilfskontakt parallel zu Start.' },
      { id: 'start', text: 'Start bleibt mechanisch geschlossen.' },
      { id: 'energy', text: 'Gespeicherte Energie in der idealen Spule, ohne Strompfad.' },
    ],
    answer: 'aux',
    hint: 'Verfolge den rechten Zweig um S1 herum.',
    explanation:
      'K1 schließt seinen Hilfskontakt 13–14. Dieser überbrückt Start und erhält den Strompfad zur Spule. Stop und B1 müssen weiterhin geschlossen sein.',
  },
  {
    ...base,
    id: 'control-stop-priority-v1',
    conceptIds: ['self-hold', 'control-contacts'],
    type: 'choice',
    circuitId: 'control-hold-v1',
    title: 'Zwei Taster gleichzeitig',
    prompt: 'K1 ist angezogen. Start und Stop werden gleichzeitig gedrückt. Was geschieht mit K1?',
    options: [
      { id: 'off', text: 'K1 fällt ab; der Stop-Öffner unterbricht beide Zweige.' },
      { id: 'on', text: 'K1 bleibt durch den Hilfskontakt angezogen.' },
      { id: 'race', text: 'Das Ergebnis ist im Modell zufällig.' },
    ],
    answer: 'off',
    hint: 'S0 liegt vor der Verzweigung von S1 und K1.',
    explanation:
      'Stop hat Vorrang: S0 öffnet den gemeinsamen Serienpfad. Auch ein geschlossener Start- oder Hilfskontakt kann diese Unterbrechung nicht überbrücken. B1 verlangt danach Loslassen von Start.',
  },
  {
    ...base,
    difficulty: 3,
    id: 'control-overload-path-v1',
    conceptIds: ['control-faults'],
    type: 'schematic',
    circuitId: 'control-overload-v1',
    title: 'Die Überlast-Unterbrechung finden',
    prompt:
      'F1 hat ausgelöst. Wähle den Kontakt aus, der deswegen den Spulenstrompfad unterbricht. Der Plan zeigt die unbetätigte Ausgangslage.',
    answer: 'f1-contact',
    answerLabel: 'F1 · Überlastkontakt 95–96',
    hint: 'Suche den Öffner zwischen Stop und der Startverzweigung.',
    explanation:
      'F1 95–96 ist der dem Überlastgerät zugeordnete Öffner. Nach dem Auslösen bleibt er bis zum zulässigen manuellen Reset offen. Das Bild zeigt die Ausgangslage; im Simulator kannst du das Öffnen beobachten.',
  },
  {
    ...base,
    difficulty: 3,
    id: 'control-reset-v1',
    conceptIds: ['control-faults'],
    type: 'choice',
    circuitId: 'control-overload-v1',
    title: 'Reset ist kein Start',
    prompt:
      'F1 ist ausgelöst, die Fehlerursache beseitigt, 24 V sind da und beide Taster losgelassen. Du setzt F1 manuell zurück. Was passiert?',
    options: [
      { id: 'ready', text: 'F1 schließt; K1 bleibt bis zu einem neuen Startdruck abgefallen.' },
      { id: 'run', text: 'K1 zieht durch Reset sofort an.' },
      { id: 'supply', text: 'Die 24-V-Quelle wird durch Reset ausgeschaltet.' },
    ],
    answer: 'ready',
    hint: 'Nach dem Abfallen ist auch der K1-Hilfskontakt offen.',
    explanation:
      'Reset schließt F1, aber weder Start noch der K1-Hilfskontakt ist geschlossen. Erst ein neuer Startdruck schließt den Spulenstrompfad. Mit noch vorhandener Fehlerursache wird Reset nicht akzeptiert.',
  },
  {
    ...base,
    difficulty: 3,
    id: 'control-supply-restore-v1',
    conceptIds: ['control-faults', 'self-hold'],
    type: 'choice',
    circuitId: 'control-overload-v1',
    title: 'Start beim Ausfall festgehalten',
    prompt:
      'K1 ist angezogen. Start bleibt gedrückt, während 24 V ausfallen und zurückkehren. Wie reagiert dieses Modell mit der zusätzlichen B1-Sperre?',
    options: [
      { id: 'inhibit', text: 'K1 bleibt aus, bis Start losgelassen und erneut gedrückt wird.' },
      { id: 'run', text: 'K1 zieht bei Spannungsrückkehr sofort an.' },
      { id: 'f1', text: 'Der Spannungsausfall löst immer F1 aus.' },
    ],
    answer: 'inhibit',
    hint: 'B1 überwacht das Loslassen von Start nach einer Unterbrechung.',
    explanation:
      'B1 bleibt bei festgehaltenem Start offen. Erst Loslassen gibt B1 wieder frei; ein neuer Startdruck ist erforderlich. Eine gewöhnliche Selbsthaltung ohne B1 könnte bei festgehaltenem Start wieder anlaufen. Spannungsausfall allein ist hier keine Überlast.',
  },
  {
    ...base,
    difficulty: 3,
    id: 'control-fault-latch-v1',
    conceptIds: ['control-faults'],
    type: 'choice',
    circuitId: 'control-overload-v1',
    title: 'Die Ursache ist weg – und jetzt?',
    prompt:
      'F1 hat ausgelöst. Du beseitigst die Fehlerursache und drückst Start, ohne F1 zurückzusetzen. 24 V sind da, Stop ist losgelassen. Warum zieht K1 nicht an?',
    options: [
      { id: 'latched', text: 'F1 95–96 bleibt bis zum zulässigen manuellen Reset offen.' },
      { id: 'start', text: 'S1 ist ein Öffner und öffnet beim Drücken.' },
      { id: 'coil', text: 'Jede Spule benötigt Wechselspannung.' },
    ],
    answer: 'latched',
    hint: 'Fehlerursache und gespeicherter Auslösezustand sind zwei verschiedene Dinge.',
    explanation:
      'Das Beseitigen der Ursache quittiert F1 nicht. Start loslassen, F1 bei vorhandener Spannung und losgelassenem Stop manuell zurücksetzen, dann neu starten. Die hier verwendete K1-Spule ist für idealisierte 24 V DC modelliert.',
  },
]
