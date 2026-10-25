import { describe, expect, it } from 'vitest'
import { diagnosticExercises } from '../../src/content/diagnostic-learning'
import { diagnosticScenarios } from '../../src/content/diagnostic-scenarios'
import { reversingCircuit } from '../../src/content/circuits/reversing'
import { assessDiagnosis, replayDiagnosis } from '../../src/domain/diagnostics'
import { emptyDiagnosticAnswer, type DiagnosticAnswer } from '../../src/domain/diagnostic-schema'
import { gradeExercise } from '../../src/domain/grading'
import { validateCircuit } from '../../src/schematics/validation'
import {
  initialReversingState,
  measureReversing,
  reversingVisuals,
  transitionReversing,
  type ReversingFault,
  type ReversingInputs,
  type ReversingState,
} from '../../src/domain/reversing'
import { diagnosticSolutions } from '../fixtures/diagnostic-solutions'

const samples: ReversingInputs[] = Array.from({ length: 64 }, (_, bits) => ({
  supply: !!(bits & 1),
  forward: !!(bits & 2),
  reverse: !!(bits & 4),
  stop: !!(bits & 8),
  trip: !!(bits & 16),
  reset: !!(bits & 32),
}))
const faults: (ReversingFault | undefined)[] = [
  undefined,
  'supply',
  'start-open',
  'stop-open',
  'hold-open',
  'overload-open',
  'restart-blocked',
]

/** Independent reference graph: fixed net indices and contact edges, without production net constants. */
function poweredCoils(state: ReversingState, fault?: ReversingFault) {
  const visuals = reversingVisuals(state, fault)
  const edges: [string, number, number][] = [
    ['b1', 0, 1],
    ['s0', 1, 2],
    ['f1', 2, 3],
    ['s1', 3, 4],
    ['k1-hold', 3, 4],
    ['s2', 3, 5],
    ['k2-hold', 3, 5],
    ['k2-nc', 4, 6],
    ['k1-nc', 5, 7],
  ]
  const reached = new Set(visuals.g1 === 'on' ? [0] : [])
  for (let pass = 0; pass < 9; pass++)
    for (const [id, a, b] of edges)
      if (visuals[id] === 'closed' && (reached.has(a) || reached.has(b))) {
        reached.add(a)
        reached.add(b)
      }
  return { forward: reached.has(6), reverse: reached.has(7) }
}

