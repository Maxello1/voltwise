import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ArrowRight, CheckCircle2, CircuitBoard, Info, MousePointer2, Zap } from 'lucide-react'
import type { LearningData } from '../../app/useLearningData'
import { circuitLibrary, type CircuitStudy } from '../../content/circuit-library'
import { exercises } from '../../content/curriculum'
import { resolveExercise } from '../../content/exercise-catalogue'
import { CircuitViewer } from '../../schematics/CircuitViewer'
import type { CircuitComponent } from '../../schematics/model'
import { startSession } from '../../storage/learning'
import { ErrorMessage, PageHeading } from '../../components/ui'
import { formatNumber } from '../../i18n/de'
import { controlVisuals, initialControlState } from '../../domain/control'
import { ControlPanel } from './ControlPanel'
import { ReversingExplorer } from './ReversingExplorer'

export function CircuitLab({ data }: { data: LearningData }) {
  const [params, setParams] = useSearchParams()
  const study =
    circuitLibrary.find((entry) => entry.circuit.id === params.get('circuit')) ?? circuitLibrary[0]!
  return (
    <div className="page-enter">
      <PageHeading
        eyebrow="DER SCHALTPLANRAUM"
        title="Sieh die Verbindung."
        description="Fünf geprüfte DC-Schaltungen und vier interaktive Steuerstromkreise. Entdecke jeden Strompfad."
        action={
          <span className="soft-badge sage">
            <CheckCircle2 size={14} />
            Geprüfte Lehrmodelle
          </span>
        }
      />
      <section className="circuit-library" aria-label="Schaltplanbibliothek">
        <div className="library-heading">
          <h2>Vom Widerstand zur Selbsthaltung.</h2>
          <span>GLEICHSTROM & STEUERUNG · STUFE 1–3</span>
        </div>
        <div className="circuit-library-grid">
          {circuitLibrary.map((entry, index) => (
            <button
              key={entry.circuit.id}
              className={`card circuit-option ${study.circuit.id === entry.circuit.id ? 'active' : ''}`}
              aria-label={entry.shortTitle}
              aria-pressed={study.circuit.id === entry.circuit.id}
              onClick={() => setParams({ circuit: entry.circuit.id })}
            >
              <span className="circuit-option-number">0{index + 1}</span>
              <h3>{entry.shortTitle}</h3>
              <p>
                Stufe {entry.tier} ·{' '}
                {exercises.filter((e) => e.circuitId === entry.circuit.id).length} Aufgaben
              </p>
              <CircuitBoard size={17} />
            </button>
          ))}
        </div>
      </section>
      {study.circuit.simulationMode === 'reversing' ? (
        <ReversingExplorer key={study.circuit.id} />
      ) : (
        <CircuitDetail key={study.circuit.id} study={study} data={data} />
      )}
    </div>
  )
}

function componentDescription(component: CircuitComponent) {
  switch (component.kind) {
    case 'source':
      return 'Ideale Gleichspannungsquelle'
    case 'resistor':
      return 'Ohmscher Widerstand'
    case 'lamp':
      return 'Lehrmodell: Lampe mit festem ohmschen Widerstand'
    case 'switch':
      return component.properties.state === 'closed'
        ? 'Idealer Schalter · geschlossen'
        : 'Idealer Schalter · offen'
    case 'ammeter':
      return 'Ideales Amperemeter · in Reihe · 0 Ω Innenwiderstand'
    case 'voltmeter':
      return 'Ideales Voltmeter · parallel · kein Messstrom'
    case 'ground':
      return 'Bezugspotenzial'
    case 'pushbutton-no':
      return 'Momentaner Schließertaster · unbetätigt offen'
    case 'pushbutton-nc':
      return 'Momentaner Öffnertaster · unbetätigt geschlossen'
    case 'contact-no':
      return 'Mechanisch zugeordneter Hilfsschließer'
    case 'contact-nc':
      return 'Mechanisch zugeordneter Hilfsöffner'
    case 'coil':
      return 'Ideale 24-V-DC-Schützspule'
    case 'overload-contact':
      return 'Überlast-Öffner · gespeicherte Auslösung bis Reset'
    case 'restart-permit':
      return 'Zusätzliche abstrahierte Wiederanlauffreigabe B1'
  }
}

