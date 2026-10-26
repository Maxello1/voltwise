import { diagnosticScenario, diagnosticMechanisms } from '../content/diagnostic-scenarios'
import { diagnosticAnswerSchema, type DiagnosticAnswer } from './diagnostic-schema'
import {
  measureReversing,
  reversingNets,
  reversingVisuals,
  transitionReversing,
  type ReversingState,
} from './reversing'

export interface DiagnosticReading {
  index: number
  red: string
  black: string
  voltage: number | null
  state: ReversingState
}
export function replayDiagnosis(scenarioId: string, answer: DiagnosticAnswer) {
  const scenario = diagnosticScenario(scenarioId)
  let state = scenario.initial
  const readings: DiagnosticReading[] = []
  const inspections: { component: string; state: ReversingState; value: string }[] = []
  for (const [index, action] of answer.actions.entries()) {
    if (action[0] === 'measure')
      readings.push({
        index,
        red: action[1],
        black: action[2],
        voltage: measureReversing(state, action[1], action[2], scenario.fault),
        state,
      })
    else if (action[0] === 'inspect') {
      const value = reversingVisuals(state, scenario.fault)[action[1]]
      if (!value) throw new Error('Unbekanntes Bauteil.')
      inspections.push({ component: action[1], state, value })
    } else state = transitionReversing(state, { [action[0]]: action[1] }, scenario.fault)
  }
  return { state, readings, inspections }
}

/** Causal explanation is a declared mechanism, never guessed from free text. */
export function assessDiagnosis(
  scenarioId: string,
  difficulty: 1 | 2 | 3,
  answer: DiagnosticAnswer,
) {
  diagnosticAnswerSchema.parse(answer)
  const scenario = diagnosticScenario(scenarioId)
  const result = replayDiagnosis(scenarioId, answer)
  const location = answer.location === scenario.location
  const mechanism = answer.mechanism === scenario.mechanism
  // Only fixed wire membership is interchangeable. Closed contacts can join potentials,
  // but do not turn another net into evidence for the requested measurement.
  const net = (terminal: string) =>
    reversingNets.find((n) => (n.terminals as readonly string[]).includes(terminal))?.id
  const sameNet = (a: string, b: string) => net(a) !== undefined && net(a) === net(b)
  const matches = (r: DiagnosticReading, red: string, black: string, voltage: number) =>
    (sameNet(r.red, red) && sameNet(r.black, black) && r.voltage === voltage) ||
    (sameNet(r.red, black) && sameNet(r.black, red) && r.voltage === -voltage)
  let witnessIndex = -1
  const witness = scenario.witness.every((w) => {
    const reading = result.readings.find(
      (r) =>
        r.index > witnessIndex &&
        matches(r, w.red, w.black, w.voltage) &&
        (w.supply === undefined || r.state.inputs.supply === w.supply) &&
        (w.forward === undefined || r.state.inputs.forward === w.forward) &&
        (w.stop === undefined || r.state.inputs.stop === w.stop) &&
        (!w.direction || r.state.direction === w.direction),
    )
    if (reading) witnessIndex = reading.index
    return !!reading
  })
  const reference = result.readings.some((r) =>
    matches(r, 'g1.a', 'g1.b', scenario.fault === 'supply' ? 0 : 24),
  )
  const inspected = result.inspections.some(
    (i) =>
      i.component === scenario.location &&
      (scenario.fault === 'supply'
        ? i.state.inputs.supply && i.value === 'off'
        : i.value === 'open' &&
          (scenario.fault === 'hold-open'
            ? i.state.direction === 'forward'
            : scenario.fault === 'start-open'
              ? i.state.inputs.forward
              : scenario.fault === 'stop-open'
                ? !i.state.inputs.stop
                : scenario.fault === 'overload-open'
                  ? !i.state.tripped
                  : !i.state.ready && i.state.inputs.forward)),
  )
  const evidence = witness && (difficulty === 1 || reference) && (difficulty !== 3 || inspected)
  const score = Number(location) * 2 + Number(mechanism) * 2 + Number(evidence) * 2
  return {
    ...result,
    location,
    mechanism,
    evidence,
    score,
    correct: score === 6,
    steps: answer.actions.length,
    hints: Number(answer.hint),
    measurements: result.readings.length,
  }
}

export function gradeDiagnostic(scenarioId: string, difficulty: 1 | 2 | 3, raw: string) {
  try {
    const answer = diagnosticAnswerSchema.parse(JSON.parse(raw))
    if (!answer.location || !diagnosticMechanisms.some((m) => m.id === answer.mechanism))
      throw new Error('Bitte Fehlerort und Wirkungsweise angeben.')
    const result = assessDiagnosis(scenarioId, difficulty, answer)
    return {
      correct: result.correct,
      normalizedAnswer: `${answer.location.toUpperCase()} · ${diagnosticMechanisms.find((m) => m.id === answer.mechanism)!.text} · ${result.score}/6 Punkte`,
    }
  } catch (error) {
    return {
      correct: false,
      normalizedAnswer: '',
      invalid: error instanceof Error ? error.message : 'Ungültige Diagnose.',
    }
  }
}
