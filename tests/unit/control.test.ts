import { describe, expect, it } from 'vitest'
import {
  initialControlState,
  transitionControl,
  controlVisuals,
  linkedContactState,
  type ControlInputs,
  type ControlKind,
  type ControlState,
} from '../../src/domain/control'
import { controlLamp, controlHold, controlOverload } from '../../src/content/circuits/control'
import { validateCircuit } from '../../src/schematics/validation'
import { controlExercises } from '../../src/content/control-learning'
import { controlScenarios } from '../../src/content/control-scenarios'
import { gradeExercise } from '../../src/domain/grading'

const step = (state: ControlState, changes: Partial<ControlInputs>) =>
  transitionControl('overload', state, changes)
const run = (...inputs: Partial<ControlInputs>[]) => inputs.reduce(step, initialControlState())
const samples: ControlInputs[] = Array.from({ length: 32 }, (_, value) => ({
  supply: !!(value & 1),
  start: !!(value & 2),
  stop: !!(value & 4),
  fault: !!(value & 8),
  reset: !!(value & 16),
}))

// Independent ideal contact-path oracle in tests. No SVG geometry or simulation equation.
function hasPoweredPath(circuit: typeof controlLamp, state: ControlState): boolean {
  const visuals = controlVisuals(circuit.control, state)
  const graph = new Map<string, Set<string>>()
  function connect(a: string, b: string) {
    if (!graph.has(a)) graph.set(a, new Set())
    if (!graph.has(b)) graph.set(b, new Set())
    graph.get(a)!.add(b)
    graph.get(b)!.add(a)
  }
  for (const net of circuit.nets)
    for (const terminal of net.terminals.slice(1)) connect(net.terminals[0]!, terminal)
  for (const c of circuit.components)
    if (visuals[c.id] === 'closed') connect(c.terminals[0]!.id, c.terminals[1]!.id)
  function reaches(from: string, to: string) {
    const pending = [from],
      visited = new Set<string>()
    while (pending.length) {
      const id = pending.pop()!
      if (id === to) return true
      if (visited.has(id)) continue
      visited.add(id)
      pending.push(...(graph.get(id) ?? []))
    }
    return false
  }
  const { supply, lamp, coil } = circuit.control.bindings
  const load = lamp ?? coil
  return (
    state.inputs.supply &&
    reaches(`${supply}.a`, `${load}.a`) &&
    reaches(`${load}.b`, `${supply}.b`)
  )
}

