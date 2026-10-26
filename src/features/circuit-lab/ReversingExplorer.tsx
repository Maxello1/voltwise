import { useState } from 'react'
import { Link } from 'react-router'
import {
  initialReversingState,
  measureReversing,
  transitionReversing,
} from '../../domain/reversing'
import type { DiagnosticAction } from '../../domain/diagnostic-schema'
import type { DiagnosticReading } from '../../domain/diagnostics'
import { ReversingWorkbench } from './ReversingWorkbench'

export function ReversingExplorer() {
  const [state, setState] = useState(initialReversingState)
  const [readings, setReadings] = useState<DiagnosticReading[]>([])
  function action(action: DiagnosticAction) {
    const reading =
      action[0] === 'measure'
        ? {
            index: (readings.at(-1)?.index ?? -1) + 1,
            state,
            red: action[1],
            black: action[2],
            voltage: measureReversing(state, action[1], action[2]),
          }
        : undefined
    if (reading) setReadings((r) => [...r.slice(-11), reading])
    else if (action[0] !== 'inspect' && action[0] !== 'measure')
      setState((s) => transitionReversing(s, { [action[0]]: action[1] }))
  }
  return (
    <section className="card reversing-explorer">
      <span className="eyebrow">FORTGESCHRITTENER STEUERSTROMKREIS</span>
      <h2>Zwei Richtungen. Eine Freigabe.</h2>
      <p>
        Vor und Rück sind gegenseitig elektrisch verriegelt. Erkunde die intakte Schaltung oder
        untersuche einen verborgenen Fehler mit Messprotokoll.
      </p>
      <div className="diagnostic-links">
        <Link className="button button-primary" to="/fehlersuche">
          Fehlersuche öffnen
        </Link>
        <Link className="text-link" to="/lernen?topic=advanced-controls">
          Wenden und Messen verstehen
        </Link>
      </div>
      <ReversingWorkbench state={state} readings={readings} onAction={action} />
      <button
        className="button button-outline"
        onClick={() => {
          setState(initialReversingState())
          setReadings([])
        }}
      >
        Experiment zurücksetzen
      </button>
      <p className="muted tiny">
        Freies Erkunden zählt nicht als Lernversuch. Dieser Experimentzustand wird beim Verlassen
        zurückgesetzt.
      </p>
    </section>
  )
}
