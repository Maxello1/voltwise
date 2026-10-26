import { finite, positive, radians } from './ac'

export function lorentzForce(fieldT: number, currentA: number, lengthM: number, angleDegrees = 90) {
  if (finite(fieldT) < 0 || finite(lengthM) < 0)
    throw new Error('Betrag und Länge dürfen nicht negativ sein.')
  return finite(fieldT * finite(currentA) * lengthM * Math.sin(radians(angleDegrees)))
}
export const torque = (forceN: number, perpendicularLeverM: number) =>
  finite(finite(forceN) * positive(perpendicularLeverM, 'Hebelarm'))
export const armatureCurrent = (voltageV: number, counterEmfV: number, resistanceOhm: number) =>
  finite((finite(voltageV) - finite(counterEmfV)) / positive(resistanceOhm, 'Ankerwiderstand'))
export const counterEmf = (constant: number, fluxWb: number, speedRadS: number) =>
  finite(positive(constant) * finite(fluxWb) * finite(speedRadS))

/** Two axial conductors of ONE loop, B along +x. Alpha: conductor radius from +x.
 * Axial conductors remain perpendicular to B; torque varies with lever cos(alpha).
 * Ideal split-ring reversal at 90/270 degrees; no electrical/mechanical dynamics. */
export function motorState(
  angleDegrees: number,
  options: {
    commutated?: boolean
    fieldPolarity?: 1 | -1
    supplyPolarity?: 1 | -1
    currentA?: number
    fieldT?: number
    lengthM?: number
    radiusM?: number
  } = {},
) {
  const alpha = radians(angleDegrees),
    c = Math.cos(alpha)
  const neutral = Math.abs(c) < 1e-10
  const field = options.fieldPolarity ?? 1,
    supply = options.supplyPolarity ?? 1
  const commutator = neutral ? 0 : c > 0 ? 1 : -1
  const currentDirection = (options.commutated === false ? 1 : commutator) * supply
  const forceDirection = currentDirection * field
  const currentA = finite(options.currentA ?? 2)
  if (currentA < 0)
    throw new Error('Strombetrag darf nicht negativ sein; Richtung über Versorgungspolung wählen.')
  const forceN =
    currentDirection === 0
      ? 0
      : lorentzForce(options.fieldT ?? 0.8, currentA, options.lengthM ?? 0.03)
  const radiusM = positive(options.radiusM ?? 0.02, 'Radius')
  return {
    angleDegrees,
    x: Math.cos(alpha),
    y: Math.sin(alpha),
    neutral,
    commutator,
    currentDirection,
    forceDirection,
    forceN,
    torqueNm: finite(2 * radiusM * forceN * forceDirection * c),
  }
}
export const motorParts = [
  {
    id: 'stator',
    name: 'Ständer / Stator',
    detail: 'Der feststehende Teil trägt die Hauptpole und führt den magnetischen Fluss.',
  },
  {
    id: 'poles',
    name: 'Nord- und Südpol',
    detail: 'Das Hauptfeld zeigt im Luftspalt von Nord nach Süd.',
  },
  {
    id: 'armature',
    name: 'Rotor / Anker',
    detail: 'Der drehbare Eisenkörper trägt die Ankerwicklung.',
  },
  {
    id: 'winding',
    name: 'Ankerwicklung',
    detail:
      'Axiale Leiter führen Strom; im Hauptfeld wirken entgegengesetzte Kräfte als Kräftepaar.',
  },
  { id: 'shaft', name: 'Welle', detail: 'Überträgt das Drehmoment nach außen.' },
  {
    id: 'commutator',
    name: 'Stromwender / Kommutator',
    detail:
      'Vertauscht die Verbindung der drehenden Schleife zur Gleichstromquelle an der neutralen Lage.',
  },
  {
    id: 'brushes',
    name: 'Kohlebürsten',
    detail: 'Stellen den gleitenden elektrischen Kontakt zum Stromwender her.',
  },
] as const
export const excitationTypes = [
  'Fremderregung',
  'Nebenschluss',
  'Reihenschluss',
  'Doppelschluss',
  'Permanentmagnet',
] as const
export type Excitation = (typeof excitationTypes)[number]
/** Explicit terminal/net topology; no connection inferred from drawing crossings. */
export function excitationNets(type: Excitation): string[][] {
  switch (type) {
    case 'Fremderregung':
      return [
        ['U+', 'A1'],
        ['A2', 'U-'],
        ['UF+', 'F1'],
        ['F2', 'UF-'],
      ]
    case 'Nebenschluss':
      return [
        ['U+', 'A1', 'F1'],
        ['U-', 'A2', 'F2'],
      ]
    case 'Reihenschluss':
      return [
        ['U+', 'D1'],
        ['D2', 'A1'],
        ['A2', 'U-'],
      ]
    case 'Doppelschluss':
      return [
        ['U+', 'D1', 'F1'],
        ['D2', 'A1'],
        ['A2', 'F2', 'U-'],
      ]
    case 'Permanentmagnet':
      return [
        ['U+', 'A1'],
        ['A2', 'U-'],
      ]
  }
}
