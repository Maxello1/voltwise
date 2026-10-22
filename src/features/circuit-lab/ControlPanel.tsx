import { useState } from 'react'
import {
  controlExplanation,
  initialControlState,
  transitionControl,
  type ControlInputs,
  type ControlState,
} from '../../domain/control'
import type { ControlCircuitDefinition } from '../../schematics/model'
import { controlScenarios } from '../../content/control-scenarios'

export function ControlPanel({
  circuit,
  state,
  onChange,
}: {
  circuit: ControlCircuitDefinition
  state: ControlState
  onChange: (state: ControlState) => void
}) {
  const kind = circuit.control.kind
  const [scenarioId, setScenarioId] = useState('trip')
  const [loaded, setLoaded] = useState('')
  const scenario = controlScenarios.find((s) => s.id === scenarioId)!
  const change = (input: Partial<ControlInputs>) => onChange(transitionControl(kind, state, input))
  return (
    <section className="control-panel" aria-label="Steuerung ausprobieren">
      <div className="control-panel-heading">
        <span className="eyebrow">24 V · INTERAKTIVES LEHRMODELL</span>
        <strong>
          {kind === 'momentary-lamp' ? 'Tasten und beobachten' : 'Den Strompfad verstehen'}
        </strong>
      </div>
      <p>Ein Klick drückt den Taster, der nächste lässt ihn los. Beobachte die Kontakte im Plan.</p>
      <div className="control-actions">
        <button
          className="button button-primary"
          aria-pressed={state.inputs.start}
          onClick={() => change({ start: !state.inputs.start })}
        >
          {state.inputs.start ? 'Start loslassen' : 'Start drücken'}
        </button>
        {kind !== 'momentary-lamp' && (
          <button
            className="button button-outline"
            aria-pressed={state.inputs.stop}
            onClick={() => change({ stop: !state.inputs.stop })}
          >
            {state.inputs.stop ? 'Stop loslassen' : 'Stop drücken'}
          </button>
        )}
        <button
          className="button button-outline"
          aria-pressed={state.inputs.supply}
          onClick={() => change({ supply: !state.inputs.supply })}
        >
          {state.inputs.supply ? '24 V ausschalten' : '24 V einschalten'}
        </button>
        {kind === 'overload' && (
          <>
            <button
              className="button button-outline"
              aria-pressed={state.inputs.fault}
              onClick={() => change({ fault: !state.inputs.fault })}
            >
              {state.inputs.fault ? 'Fehlerursache beseitigen' : 'Überlast auslösen'}
            </button>
            <button
              className="button button-outline"
              disabled={
                !state.tripped ||
                state.inputs.fault ||
                state.inputs.start ||
                state.inputs.stop ||
                !state.inputs.supply
              }
              onClick={() =>
                onChange(
                  transitionControl(kind, transitionControl(kind, state, { reset: true }), {
                    reset: false,
                  }),
                )
              }
            >
              F1 manuell zurücksetzen
            </button>
          </>
        )}
      </div>
      <p className="control-status" role="status">
        {controlExplanation(kind, state)}
      </p>
      {kind !== 'momentary-lamp' && (
        <p className="control-assumption">
          B1: Start nach einer Unterbrechung zuerst loslassen. Zusätzliche Logik, kein
          Sicherheitsbaustein.
        </p>
      )}
      <details className="control-details">
        <summary>
          {kind === 'overload' ? 'Zustände & Fehlersuche' : 'Zustände & Modellgrenzen'}
        </summary>
        <dl className="control-readings">
          <div>
            <dt>Steuerspannung</dt>
            <dd>{state.inputs.supply ? '24 V' : '0 V'}</dd>
          </div>
          {kind === 'momentary-lamp' ? (
            <div>
              <dt>H1</dt>
              <dd>{state.lamp ? 'Leuchtet' : 'Aus'}</dd>
            </div>
          ) : (
            <>
              <div>
                <dt>K1 · Spule</dt>
                <dd>{state.coil ? 'Angezogen' : 'Abgefallen'}</dd>
              </div>
              <div>
                <dt>K1 · 13–14</dt>
                <dd>{state.coil ? 'Geschlossen' : 'Offen'}</dd>
              </div>
              <div>
                <dt>B1 · Freigabe</dt>
                <dd>{state.ready ? 'Geschlossen' : 'Gesperrt'}</dd>
              </div>
            </>
          )}
          {kind === 'overload' && (
            <div>
              <dt>F1 · 95–96</dt>
              <dd>{state.tripped ? 'Ausgelöst · offen' : 'Bereit · geschlossen'}</dd>
            </div>
          )}
        </dl>
        {kind !== 'momentary-lamp' && (
          <p className="control-assumption">
            B1 ist eine zusätzliche modellierte Wiederanlaufsperre: Nach einer Unterbrechung muss
            Start zuerst losgelassen werden. Eine gewöhnliche Selbsthaltung allein bietet diese
            Funktion bei festgehaltenem Start nicht. Kein Sicherheitsbaustein.
          </p>
        )}
        {kind === 'overload' && (
          <div className="control-scenarios">
            <label htmlFor="fault-scenario">Fehlersuche</label>
            <select
              id="fault-scenario"
              value={scenarioId}
              onChange={(e) => setScenarioId(e.target.value)}
            >
              {controlScenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
            <button
              className="button button-outline"
              onClick={() => {
                onChange(
                  scenario.inputs.reduce(
                    (s, input) => transitionControl(kind, s, input),
                    initialControlState(),
                  ),
                )
                setLoaded(scenario.question)
              }}
            >
              Szenario laden
            </button>
            {loaded && <p>{loaded}</p>}
          </div>
        )}
        <p className="muted tiny">
          Der Versuchszustand gilt für diese Ansicht. Beim erneuten Öffnen sind die Taster
          losgelassen und der Verbraucher aus; deine Lernversuche bleiben gespeichert.
        </p>
      </details>
    </section>
  )
}