describe('deterministic bounded control logic', () => {
  it('lights the direct lamp only while Start and supply are present; no holding', () => {
    let state = initialControlState()
    for (const input of [
      { start: true },
      { start: false },
      { start: true },
      { supply: false },
      { supply: true },
    ]) {
      state = transitionControl('momentary-lamp', state, input)
      expect(state.lamp).toBe(state.inputs.supply && state.inputs.start)
      expect(state.coil).toBe(false)
    }
    // Direct lamp intentionally follows a held button on restoration, unlike the B1 circuits.
    expect(state.lamp).toBe(true)
  })
  it.each(['self-hold', 'overload'] as ControlKind[])(
    'starts, holds and stops %s, with simultaneous Stop priority',
    (kind) => {
      let state = transitionControl(kind, initialControlState(), { start: true })
      expect(state.coil).toBe(true)
      state = transitionControl(kind, state, { start: false })
      expect(state.coil).toBe(true)
      state = transitionControl(kind, state, { start: true, stop: true })
      expect(state.coil).toBe(false)
      state = transitionControl(kind, state, { stop: false })
      expect(state.coil).toBe(false)
      expect(state.ready).toBe(false)
      state = transitionControl(kind, state, { start: false })
      expect(state.ready).toBe(true)
      expect(state.coil).toBe(false)
      expect(transitionControl(kind, state, { start: true }).coil).toBe(true)
    },
  )
  it('drops on supply loss, never restarts on restoration with either held or released Start', () => {
    for (const held of [true, false]) {
      const running = run({ start: true }, { start: held })
      const lost = step(running, { supply: false })
      expect(lost.coil).toBe(false)
      const restored = step(lost, { supply: true })
      expect(restored.coil).toBe(false)
      expect(restored.ready).toBe(!held)
      expect(step(step(restored, { start: false }), { start: true }).coil).toBe(true)
    }
  })
  it('latches overload independently of the cause, Reset and supply cycles', () => {
    const fault = run({ start: true }, { fault: true, reset: true })
    expect(fault).toMatchObject({ tripped: true, coil: false, ready: false })
    const removed = step(fault, { fault: false, start: false })
    expect(removed.tripped).toBe(true) // Holding Reset cannot reset after cause disappears.
    const powerCycled = step(step(removed, { supply: false }), { supply: true })
    expect(powerCycled.tripped).toBe(true)
    const reset = step(step(powerCycled, { reset: false }), { reset: true })
    expect(reset).toMatchObject({ tripped: false, coil: false, ready: true })
    expect(step(reset, { start: true, reset: false }).coil).toBe(true)
  })
  it.each([{ start: true }, { stop: true }, { supply: false }, { fault: true }])(
    'rejects reset when blocked by %j',
    (blocker) => {
      const state = run({ fault: true }, { fault: false }, blocker, { reset: true })
      expect(state).toMatchObject({ tripped: true, coil: false })
    },
  )
  it('resolves simultaneous Start/Reset and trip/Reset safely and does not mutate input state', () => {
    const fault = run({ fault: true }, { fault: false })
    const copy = structuredClone(fault)
    expect(step(fault, { start: true, reset: true })).toMatchObject({ tripped: true, coil: false })
    expect(step(fault, { fault: true, reset: true, start: false })).toMatchObject({
      tripped: true,
      coil: false,
    })
    expect(fault).toEqual(copy)
  })
  it.each(['momentary-lamp', 'self-hold', 'overload'] as ControlKind[])(
    'checks every reachable state and all 32 simultaneous input combinations for %s',
    (kind) => {
      const pending = [initialControlState()]
      const seen = new Set<string>()
      while (pending.length) {
        const previous = pending.shift()!
        const key = JSON.stringify(previous)
        if (seen.has(key)) continue
        seen.add(key)
        for (const input of samples) {
          const next = transitionControl(kind, previous, input)
          expect(transitionControl(kind, previous, input)).toEqual(next)
          const circuit =
            kind === 'momentary-lamp'
              ? controlLamp
              : kind === 'self-hold'
                ? controlHold
                : controlOverload
          expect(hasPoweredPath(circuit, next)).toBe(
            kind === 'momentary-lamp' ? next.lamp : next.coil,
          )
          if (kind === 'momentary-lamp') expect(next.lamp).toBe(input.supply && input.start)
          else {
            if (!input.supply || input.stop || next.tripped) expect(next.coil).toBe(false)
            if (!previous.coil && !input.start) expect(next.coil).toBe(false)
            if (!previous.ready && input.start) expect(next.coil).toBe(false)
            if (kind === 'overload' && input.fault) expect(next.tripped).toBe(true)
            if (previous.tripped && !next.tripped) {
              expect(input).toMatchObject({
                supply: true,
                start: false,
                stop: false,
                fault: false,
                reset: true,
              })
              expect(previous.inputs.reset).toBe(false)
              expect(next.coil).toBe(false)
            }
          }
          if (!seen.has(JSON.stringify(next))) pending.push(next)
        }
      }
      expect(seen.size).toBeGreaterThanOrEqual(32)
    },
  )
})

