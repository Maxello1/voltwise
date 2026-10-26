import { z } from 'zod'
import type { Grade, Unit } from './models'
import { angularDistance, endpointPhasor } from './ac'
import { parseQuantity, unitDefinitions } from './units'
import { motorParts } from './dc-motor'

export interface NumericStep {
  id: string
  label: string
  answer: number
  unit: Unit
  tolerance: number
}
export type ApplicationSpec =
  | {
      kind: 'phasor'
      magnitude: number
      angleDegrees: number
      magnitudeTolerance: number
      angleTolerance: number
    }
  | { kind: 'waveform'; amplitude: number; frequencyHz: number; phaseDegrees: number }
  | { kind: 'motor-parts'; partId: string }
  | { kind: 'numeric-steps'; steps: NumericStep[] }
const base = { version: z.literal(1) }
export const applicationAnswerSchema = z.discriminatedUnion('kind', [
  z
    .object({
      ...base,
      kind: z.literal('phasor'),
      x: z.number().finite().min(-1000).max(1000),
      y: z.number().finite().min(-1000).max(1000),
    })
    .strict(),
  z
    .object({
      ...base,
      kind: z.literal('waveform'),
      amplitude: z.number().finite().min(0).max(1000),
      frequencyHz: z.number().finite().positive().max(1000),
      phaseDegrees: z.number().finite().min(-360).max(360),
    })
    .strict(),
  z.object({ ...base, kind: z.literal('motor-parts'), partId: z.string().max(30) }).strict(),
  z
    .object({
      ...base,
      kind: z.literal('numeric-steps'),
      values: z.record(z.string().max(30), z.string().max(80)),
    })
    .strict(),
])
export type ApplicationAnswer = z.infer<typeof applicationAnswerSchema>
export function validApplicationSpec(spec: ApplicationSpec): boolean {
  if (spec.kind === 'phasor')
    return (
      [spec.magnitude, spec.angleDegrees, spec.magnitudeTolerance, spec.angleTolerance].every(
        Number.isFinite,
      ) &&
      spec.magnitude > 0 &&
      spec.magnitudeTolerance > 0 &&
      spec.angleTolerance > 0 &&
      spec.angleTolerance <= 180
    )
  if (spec.kind === 'waveform')
    return (
      [spec.amplitude, spec.frequencyHz, spec.phaseDegrees].every(Number.isFinite) &&
      spec.amplitude > 0 &&
      spec.amplitude <= 400 &&
      spec.frequencyHz >= 10 &&
      spec.frequencyHz <= 200 &&
      Math.abs(spec.phaseDegrees) <= 180
    )
  if (spec.kind === 'motor-parts') return motorParts.some((p) => p.id === spec.partId)
  return (
    spec.steps.length >= 2 &&
    spec.steps.length <= 5 &&
    new Set(spec.steps.map((s) => s.id)).size === spec.steps.length &&
    spec.steps.every(
      (s) =>
        /^s[0-4]$/.test(s.id) &&
        !!s.label.trim() &&
        !!unitDefinitions[s.unit] &&
        Number.isFinite(s.answer) &&
        Number.isFinite(s.tolerance) &&
        s.tolerance >= 0,
    )
  )
}
export function validateApplicationAnswer(
  spec: ApplicationSpec,
  serialized: string,
): ApplicationAnswer {
  if (serialized.length > 2000) throw new Error('Antwort ist zu groß.')
  const answer = applicationAnswerSchema.parse(JSON.parse(serialized))
  if (answer.kind !== spec.kind) throw new Error('Antwortformat passt nicht zur Aufgabe.')
  if (answer.kind === 'motor-parts' && !motorParts.some((p) => p.id === answer.partId))
    throw new Error('Bauteil auswählen.')
  if (answer.kind === 'numeric-steps' && spec.kind === 'numeric-steps') {
    if (
      Object.keys(answer.values).length !== spec.steps.length ||
      spec.steps.some((s) => !(s.id in answer.values))
    )
      throw new Error('Bitte jeden Rechenschritt beantworten.')
    for (const step of spec.steps) {
      const parsed = parseQuantity(answer.values[step.id]!, step.unit)
      if (parsed.error) throw new Error(`${step.label}: ${parsed.error}`)
    }
  }
  return answer
}
export function gradeApplication(spec: ApplicationSpec, serialized: string): Grade {
  try {
    const answer = validateApplicationAnswer(spec, serialized)
    let correct = false,
      normalizedAnswer = ''
    if (answer.kind === 'phasor' && spec.kind === 'phasor') {
      const p = endpointPhasor(answer.x, answer.y)
      correct =
        Math.abs(p.magnitude - spec.magnitude) <= spec.magnitudeTolerance &&
        angularDistance(p.angleDegrees, spec.angleDegrees) <= spec.angleTolerance
      normalizedAnswer = `${p.magnitude.toFixed(2)} V; ${p.angleDegrees.toFixed(2)}°`
    } else if (answer.kind === 'waveform' && spec.kind === 'waveform') {
      correct =
        Math.abs(answer.amplitude - spec.amplitude) <= 0.1 &&
        Math.abs(answer.frequencyHz - spec.frequencyHz) <= 0.1 &&
        angularDistance(answer.phaseDegrees, spec.phaseDegrees) <= 1
      normalizedAnswer = `${answer.amplitude} V; ${answer.frequencyHz} Hz; ${answer.phaseDegrees}°`
    } else if (answer.kind === 'motor-parts' && spec.kind === 'motor-parts') {
      correct = answer.partId === spec.partId
      normalizedAnswer = motorParts.find((p) => p.id === answer.partId)!.name
    } else if (answer.kind === 'numeric-steps' && spec.kind === 'numeric-steps') {
      const results = spec.steps.map((step) => ({
        step,
        value: parseQuantity(answer.values[step.id]!, step.unit).value!,
      }))
      correct = results.every(
        ({ step, value }) =>
          Math.abs(step.answer - value) <= step.tolerance + Number.EPSILON * Math.abs(step.answer),
      )
      normalizedAnswer = results
        .map(({ step, value }) => `${step.label}: ${value} ${step.unit}`)
        .join('; ')
    }
    return { correct, normalizedAnswer }
  } catch (error) {
    return {
      correct: false,
      normalizedAnswer: '',
      invalid:
        error instanceof SyntaxError || error instanceof z.ZodError
          ? 'Bitte eine vollständige gültige Antwort eingeben.'
          : (error as Error).message,
    }
  }
}
export function applicationSolution(spec: ApplicationSpec) {
  switch (spec.kind) {
    case 'phasor':
      return `${spec.magnitude.toFixed(2)} V bei ${spec.angleDegrees.toFixed(2)}° (±${spec.magnitudeTolerance} V, ±${spec.angleTolerance}°)`
    case 'waveform':
      return `${spec.amplitude} V; ${spec.frequencyHz} Hz; ${spec.phaseDegrees}° (±0,1 V, ±0,1 Hz, ±1°)`
    case 'motor-parts':
      return motorParts.find((p) => p.id === spec.partId)?.name ?? spec.partId
    case 'numeric-steps':
      return spec.steps
        .map(
          (s) =>
            `${s.label}: ${s.answer.toLocaleString('de', { useGrouping: false, maximumSignificantDigits: 8 })} ${s.unit} (±${s.tolerance} ${s.unit})`,
        )
        .join('; ')
  }
}
