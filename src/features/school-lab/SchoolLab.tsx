import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { PageHeading, ErrorMessage } from '../../components/ui'
import { schoolRound, schoolArea, type SchoolArea } from '../../domain/school-practice'
import { startSession } from '../../storage/learning'
import { RoundControls } from '../practice/RoundControls'
import { AcLab } from './AcLab'
import { MotorLab } from './MotorLab'

export function SchoolLab() {
  const [params, setParams] = useSearchParams(),
    navigate = useNavigate()
  const lab = params.get('lab') === 'motor' ? 'motor' : 'ac'
  const [error, setError] = useState('')
  return (
    <div className="page-enter">
      <PageHeading
        eyebrow="VERSTEHEN · VORHERSAGEN · AUSPROBIEREN"
        title="Dein Labor für Zusammenhänge."
        description="Zwei geprüfte Lehrmodelle: Sinusgrößen und ideale R/L/C-Bauteile sowie das Prinzip der Gleichstrommaschine."
      />
      <nav className="lab-mode-tabs" aria-label="Lernlabore">
        <button aria-pressed={lab === 'ac'} onClick={() => setParams({ lab: 'ac' })}>
          Wechselstromlabor
        </button>
        <button aria-pressed={lab === 'motor'} onClick={() => setParams({ lab: 'motor' })}>
          Motorlabor
        </button>
        <Link to="/lernen?topic=plc-bits">SPS-Theorie lernen</Link>
      </nav>
      {lab === 'ac' ? <AcLab key="ac" /> : <MotorLab key="motor" />}
      <section className="card school-practice-links">
        <h2>Jetzt selbst lösen.</h2>
        <p>
          Erkunden erzeugt keine Lernversuche. Aufgaben werden erst mit „Antwort prüfen“
          gespeichert.
        </p>
        <div className="lab-controls-row">
          <Link
            className="button button-outline"
            to={`/lernen?topic=${lab === 'ac' ? 'ac-sine' : 'motor-force'}`}
          >
            Zum Lernstoff
          </Link>
          {(lab === 'ac'
            ? [
                ['school-vector-place-v1', 'Zeiger konstruieren'],
                ['school-wave-build-v1', 'Sinus einstellen'],
                ['school-l-chain-v1', 'Spule berechnen'],
              ]
            : [
                ['school-part-commutator-v1', 'Motorbauteil erkennen'],
                ['school-loop-chain-v1', 'Kraft und Drehmoment'],
                ['school-emf-chain-v1', 'Anlauf vergleichen'],
              ]
          ).map(([id, title]) => (
            <Link key={id} className="button button-outline" to={`/ueben?aufgabe=${id}`}>
              {title}
            </Link>
          ))}
        </div>
      </section>
      <SchoolRound
        area={lab}
        code={params.get('code') ?? '000000'}
        onSelect={(code) => {
          setError('')
          setParams({ lab, code })
        }}
        onStart={async (area, code) => {
          try {
            await startSession(
              'practice',
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              { area, code },
            )
            navigate('/ueben')
          } catch {
            setError('Rechenrunde konnte nicht gespeichert werden.')
          }
        }}
      />
      <ErrorMessage>{error}</ErrorMessage>
    </div>
  )
}
export function SchoolRound({
  area,
  code,
  onSelect,
  onStart,
}: {
  area: SchoolArea
  code: string
  onSelect: (code: string) => void
  onStart: (area: SchoolArea, code: string) => Promise<void>
}) {
  const valid = /^\d{6}$/.test(code),
    problems = valid ? schoolRound(area, code) : []
  return (
    <section className="card school-round">
      <span className="eyebrow">REPRODUZIERBAR RECHNEN</span>
      <h2>{area === 'ac' ? 'Wechselstrom' : area === 'motor' ? 'Motor' : 'SPS'}-Rechenrunde</h2>
      <p>
        Ein Code wählt dieselben Aufgaben auf jedem Gerät. Der Link enthält nur Fachgebiet und Code.
      </p>
      <RoundControls
        key={`${area}-${code}`}
        code={code}
        onSelect={onSelect}
        shareHash={`/ueben?trainer=${area}&code=${code}`}
      />
      {valid ? (
        <>
          <ol className="school-round-preview">
            {problems.map((p) => (
              <li key={p.id}>
                <strong>{p.title}</strong>
                <span>{p.prompt}</span>
              </li>
            ))}
          </ol>
          <button className="button button-primary" onClick={() => void onStart(area, code)}>
            {problems.length} Aufgaben starten
          </button>
        </>
      ) : (
        <p>Bitte sechs Ziffern als Übungscode eingeben.</p>
      )}
      <p className="input-help">
        Toleranz: 0,1 %; Nullwerte ±10⁻⁹. Kompatible Einheiten und Dezimalkomma werden akzeptiert.
        Rechenrunden verändern keinen FSRS-Termin.
      </p>
    </section>
  )
}
export function SchoolTrainer() {
  const [params, setParams] = useSearchParams(),
    navigate = useNavigate()
  const [error, setError] = useState('')
  const selected = params.get('trainer'),
    area: SchoolArea = schoolArea(selected) ? selected : 'ac'
  return (
    <div className="page-enter">
      <PageHeading
        eyebrow="RECHNEN & VERSTEHEN"
        title="Neue Werte. Gleiche Zusammenhänge."
        description="Reproduzierbare Aufgaben mit klaren Einheiten und vollständigem Rechenweg."
      />
      <SchoolRound
        area={area}
        code={params.get('code') ?? '000000'}
        onSelect={(code) => setParams({ trainer: area, code })}
        onStart={async (value, code) => {
          try {
            await startSession(
              'practice',
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              { area: value, code },
            )
            navigate('/ueben')
          } catch {
            setError('Rechenrunde konnte nicht gespeichert werden.')
          }
        }}
      />
      <ErrorMessage>{error}</ErrorMessage>
    </div>
  )
}
