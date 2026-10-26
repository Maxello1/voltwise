/** Ideal steady-state single-component AC models. SI units; sine-reference phasors. */
export function finite(value: number, name = 'Wert'): number {
  if (!Number.isFinite(value)) throw new Error(`${name} muss endlich sein.`)
  return value
}
export function positive(value: number, name = 'Wert'): number {
  if (finite(value, name) <= 0) throw new Error(`${name} muss größer als null sein.`)
  return value
}
export const radians = (degrees: number) => finite((finite(degrees) * Math.PI) / 180)
export const degrees = (angle: number) => finite((finite(angle) * 180) / Math.PI)
export const period = (frequencyHz: number) => finite(1 / positive(frequencyHz, 'Frequenz'))
export const frequency = (periodSeconds: number) =>
  finite(1 / positive(periodSeconds, 'Periodendauer'))
export const angularFrequency = (frequencyHz: number) =>
  finite(2 * Math.PI * positive(frequencyHz, 'Frequenz'))
export const angleAtTime = (frequencyHz: number, timeSeconds: number) =>
  finite(angularFrequency(frequencyHz) * finite(timeSeconds))
export const rms = (peak: number) => {
  if (finite(peak) < 0) throw new Error('Scheitelwert muss nichtnegativ sein.')
  return peak / Math.SQRT2
}
export const peak = (effective: number) => {
  if (finite(effective) < 0) throw new Error('Effektivwert muss nichtnegativ sein.')
  return finite(effective * Math.SQRT2)
}
export interface SineSignal {
  amplitude: number
  frequencyHz: number
  phaseDegrees: number
}
/** Positive phase leads a zero-phase sine. No implicit shared V/A scale. */
export function sineValue(signal: SineSignal, timeSeconds: number) {
  if (finite(signal.amplitude) < 0) throw new Error('Amplitude darf nicht negativ sein.')
  return finite(
    signal.amplitude *
      Math.sin(angleAtTime(signal.frequencyHz, timeSeconds) + radians(signal.phaseDegrees)),
  )
}
export interface Phasor {
  magnitude: number
  angleDegrees: number
  frequencyHz: number
}
export function phasorComponents(p: Phasor) {
  positive(p.frequencyHz, 'Frequenz')
  if (finite(p.magnitude) < 0) throw new Error('Betrag darf nicht negativ sein.')
  return {
    x: finite(p.magnitude * Math.cos(radians(p.angleDegrees))),
    y: finite(p.magnitude * Math.sin(radians(p.angleDegrees))),
  }
}
export function addPhasors(a: Phasor, b: Phasor) {
  if (a.frequencyHz !== b.frequencyHz)
    throw new Error('Zeigeraddition erfordert dieselbe Frequenz.')
  const ac = phasorComponents(a),
    bc = phasorComponents(b)
  const x = finite(ac.x + bc.x),
    y = finite(ac.y + bc.y)
  const magnitude = finite(Math.hypot(x, y))
  return {
    x,
    y,
    magnitude,
    angleDegrees: magnitude < 1e-12 ? 0 : degrees(Math.atan2(y, x)),
    frequencyHz: a.frequencyHz,
  }
}
export const inductiveReactance = (f: number, inductanceH: number) =>
  positive(angularFrequency(f) * positive(inductanceH, 'Induktivität'), 'Blindwiderstand')
export const capacitiveReactance = (f: number, capacitanceF: number) =>
  positive(
    1 / positive(angularFrequency(f) * positive(capacitanceF, 'Kapazität')),
    'Blindwiderstand',
  )
export type AcComponent = 'R' | 'L' | 'C'
export function idealAc(
  component: AcComponent,
  frequencyHz: number,
  voltageRms: number,
  valueSI: number,
) {
  positive(frequencyHz, 'Frequenz')
  positive(voltageRms, 'Effektivspannung')
  positive(valueSI, 'Bauteilwert')
  const impedance =
    component === 'R'
      ? valueSI
      : component === 'L'
        ? inductiveReactance(frequencyHz, valueSI)
        : capacitiveReactance(frequencyHz, valueSI)
  const currentRms = finite(voltageRms / impedance)
  const currentPhaseDegrees = component === 'R' ? 0 : component === 'L' ? -90 : 90
  return {
    impedance,
    currentRms,
    currentPhaseDegrees,
    activePowerW: component === 'R' ? finite(voltageRms * currentRms) : 0,
    reactivePowerVar:
      component === 'R' ? 0 : finite(voltageRms * currentRms * (component === 'L' ? 1 : -1)),
  }
}
/** Model coordinates, independent of SVG size, zoom and device pixels. */
export function endpointPhasor(x: number, y: number) {
  finite(x)
  finite(y)
  return { magnitude: finite(Math.hypot(x, y)), angleDegrees: degrees(Math.atan2(y, x)) }
}
export const angularDistance = (a: number, b: number) =>
  Math.abs(((((finite(a) - finite(b)) % 360) + 540) % 360) - 180)