function CircuitDetail({ study, data }: { study: CircuitStudy; data: LearningData }) {
  const [selected, setSelected] = useState('')
  const [showSolution, setShowSolution] = useState(false)
  const [error, setError] = useState('')
  const [controlState, setControlState] = useState(initialControlState)
  const navigate = useNavigate()
  const { circuit } = study
  const dynamic = circuit.simulationMode === 'finite-state'
  const states = dynamic ? controlVisuals(circuit.control, controlState) : undefined
  const component = circuit.components.find((c) => c.id === selected)
  const terminal = circuit.components.flatMap((c) => c.terminals).find((t) => t.id === selected)
  const net = circuit.nets.find((n) => n.id === selected || n.terminals.includes(selected))
  const circuitExercises = exercises.filter((e) => e.circuitId === circuit.id)
  const solvedCount = circuitExercises.filter((e) =>
    data.attempts.some((a) => a.exerciseId === e.id && a.correct),
  ).length
  const active = data.sessions.find((session) => session.status === 'active')
  const otherSession =
    active && active.exerciseIds.some((id) => resolveExercise(id)?.circuitId !== circuit.id)
  async function practice() {
    try {
      const session = await startSession('schematic', undefined, undefined, circuit.id)
      if (session) navigate('/ueben')
      else setError('Für diese Schaltung sind noch keine Aufgaben verfügbar.')
    } catch {
      setError('Sitzung konnte nicht gestartet werden.')
    }
  }
  return (
    <>
      <div className="lab-layout">
        <section className="card lab-circuit">
          <div className="lab-header">
            <div>
              <span className="eyebrow">
                LEHRSCHALTUNG {String(circuitLibrary.indexOf(study) + 1).padStart(2, '0')} ·
                {dynamic ? 'STEUERSTROMKREIS' : 'GLEICHSTROM'}
              </span>
              <h2>{circuit.title}</h2>
            </div>
            <span className="small-icon sage">
              <CircuitBoard size={23} />
            </span>
          </div>
          <p className="muted">{circuit.description}</p>
          {dynamic && (
            <ControlPanel circuit={circuit} state={controlState} onChange={setControlState} />
          )}
          <CircuitViewer
            circuit={circuit}
            selected={selected}
            onSelect={setSelected}
            states={states}
          />
          {dynamic && (
            <div className="terminal-picker">
              <label htmlFor="component-select">Bauteil auswählen</label>
              <select
                id="component-select"
                value={component ? selected : ''}
                onChange={(e) => setSelected(e.target.value)}
              >
                <option value="">Bauteil auswählen …</option>
                {circuit.components.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.designator} · {c.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="circuit-legend">
            <span>
              <span className="legend-dot" />
              Punkt = verbundener Knoten
            </span>
            <span>
              <MousePointer2 size={14} />
              Bauteile und Anschlüsse auswählen
            </span>
          </div>
          <div className="terminal-picker">
            <label htmlFor="terminal-select">Direkt zum Anschluss</label>
            <select
              id="terminal-select"
              value={terminal ? selected : ''}
              onChange={(event) => setSelected(event.target.value)}
            >
              <option value="">Anschluss auswählen …</option>
              {circuit.components.flatMap((c) =>
                c.terminals.map((t) => (
                  <option key={t.id} value={t.id}>
                    {c.designator} · {t.id}
                  </option>
                )),
              )}
            </select>
          </div>
          <div className="terminal-picker">
            <label htmlFor="net-select">Netz hervorheben</label>
            <select
              id="net-select"
              value={net?.id ?? ''}
              onChange={(event) => setSelected(event.target.value)}
            >
              <option value="">Alle Netze anzeigen</option>
              {circuit.nets.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label ?? (n.id === 'positive' ? 'Quellenplus' : 'Quellenminus')}
                </option>
              ))}
            </select>
          </div>
        </section>
        <aside className="lab-details card">
          <span className="small-icon sage">
            <Info size={22} />
          </span>
          <p className="eyebrow">GENAUER HINSEHEN</p>
          <h2>
            {component
              ? component.designator
              : terminal
                ? terminal.id
                : net
                  ? 'Ein gemeinsames Potenzial.'
                  : 'Lies die Verbindung.'}
          </h2>
          <p>
            {component
              ? `${componentDescription(component)} · ${component.label}`
              : net
                ? `Netz „${net.label ?? (net.id === 'positive' ? 'Quellenplus' : 'Quellenminus')}“ mit ${net.terminals.length} Anschlüssen. Die goldene Markierung folgt ausschließlich diesem Netz.`
                : 'Tippe auf ein Bauteil oder einen Anschluss. Du kannst auch ein ganzes Netz hervorheben.'}
          </p>
          {component && (
            <div className="component-detail">
              <span>
                Bezeichnung<strong>{component.designator}</strong>
              </span>
              <span>
                Wert / Zustand<strong>{component.label}</strong>
              </span>
              <span>
                Anschlüsse<strong>{component.terminals.length}</strong>
              </span>
              {states && (
                <span>
                  Simulierter Zustand
                  <strong>
                    {states[component.id] === 'on'
                      ? 'Ein'
                      : states[component.id] === 'off'
                        ? 'Aus'
                        : states[component.id] === 'closed'
                          ? 'Geschlossen'
                          : 'Offen'}
                  </strong>
                </span>
              )}
              {component.deviceId && (
                <span>
                  Gerätezuordnung
                  <strong>
                    {component.deviceId.toUpperCase()}
                    {component.deviceId === 'k1' ? ' · Spule ↔ Hilfskontakt' : ''}
                  </strong>
                </span>
              )}
            </div>
          )}
          <div className="explanation-note">
            <Zap size={17} />
            <p>{study.note}</p>
          </div>
          <button
            className="button button-outline"
            onClick={() => setShowSolution((value) => !value)}
          >
            {dynamic
              ? showSolution
                ? 'Ablauf ausblenden'
                : 'Ablauf nachvollziehen'
              : showSolution
                ? 'Berechnung ausblenden'
                : 'Berechnung nachvollziehen'}
          </button>
          {dynamic && (
            <Link className="text-link" to="/lernen?topic=controls">
              Lektion zur Steuerung <ArrowRight size={16} />
            </Link>
          )}
        </aside>
      </div>
      {showSolution && (
        <section className="card circuit-solution">
          <h2>Schritt für Schritt nachvollziehen</h2>
          <div className="solution-grid">
            {study.steps.map((step, index) => (
              <div key={step.title}>
                <span>
                  0{index + 1} · {step.title.toLocaleUpperCase('de')}
                </span>
                <strong>{step.formula}</strong>
              </div>
            ))}
          </div>
          {circuit.simulationMode === 'verified-static' && (
            <p>
              Rges = {formatNumber(circuit.validation.expected.equivalentResistance, 4)} Ω · Iges ={' '}
              {formatNumber(circuit.validation.expected.totalCurrent, 4)} A · Pges ={' '}
              {formatNumber(circuit.validation.expected.totalPower, 4)} W.
            </p>
          )}
          <p className="solution-assumption">
            {circuit.validation.method}. {study.note}
          </p>
        </section>
      )}
      <section className="card circuit-challenge">
        <span className="stat-icon amber">
          <Zap size={24} />
        </span>
        <div>
          <span className="eyebrow">VOM ANSEHEN ZUM ANWENDEN</span>
          <h2>{study.challenge}</h2>
          <p>
            {solvedCount
              ? `${solvedCount} von ${circuitExercises.length} Aufgaben bereits richtig gelöst.`
              : `${circuitExercises.length} Aufgaben zu genau dieser Schaltung.`}
          </p>
          {otherSession && (
            <p className="session-resume-notice">
              Deine offene Sitzung wird zuerst fortgesetzt. Danach kannst du hier eine neue starten.
            </p>
          )}
        </div>
        <button className="button button-primary" onClick={() => void practice()}>
          {active ? 'Offene Sitzung fortsetzen' : `${circuitExercises.length} Aufgaben starten`}
          <ArrowRight size={17} />
        </button>
      </section>
      <ErrorMessage>{error}</ErrorMessage>
      <p className="educational-note">
        Lehrschaltungen mit idealisierten Bauteilen.{' '}
        {dynamic
          ? 'Begrenztes, verzögerungsfreies Zustandsmodell ohne Motor-Leistungskreis oder Sicherheitsnachweis.'
          : 'Analytisch geprüfte feste DC-Zustände.'}{' '}
        Keine Anleitung für Arbeiten an elektrischen Anlagen.
      </p>
    </>
  )
}
