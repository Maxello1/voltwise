/** Bounded ideal 24 V controls. No timers, currents, motor model or safety claim. */
export type ControlKind = 'momentary-lamp' | 'self-hold' | 'overload'
export interface ControlModel {
  revision: 'control-v1'
  kind: ControlKind
  bindings: {
    supply: string
    start: string
    lamp?: string
    stop?: string
    coil?: string
    hold?: string
    permit?: string
    overload?: string
  }
}
export interface ControlInputs {
  supply: boolean
  start: boolean
  stop: boolean
  fault: boolean
  reset: boolean
}
export interface ControlState {
  inputs: ControlInputs
  tripped: boolean
  ready: boolean
  coil: boolean
  lamp: boolean
}
export function initialControlState(): ControlState {
  return {
    inputs: { supply: true, start: false, stop: false, fault: false, reset: false },
    tripped: false,
    ready: true,
    coil: false,
    lamp: false,
  }
}

/** One atomic input sample. Trip/stop/supply loss dominate Start and Reset. */
export function transitionControl(
  kind: ControlKind,
  previous: ControlState,
  changes: Partial<ControlInputs>,
): ControlState {
  const inputs = { ...previous.inputs, ...changes }
  if (kind === 'momentary-lamp')
    return { inputs, tripped: false, ready: true, coil: false, lamp: inputs.supply && inputs.start }
  let tripped = kind === 'overload' && (previous.tripped || inputs.fault)
  // Reset is an edge, requires removed cause, released Start and Stop, and present supply.
  // Clearing a trip cannot start the coil because Reset requires released Start.
  const resetEdge = inputs.reset && !previous.inputs.reset
  if (resetEdge && !inputs.fault && !inputs.start && !inputs.stop && inputs.supply) tripped = false
  const interrupted = !inputs.supply || inputs.stop || tripped
  // B1 explicitly models a release-before-restart monitor, additional to ordinary self-holding.
  const ready = !interrupted && (!inputs.start || previous.ready)
  const coil = !interrupted && ready && (inputs.start || previous.coil)
  return { inputs, tripped, ready, coil, lamp: false }
}

export type ControlVisualState = 'open' | 'closed' | 'on' | 'off'
export function linkedContactState(normal: 'no' | 'nc', energized: boolean): 'open' | 'closed' {
  return (normal === 'no' ? energized : !energized) ? 'closed' : 'open'
}
export function controlVisuals(model: ControlModel, state: ControlState) {
  const b = model.bindings
  const result: Record<string, ControlVisualState> = {
    [b.supply]: state.inputs.supply ? 'on' : 'off',
    [b.start]: state.inputs.start ? 'closed' : 'open',
  }
  if (b.lamp) result[b.lamp] = state.lamp ? 'on' : 'off'
  if (b.stop) result[b.stop] = state.inputs.stop ? 'open' : 'closed'
  if (b.coil) result[b.coil] = state.coil ? 'on' : 'off'
  if (b.hold) result[b.hold] = linkedContactState('no', state.coil)
  if (b.permit) result[b.permit] = state.ready ? 'closed' : 'open'
  if (b.overload) result[b.overload] = state.tripped ? 'open' : 'closed'
  return result
}
export function controlExplanation(kind: ControlKind, state: ControlState): string {
  if (!state.inputs.supply) return 'Die 24-V-Steuerspannung fehlt. Alle Verbraucher sind aus.'
  if (kind === 'momentary-lamp')
    return state.lamp
      ? 'S1 schließt den Strompfad. H1 leuchtet nur solange der Taster gedrückt ist.'
      : 'S1 ist geöffnet. Der Strompfad ist unterbrochen; H1 ist aus.'
  if (state.tripped)
    return 'F1 hat ausgelöst: 95–96 ist offen. Erst die Fehlerursache beseitigen, Start loslassen und F1 manuell zurücksetzen.'
  if (state.inputs.stop)
    return 'Stop hat Vorrang. S0 öffnet; K1 fällt ab und sein Hilfskontakt öffnet.'
  if (!state.ready) return 'B1 sperrt den Wiederanlauf. Start erst loslassen, dann erneut drücken.'
  if (state.coil)
    return state.inputs.start
      ? 'Start ist geschlossen. K1 zieht an und schließt den mechanisch zugeordneten Hilfskontakt 13–14.'
      : 'Start ist losgelassen. Der geschlossene K1-Hilfskontakt überbrückt S1 und hält die Spule erregt.'
  return 'K1 ist abgefallen. Stop und Freigabe sind geschlossen; ein neuer Startdruck lässt K1 anziehen.'
}
