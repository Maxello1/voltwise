import { display } from './display'
import { useState } from 'react'
import type { ApplicationSpec } from '../../domain/application'
import { endpointPhasor, radians } from '../../domain/ac'
import { motorParts } from '../../domain/dc-motor'
import { NumberControl } from './LabCanvas'
import { PhasorView, Waveform } from './Waveform'
import { MotorDiagram } from './MotorDiagram'

export function ApplicationInput({
  spec,
  onChange,
  disabled,
}: {
  spec: ApplicationSpec
  onChange: (answer: string) => void
  disabled: boolean
}) {
  const [x, setX] = useState(10),
    [y, setY] = useState(0),
    [selected, setSelected] = useState('')
  const [amplitude, setAmplitude] = useState(50),
    [frequencyHz, setFrequency] = useState(25),
    [phaseDegrees, setPhase] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({})
  const emit = (answer: object) =>
    onChange(JSON.stringify({ version: 1, kind: spec.kind, ...answer }))
  const changeEndpoint = (px: number, py: number) => {
    setX(px)
    setY(py)
    emit({ x: px, y: py })
  }
  const p = endpointPhasor(x, y)
  if (spec.kind === 'numeric-steps')
    return (
      <fieldset disabled={disabled} className="application-input">
        <legend>Deine Rechenschritte</legend>
        {spec.steps.map((step) => (
          <label className="lab-control" key={step.id}>
            <span>
              {step.label} [{step.unit}]
            </span>
            <input
              className="answer-input"
              aria-label={step.label}
              autoComplete="off"
              maxLength={80}
              value={values[step.id] ?? ''}
              onChange={(e) => {
                const next = { ...values, [step.id]: e.target.value }
                setValues(next)
                emit({ values: next })
              }}
            />
            <small>
              Toleranz: ±{display(step.tolerance, 9)} {step.unit}. Passende Einheiten sind erlaubt.
            </small>
          </label>
        ))}
      </fieldset>
    )
  if (spec.kind === 'motor-parts')
    return (
      <div className="application-input">
        <MotorDiagram
          quiz
          selected={selected}
          onSelect={
            disabled
              ? undefined
              : (id) => {
                  setSelected(id)
                  emit({ partId: id })
                }
          }
        />
        <label className="lab-control">
          <span>Auswahl per Tastatur</span>
          <select
            aria-label="Bauteilnummer"
            disabled={disabled}
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value)
              emit({ partId: e.target.value })
            }}
          >
            <option value="">Bauteil wählen …</option>
            {motorParts.map((part, i) => (
              <option key={part.id} value={part.id}>
                Bauteil {i + 1}
              </option>
            ))}
          </select>
        </label>
        <p className="input-help">
          Mit Tab zur Grafik wechseln, ein Bauteil mit Enter oder Leertaste auswählen. Die Namen
          werden nach der Abgabe erklärt.
        </p>
      </div>
    )
  if (spec.kind === 'phasor')
    return (
      <div className="application-input">
        <PhasorView
          magnitude={0}
          angleDegrees={0}
          result={{ x, y }}
          onPoint={disabled ? undefined : changeEndpoint}
        />
        <p>
          Dein Endpunkt: x = {display(x)} V, y = {display(y)} V.
        </p>
        <NumberControl
          label="Zeigerbetrag [V]"
          value={p.magnitude}
          min={0}
          max={60}
          step={0.1}
          disabled={disabled}
          onChange={(m) =>
            changeEndpoint(
              m * Math.cos(radians(p.angleDegrees)),
              m * Math.sin(radians(p.angleDegrees)),
            )
          }
        />
        <NumberControl
          label="Zeigerwinkel [°]"
          value={p.angleDegrees}
          min={-180}
          max={180}
          step={0.1}
          disabled={disabled}
          onChange={(a) =>
            changeEndpoint(p.magnitude * Math.cos(radians(a)), p.magnitude * Math.sin(radians(a)))
          }
        />
        <button
          type="button"
          className="button button-outline"
          disabled={disabled}
          onClick={() => emit({ x, y })}
        >
          Zeiger übernehmen
        </button>
        <p className="input-help">
          Endpunkt ziehen oder die Regler mit Pfeiltasten bedienen. Bewertet werden Volt und Winkel;
          Toleranzen stehen im Aufgabentext.
        </p>
      </div>
    )
  if (spec.kind === 'waveform')
    return (
      <div className="application-input">
        <Waveform voltage={{ amplitude, frequencyHz, phaseDegrees }} timeMs={0} />
        <NumberControl
          label="Scheitelwert [V]"
          value={amplitude}
          min={1}
          max={400}
          disabled={disabled}
          onChange={(v) => {
            setAmplitude(v)
            emit({ amplitude: v, frequencyHz, phaseDegrees })
          }}
        />
        <NumberControl
          label="Frequenz [Hz]"
          value={frequencyHz}
          min={10}
          max={200}
          disabled={disabled}
          onChange={(v) => {
            setFrequency(v)
            emit({ amplitude, frequencyHz: v, phaseDegrees })
          }}
        />
        <NumberControl
          label="Anfangswinkel [°]"
          value={phaseDegrees}
          min={-180}
          max={180}
          disabled={disabled}
          onChange={(v) => {
            setPhase(v)
            emit({ amplitude, frequencyHz, phaseDegrees: v })
          }}
        />
        <button
          type="button"
          className="button button-outline"
          disabled={disabled}
          onClick={() => emit({ amplitude, frequencyHz, phaseDegrees })}
        >
          Einstellung übernehmen
        </button>
      </div>
    )
  return null
}