describe('bounded reversing controls', () => {
  it('exhausts all reachable states and 64 simultaneous input samples for every supported fault', () => {
    for (const fault of faults) {
      const initial =
        fault === 'restart-blocked'
          ? {
              ...initialReversingState(),
              inputs: { ...initialReversingState().inputs, forward: true },
              ready: false,
            }
          : transitionReversing(initialReversingState(), {}, fault)
      const queue = [initial],
        visited = new Set([JSON.stringify(initial)])
      for (let cursor = 0; cursor < queue.length; cursor++)
        for (const sample of samples) {
          const previous = queue[cursor]!
          const next = transitionReversing(previous, sample, fault)
          const graph = poweredCoils(next, fault)
          expect(graph.forward && graph.reverse, `both powered: ${fault}`).toBe(false)
          expect(graph).toEqual({
            forward: next.direction === 'forward',
            reverse: next.direction === 'reverse',
          })
          expect(measureReversing(next, 'k1-coil.a', 'k1-coil.b', fault)).toBe(
            graph.forward ? 24 : 0,
          )
          expect(measureReversing(next, 'k2-coil.a', 'k2-coil.b', fault)).toBe(
            graph.reverse ? 24 : 0,
          )
          if (!sample.supply || sample.stop || sample.trip || (sample.forward && sample.reverse))
            expect(next.direction).toBe('off')
          if (next.direction !== 'off') expect(next.ready && !next.tripped).toBe(true)
          const key = JSON.stringify(next)
          if (!visited.has(key)) {
            visited.add(key)
            queue.push(next)
          }
        }
      expect(queue.length).toBeGreaterThan(50)
      expect(queue.length).toBeLessThan(512)
    }
  }, 30000)

  it('requires Stop/release/new command to change direction and rejects a conflicting command sample', () => {
    let s = transitionReversing(initialReversingState(), { forward: true })
    expect(s.direction).toBe('forward')
    s = transitionReversing(s, { forward: false, reverse: true })
    expect(s.direction).toBe('forward')
    s = transitionReversing(s, { stop: true })
    expect(s.direction).toBe('off')
    s = transitionReversing(s, { stop: false })
    expect(s.ready).toBe(false)
    s = transitionReversing(s, { reverse: false })
    s = transitionReversing(s, { reverse: true })
    expect(s.direction).toBe('reverse')
    s = transitionReversing(s, { forward: true })
    expect(s).toMatchObject({ direction: 'off', ready: false })
    expect(
      transitionReversing(initialReversingState(), { forward: true, reverse: true }).direction,
    ).toBe('off')
  })

  it('keeps trips latched, requires a reset edge and released controls, and inhibits held Start at supply return', () => {
    let s = transitionReversing(initialReversingState(), { forward: true })
    s = transitionReversing(s, { supply: false })
    s = transitionReversing(s, { supply: true })
    expect(s).toMatchObject({ ready: false, direction: 'off' })
    s = transitionReversing(s, { forward: false, trip: true, reset: true })
    expect(s.tripped).toBe(true)
    s = transitionReversing(s, { trip: false })
    expect(s.tripped).toBe(true)
    s = transitionReversing(s, { reset: false, stop: true })
    s = transitionReversing(s, { reset: true })
    expect(s.tripped).toBe(true)
    s = transitionReversing(s, { reset: false, stop: false })
    s = transitionReversing(s, { reset: true })
    expect(s).toMatchObject({ tripped: false, direction: 'off', ready: true })
    s = transitionReversing(s, { forward: true })
    expect(s.direction).toBe('forward')
  })

  it.each(faults.filter((f): f is ReversingFault => !!f))(
    'injects and clears %s electrically',
    (fault) => {
      const seed =
        fault === 'restart-blocked'
          ? { ...initialReversingState(), ready: false }
          : initialReversingState()
      const broken = transitionReversing(seed, { forward: true }, fault)
      if (fault === 'hold-open') {
        expect(broken.direction).toBe('forward')
        expect(transitionReversing(broken, { forward: false }, fault).direction).toBe('off')
      } else expect(broken.direction).toBe('off')
      const released = transitionReversing(broken, { forward: false })
      const restored = transitionReversing(transitionReversing(released, {}), { forward: true })
      expect(restored.direction).toBe('forward')
    },
  )

  it('recovers the missing B1 permission by releasing and pressing again within the same scenario', () => {
    const answer = diagnosticSolutions['diag-restart-v1']!
    const blocked = replayDiagnosis('diag-restart-v1', answer).state
    expect(blocked).toMatchObject({ direction: 'off', ready: false })
    expect(measureReversing(blocked, 'b1.a', 'b1.b', 'restart-blocked')).toBe(24)
    const released = transitionReversing(blocked, { forward: false }, 'restart-blocked')
    expect(released).toMatchObject({ direction: 'off', ready: true })
    const started = transitionReversing(released, { forward: true }, 'restart-blocked')
    expect(started.direction).toBe('forward')
    expect(measureReversing(started, 'k1-coil.a', 'k1-coil.b', 'restart-blocked')).toBe(24)
  })
  it('checks signed readings, open contact voltage, zero differences and undefined floating potentials independently', () => {
    const idle = initialReversingState()
    expect(measureReversing(idle, 'g1.a', 'g1.b')).toBe(24)
    expect(measureReversing(idle, 'g1.b', 'g1.a')).toBe(-24)
    expect(measureReversing(idle, 's1.a', 's1.b')).toBe(24)
    expect(measureReversing(idle, 'k1-coil.a', 'k1-coil.b')).toBe(0)
    const reverse = transitionReversing(idle, { reverse: true })
    // Both start/hold contacts of the inactive forward branch are open, as is K2's interlock.
    expect(measureReversing(reverse, 's1.b', 'g1.b')).toBeNull()
    expect(measureReversing(reverse, 's1.b', 'k2-nc.a')).toBe(0)
    expect(() => measureReversing(idle, 'unknown', 'g1.b')).toThrow(/Messpunkt/)
  })

  it('pins terminal partitions, symbols, device ownership and rejects altered topology, roles and geometry', () => {
    expect(validateCircuit(reversingCircuit)).toEqual([])
    expect(reversingCircuit.nets.map((n) => n.terminals)).toEqual([
      ['g1.a', 'b1.a'],
      ['b1.b', 's0.a'],
      ['s0.b', 'f1.a'],
      ['f1.b', 's1.a', 'k1-hold.a', 's2.a', 'k2-hold.a'],
      ['s1.b', 'k1-hold.b', 'k2-nc.a'],
      ['s2.b', 'k2-hold.b', 'k1-nc.a'],
      ['k2-nc.b', 'k1-coil.a'],
      ['k1-nc.b', 'k2-coil.a'],
      ['g1.b', 'k1-coil.b', 'k2-coil.b'],
    ])
    for (const change of ['role', 'device', 'net', 'endpoint', 'voltage']) {
      const c = structuredClone(reversingCircuit)
      if (change === 'role') c.components[0]!.terminals[0]!.role = '13'
      if (change === 'device') c.components.find((c) => c.id === 'k1-nc')!.deviceId = 'k2'
      if (change === 'net') c.nets[0]!.terminals.push('s2.b')
      if (change === 'endpoint') c.wires[0]!.points[0] = [0, 0]
      if (change === 'voltage') c.nominalVoltage = 230
      expect(validateCircuit(c).length, change).toBeGreaterThan(0)
    }
  })
})

