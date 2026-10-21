import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ArrowRight, CheckCircle2, CircuitBoard, Info, MousePointer2, Zap } from 'lucide-react'
import type { LearningData } from '../../app/useLearningData'
import { parallelDemo } from '../../content/circuit'
import { parallelCircuit } from '../../domain/electrical'
import { CircuitViewer } from '../../schematics/CircuitViewer'
import { startSession } from '../../storage/learning'
import { ErrorMessage, PageHeading } from '../../components/ui'
import { formatNumber } from '../../i18n/de'

export function CircuitLab({ data }: { data: LearningData }) {
  const [selected, setSelected] = useState('')
  const [showSolution, setShowSolution] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const solution = parallelCircuit(24, [100, 200])
  const component = parallelDemo.components.find((c) => c.id === selected)
  const terminal = parallelDemo.components
    .flatMap((c) => c.terminals)
    .find((t) => t.id === selected)
  const net = parallelDemo.nets.find((n) => n.terminals.includes(selected))
  const solved = data.attempts.some((a) => a.exerciseId === 'identify-r2' && a.correct)
  async function practice() {
    try {
      await startSession('schematic')
      navigate('/ueben')
    } catch {
      setError('Sitzung konnte nicht gestartet werden.')
    }
  }
  return (
    <div className="page-enter">
      <PageHeading
        eyebrow="DER SCHALTPLANRAUM"
        title="Sieh die Verbindung."
        description="Wähle Bauteile aus. Entdecke Strompfade. Verstehe die Schaltung."
        action={
          <span className="soft-badge sage">
            <CheckCircle2 size={14} />
            Analytisch geprüft
          </span>
        }
      />
      <div className="lab-layout">
        <section className="card lab-circuit">
          <div className="lab-header">
            <div>
              <span className="eyebrow">LEHRSCHALTUNG 01 · GLEICHSTROM</span>
              <h2>{parallelDemo.title}</h2>
            </div>
            <span className="small-icon sage">
              <CircuitBoard size={23} />
            </span>
          </div>
          <p className="muted">{parallelDemo.description}</p>
          <CircuitViewer circuit={parallelDemo} selected={selected} onSelect={setSelected} />
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
              {parallelDemo.components.flatMap((c) =>
                c.terminals.map((t) => (
                  <option key={t.id} value={t.id}>
                    {c.designator} · {t.id}
                  </option>
                )),
              )}
            </select>
          </div>
        </section>
        <aside className="lab-details card">
          <span className="small-icon sage">
            <Info size={22} />
          </span>
          <p className="eyebrow">GENAUER HINSEHEN</p>
          <h2>
            {component ? component.designator : terminal ? terminal.id : 'Alles ist verbunden.'}
          </h2>
          <p>
            {component
              ? `${component.kind === 'source' ? 'Gleichspannungsquelle' : 'Ohmscher Widerstand'} · ${component.label}`
              : terminal
                ? `Anschluss im Netz „${net?.id === 'positive' ? 'positives Potenzial' : 'Bezugspotenzial'}“.`
                : 'Tippe auf ein Bauteil oder einen Anschluss, um seine Rolle im Stromkreis zu entdecken.'}
          </p>
          {component && (
            <div className="component-detail">
              <span>
                Bezeichnung<strong>{component.designator}</strong>
              </span>
              <span>
                Wert<strong>{component.label}</strong>
              </span>
              <span>
                Anschlüsse<strong>{component.terminals.length}</strong>
              </span>
            </div>
          )}
          <div className="explanation-note">
            <Zap size={17} />
            <p>
              Beide Widerstände liegen zwischen denselben zwei Knoten. An jedem liegen deshalb 24 V.
            </p>
          </div>
          <button
            className="button button-outline"
            onClick={() => setShowSolution((value) => !value)}
          >
            {showSolution ? 'Berechnung ausblenden' : 'Berechnung nachvollziehen'}
          </button>
        </aside>
      </div>
      {showSolution && (
        <section className="card circuit-solution">
          <h2>Von der Spannung zum Gesamtstrom</h2>
          <div className="solution-grid">
            <div>
              <span>01 · ZWEIG R1</span>
              <strong>24 V / 100 Ω = 0,24 A</strong>
            </div>
            <div>
              <span>02 · ZWEIG R2</span>
              <strong>24 V / 200 Ω = 0,12 A</strong>
            </div>
            <div>
              <span>03 · KNOTENREGEL</span>
              <strong>Iges = {formatNumber(solution.totalCurrent, 2)} A</strong>
            </div>
          </div>
          <p>
            Rges = {formatNumber(solution.equivalentResistance, 4)} Ω · Pges ={' '}
            {formatNumber(solution.totalPower, 2)} W. Der Gesamtstrom ist die Summe beider
            Zweigströme.
          </p>
        </section>
      )}
      <section className="card circuit-challenge">
        <span className="stat-icon amber">
          <Zap size={24} />
        </span>
        <div>
          <span className="eyebrow">VOM ANSEHEN ZUM ANWENDEN</span>
          <h2>Findest du den richtigen Widerstand?</h2>
          <p>
            {solved
              ? 'Du hast R2 schon einmal richtig erkannt. Vertiefe dein Verständnis.'
              : 'Lies den Schaltplan und berechne anschließend den Gesamtstrom.'}
          </p>
        </div>
        <button className="button button-primary" onClick={() => void practice()}>
          2 Aufgaben starten
          <ArrowRight size={17} />
        </button>
      </section>
      <ErrorMessage>{error}</ErrorMessage>
      <p className="educational-note">
        Lehrschaltung mit idealisierten Bauteilen. Keine Simulation und keine Anleitung für Arbeiten
        an elektrischen Anlagen. Weitere Schaltungen und Relaislogik folgen später.
      </p>
    </div>
  )
}
