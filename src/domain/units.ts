import type { Unit } from './models'

type Dimension =
  | 'current'
  | 'voltage'
  | 'resistance'
  | 'power'
  | 'frequency'
  | 'time'
  | 'angle'
  | 'inductance'
  | 'capacitance'
  | 'flux-density'
  | 'force'
  | 'torque'
  | 'reactive-power'
/** Dimension and SI multiplier are independent of display spelling. Angle SI is rad. */
export const unitDefinitions: Record<string, { dimension: Dimension; factor: number }> = {}
const register = (dimension: Dimension, entries: [string, number][]) => {
  for (const [unit, factor] of entries) unitDefinitions[unit] = { dimension, factor }
}
register('current', [
  ['A', 1],
  ['mA', 1e-3],
  ['µA', 1e-6],
  ['uA', 1e-6],
])
register('voltage', [
  ['V', 1],
  ['mV', 1e-3],
  ['kV', 1e3],
])
register('resistance', [
  ['Ω', 1],
  ['Ohm', 1],
  ['ohm', 1],
  ['kΩ', 1e3],
  ['kOhm', 1e3],
  ['MΩ', 1e6],
])
register('power', [
  ['W', 1],
  ['mW', 1e-3],
  ['kW', 1e3],
])
register('frequency', [
  ['Hz', 1],
  ['kHz', 1e3],
])
register('time', [
  ['s', 1],
  ['ms', 1e-3],
  ['µs', 1e-6],
])
register('angle', [
  ['rad', 1],
  ['°', Math.PI / 180],
  ['deg', Math.PI / 180],
])
register('inductance', [
  ['H', 1],
  ['mH', 1e-3],
  ['µH', 1e-6],
])
register('capacitance', [
  ['F', 1],
  ['µF', 1e-6],
  ['uF', 1e-6],
  ['nF', 1e-9],
])
register('flux-density', [
  ['T', 1],
  ['mT', 1e-3],
])
register('force', [
  ['N', 1],
  ['mN', 1e-3],
])
register('torque', [
  ['N·m', 1],
  ['Nm', 1],
  ['N*m', 1],
  ['mN·m', 1e-3],
])
register('reactive-power', [
  ['var', 1],
  ['kvar', 1e3],
])

export function parseQuantity(
  input: string,
  expectedUnit: Unit,
): { value: number; error?: undefined } | { value?: undefined; error: string } {
  const match = input
    .trim()
    .match(/^([+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)(?:[eE][+-]?\d+)?)\s*([a-zA-ZΩµμ°·*]+)?$/u)
  if (!match)
    return {
      error: `Bitte eine Zahl eingeben, z. B. 0,36 ${expectedUnit}. Keine Tausendertrennzeichen.`,
    }
  const amount = Number(match[1]!.replace(',', '.'))
  const entered = unitDefinitions[(match[2] ?? expectedUnit).replace('μ', 'µ')]
  const expected = unitDefinitions[expectedUnit]!
  if (!entered || entered.dimension !== expected.dimension)
    return {
      error: `Die Einheit muss zu ${expectedUnit} passen. Groß- und Kleinschreibung beachten.`,
    }
  const value = amount * (entered.factor / expected.factor)
  if (!Number.isFinite(value)) return { error: 'Bitte eine endliche Zahl eingeben.' }
  return { value }
}