describe('versioned diagnostic grading', () => {
  it('has four curated investigations per level and grades every independent reference path', () => {
    expect(diagnosticExercises).toHaveLength(15)
    for (const level of [1, 2, 3])
      expect(
        diagnosticExercises.filter((e) => e.type === 'diagnostic' && e.difficulty === level),
      ).toHaveLength(4)
    for (const exercise of diagnosticExercises)
      if (exercise.type === 'diagnostic') {
        const answer = diagnosticSolutions[exercise.scenarioId]!
        const result = assessDiagnosis(exercise.scenarioId, exercise.difficulty, answer)
        expect(result.score, exercise.id).toBe(6)
        expect(gradeExercise(exercise, JSON.stringify(answer)).correct).toBe(true)
        expect(
          assessDiagnosis(exercise.scenarioId, exercise.difficulty, { ...answer, actions: [] })
            .score,
        ).toBe(4)
        expect(
          assessDiagnosis(exercise.scenarioId, exercise.difficulty, {
            ...answer,
            location: 'k2-coil',
            mechanism: 'wrong',
          }).score,
        ).toBe(2)
      }
  })
  it('does not accept guessed answers, wrong-state measurements or unsupported points as evidence', () => {
    const answer: DiagnosticAnswer = {
      ...diagnosticSolutions['diag-start-v1']!,
      actions: [['measure', 's1.a', 's1.b']],
    }
    expect(
      assessDiagnosis('diag-start-v1', 1, { ...answer, actions: [...answer.actions] }).correct,
    ).toBe(false)
    expect(replayDiagnosis('diag-start-v1', emptyDiagnosticAnswer()).readings).toEqual([])
    expect(() =>
      replayDiagnosis('diag-start-v1', {
        ...emptyDiagnosticAnswer(),
        actions: [['measure', 'svg-x', 'g1.b']],
      }),
    ).toThrow()
    const e = diagnosticExercises.find((e) => e.type === 'diagnostic')!
    expect(gradeExercise(e, 'g1').invalid).toBeTruthy()
    const prematureInspection: DiagnosticAnswer = {
      ...diagnosticSolutions['diag-start-v1']!,
      actions: [
        ['inspect', 's1'],
        ['measure', 'g1.a', 'g1.b'],
        ['forward', true],
        ['measure', 's1.a', 's1.b'],
      ],
    }
    expect(assessDiagnosis('diag-start-v1', 3, prematureInspection).evidence).toBe(false)
    const manuallyOff: DiagnosticAnswer = {
      ...diagnosticSolutions['diag-supply-v1']!,
      actions: [
        ['supply', false],
        ['measure', 'g1.a', 'g1.b'],
      ],
    }
    expect(assessDiagnosis('diag-supply-v1', 1, manuallyOff).evidence).toBe(false)
  })
  it('requires a powered-coil inspection for the advanced holding fault and keeps hints separate from correctness', () => {
    const answer = diagnosticSolutions['diag-hold-v1']!
    const misplaced: DiagnosticAnswer = {
      ...answer,
      actions: [...answer.actions.filter((a) => a[0] !== 'inspect'), ['inspect', 'k1-hold']],
    }
    expect(assessDiagnosis('diag-hold-v1', 3, misplaced).evidence).toBe(false)
    const reversedOrder: DiagnosticAnswer = {
      ...answer,
      actions: [
        ['measure', 'g1.a', 'g1.b'],
        ['measure', 'k1-coil.a', 'k1-coil.b'],
        ['forward', true],
        ['inspect', 'k1-hold'],
        ['measure', 'k1-coil.a', 'k1-coil.b'],
      ],
    }
    expect(assessDiagnosis('diag-hold-v1', 3, reversedOrder).evidence).toBe(false)
    expect(assessDiagnosis('diag-hold-v1', 3, { ...answer, hint: true })).toMatchObject({
      correct: true,
      hints: 1,
    })
    const outcomes = diagnosticScenarios.map((s) =>
      replayDiagnosis(s.id, diagnosticSolutions[s.id]!).readings.map((r) => r.voltage),
    )
    expect(outcomes).toEqual([[0], [24, 24], [24, 24], [24, 24, 0], [24, 24], [24, 24]])
  })
})