describe('control topology and device references', () => {
  it('supports relay coils with complementary linked NO and NC contacts', () => {
    const relay = structuredClone(controlHold)
    relay.devices.find((d) => d.id === 'k1')!.kind = 'relay'
    expect(validateCircuit(relay)).toEqual([])
    for (const energized of [true, false]) {
      expect(linkedContactState('no', energized)).toBe(energized ? 'closed' : 'open')
      expect(linkedContactState('nc', energized)).toBe(energized ? 'open' : 'closed')
    }
  })
  it.each([controlLamp, controlHold, controlOverload])(
    'validates $id and keeps every terminal explicit',
    (circuit) => {
      expect(validateCircuit(circuit)).toEqual([])
      expect(circuit.control.revision).toBe('control-v1')
    },
  )
  it.each([
    [
      'device',
      (c: typeof controlOverload) => {
        c.components.find((p) => p.id === 'k1-hold')!.deviceId = 'f1'
      },
    ],
    [
      'terminal',
      (c: typeof controlOverload) => {
        c.components.find((p) => p.id === 'k1-coil')!.terminals[0]!.role = '14'
      },
    ],
    [
      'binding',
      (c: typeof controlOverload) => {
        c.control.bindings.hold = 's1'
      },
    ],
    [
      'net',
      (c: typeof controlOverload) => {
        c.nets[0]!.terminals.push('k1-coil.a')
      },
    ],
    [
      'reference',
      (c: typeof controlOverload) => {
        c.components.find((p) => p.id === 'f1-contact')!.deviceId = 'missing'
      },
    ],
    [
      'voltage',
      (c: typeof controlOverload) => {
        c.nominalVoltage = 230
      },
    ],
    [
      'duplicate',
      (c: typeof controlOverload) => {
        c.devices.push(c.devices[0]!)
      },
    ],
    [
      'endpoint',
      (c: typeof controlOverload) => {
        c.wires[0]!.points[0] = [0, 0]
      },
    ],
  ] as const)('rejects invalid %s', (_, mutate) => {
    const broken = structuredClone(controlOverload)
    mutate(broken)
    expect(validateCircuit(broken).length).toBeGreaterThan(0)
  })
  it('rejects an electrically valid drawing with the Stop contact bypassed by the hold branch', () => {
    const broken = structuredClone(controlHold)
    // Swapping entire terminal groups leaves declared connectivity coherent but not the supported ladder.
    broken.control.bindings.stop = 'k1-hold'
    expect(validateCircuit(broken).join(' ')).toMatch(/Anschlussrolle|Topologie|Modellbindung/)
  })
  it('links the exact coil and auxiliary contact states in every reachable input pair', () => {
    for (const first of samples)
      for (const second of samples) {
        const state = step(step(initialControlState(), first), second)
        const v = controlVisuals(controlOverload.control, state)
        expect(v['k1-hold']).toBe(v['k1-coil'] === 'on' ? 'closed' : 'open')
        expect(v['f1-contact']).toBe(state.tripped ? 'open' : 'closed')
        expect(v.s0).toBe(state.inputs.stop ? 'open' : 'closed')
      }
  })
  it('checks all scenario final states and application answer keys independently', () => {
    const finals = controlScenarios.map((s) => s.inputs.reduce(step, initialControlState()))
    expect(finals[0]).toMatchObject({ tripped: true, coil: false })
    expect(finals[1]).toMatchObject({ ready: false, coil: false })
    expect(finals[2]).toMatchObject({ inputs: { stop: true }, coil: false })
    const keys: Record<string, string> = {
      'control-nc-rest-v1': 'closed',
      'control-identify-start-v1': 's1',
      'control-lamp-release-v1': 'off',
      'control-identify-coil-v1': 'k1-coil',
      'control-hold-release-v1': 'aux',
      'control-stop-priority-v1': 'off',
      'control-overload-path-v1': 'f1-contact',
      'control-reset-v1': 'ready',
      'control-supply-restore-v1': 'inhibit',
      'control-fault-latch-v1': 'latched',
    }
    expect(controlExercises).toHaveLength(10)
    for (const e of controlExercises) {
      expect(gradeExercise(e, keys[e.id]!).correct, e.id).toBe(true)
      if (e.circuitId) expect(e.reviewable, e.id).toBe(false)
    }
  })
})
