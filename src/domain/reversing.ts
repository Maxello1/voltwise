import type { ControlVisualState } from './control'

/** Fixed, ideal 24 V teaching model. No motor dynamics or safety-rated functions. */
export const reversingRevision = 'reversing-v1' as const
export type ReversingFault =
  'supply' | 'start-open' | 'stop-open' | 'hold-open' | 'overload-open' | 'restart-blocked'
export interface ReversingInputs {
  supply: boolean
  forward: boolean
  reverse: boolean
  stop: boolean
  trip: boolean
  reset: boolean
}
export interface ReversingState {
  inputs: ReversingInputs
  tripped: boolean
  ready: boolean
  direction: 'off' | 'forward' | 'reverse'
}
export const reversingNets = [
  { id: 'positive', terminals: ['g1.a', 'b1.a'] },
  { id: 'permitted', terminals: ['b1.b', 's0.a'] },
  { id: 'protected', terminals: ['s0.b', 'f1.a'] },
  { id: 'feed', terminals: ['f1.b', 's1.a', 'k1-hold.a', 's2.a', 'k2-hold.a'] },
  { id: 'forward-command', terminals: ['s1.b', 'k1-hold.b', 'k2-nc.a'] },
  { id: 'reverse-command', terminals: ['s2.b', 'k2-hold.b', 'k1-nc.a'] },
  { id: 'forward-coil', terminals: ['k2-nc.b', 'k1-coil.a'] },
  { id: 'reverse-coil', terminals: ['k1-nc.b', 'k2-coil.a'] },
  { id: 'reference', terminals: ['g1.b', 'k1-coil.b', 'k2-coil.b'] },
] as const
export const reversingContacts = [
  'b1',
  's0',
  'f1',
  's1',
  's2',
  'k1-hold',
  'k2-hold',
  'k2-nc',
  'k1-nc',
] as const

export function initialReversingState(): ReversingState {
  return {
    inputs: {
      supply: true,
      forward: false,
      reverse: false,
      stop: false,
      trip: false,
      reset: false,
    },
    tripped: false,
    ready: true,
    direction: 'off',
  }
}

/** B1 also arbitrates conflicting commands. Both released must precede a new direction. */
export function transitionReversing(
  previous: ReversingState,
  changes: Partial<ReversingInputs>,
  fault?: ReversingFault,
): ReversingState {
  const inputs = { ...previous.inputs, ...changes }
  const supply = inputs.supply && fault !== 'supply'
  let tripped = previous.tripped || inputs.trip
  if (
    inputs.reset &&
    !previous.inputs.reset &&
    !inputs.trip &&
    supply &&
    !inputs.forward &&
    !inputs.reverse &&
    !inputs.stop
  )
    tripped = false
  const released = !inputs.forward && !inputs.reverse
  const interrupted = !supply || inputs.stop || tripped || (inputs.forward && inputs.reverse)
  // The restart scenario supplies an initially missing permission, not a defective B1.
  // Once both commands have been released, the same healthy monitor can permit a new Start.
  let ready = !interrupted && (released || previous.ready)
  const common = ready && fault !== 'stop-open' && fault !== 'overload-open'
  const forward =
    common &&
    previous.direction !== 'reverse' &&
    ((inputs.forward && fault !== 'start-open') ||
      (previous.direction === 'forward' && fault !== 'hold-open'))
  const reverse =
    common &&
    previous.direction !== 'forward' &&
    (inputs.reverse || previous.direction === 'reverse')
  const direction = forward && !reverse ? 'forward' : reverse && !forward ? 'reverse' : 'off'
  // An unexpected drop also requires release before restart; no direct takeover by the other coil.
  if (previous.direction !== 'off' && direction === 'off') ready = false
  return { inputs, tripped, ready, direction }
}

export function reversingVisuals(
  state: ReversingState,
  fault?: ReversingFault,
): Record<string, ControlVisualState> {
  const closed = (value: boolean) => (value ? ('closed' as const) : ('open' as const))
  return {
    g1: state.inputs.supply && fault !== 'supply' ? 'on' : 'off',
    b1: closed(state.ready),
    s0: closed(!state.inputs.stop && fault !== 'stop-open'),
    f1: closed(!state.tripped && fault !== 'overload-open'),
    s1: closed(state.inputs.forward && fault !== 'start-open'),
    s2: closed(state.inputs.reverse),
    'k1-hold': closed(state.direction === 'forward' && fault !== 'hold-open'),
    'k2-hold': closed(state.direction === 'reverse'),
    'k2-nc': closed(state.direction !== 'reverse'),
    'k1-nc': closed(state.direction !== 'forward'),
    'k1-coil': state.direction === 'forward' ? 'on' : 'off',
    'k2-coil': state.direction === 'reverse' ? 'on' : 'off',
  }
}

/** Equipotential groups through CLOSED contacts only. Coils provide passive DC paths to 0 V.
 * Disabled G1 is explicitly an ideal 0 V source. Isolated groups have undefined potential.
 * This is valid only for this pinned topology, where both coil returns are at reference.
 */
export function reversingPotentials(state: ReversingState, fault?: ReversingFault) {
  const groups: string[][] = reversingNets.map((n) => [n.id])
  const netFor = (terminal: string) =>
    reversingNets.find((n) => (n.terminals as readonly string[]).includes(terminal))?.id
  const groupFor = (net: string) => groups.find((g) => g.includes(net))!
  const visuals = reversingVisuals(state, fault)
  for (const contact of reversingContacts) {
    if (visuals[contact] !== 'closed') continue
    const a = groupFor(netFor(`${contact}.a`)!),
      b = groupFor(netFor(`${contact}.b`)!)
    if (a !== b) {
      a.push(...b)
      groups.splice(groups.indexOf(b), 1)
    }
  }
  const values: Record<string, number | null> = {}
  for (const group of groups) {
    const potential = group.includes('positive')
      ? visuals.g1 === 'on'
        ? 24
        : 0
      : group.some((n) => ['reference', 'forward-coil', 'reverse-coil'].includes(n))
        ? 0
        : null
    for (const net of group) values[net] = potential
  }
  return { values, groups, netFor }
}

export function measureReversing(
  state: ReversingState,
  red: string,
  black: string,
  fault?: ReversingFault,
): number | null {
  const { values, groups, netFor } = reversingPotentials(state, fault)
  const a = netFor(red),
    b = netFor(black)
  if (!a || !b) throw new Error('Dieser Messpunkt wird vom Lehrmodell nicht unterstützt.')
  if (groups.some((g) => g.includes(a) && g.includes(b))) return 0
  return values[a] === null || values[b] === null ? null : values[a]! - values[b]!
}
