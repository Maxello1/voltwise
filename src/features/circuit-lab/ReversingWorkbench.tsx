import { useState } from 'react'
import { CircuitViewer } from '../../schematics/CircuitViewer'
import { reversingCircuit } from '../../content/circuits/reversing'
import {
  reversingPotentials,
  reversingVisuals,
  type ReversingFault,
  type ReversingState,
} from '../../domain/reversing'
import type { DiagnosticAction } from '../../domain/diagnostic-schema'
import type { DiagnosticReading } from '../../domain/diagnostics'

const stateWords: Record<string, string> = {
  on: 'ein',
  off: 'aus',
  open: 'offen',
  closed: 'geschlossen',
}
function pointLabel(id: string) {
  const c = reversingCircuit.components.find((c) => c.terminals.some((t) => t.id === id))
  const t = c?.terminals.find((t) => t.id === id)
  return c && t
    ? `${c.designator} ${t.role === 'positive' ? '+' : t.role === 'negative' ? '−' : t.role}${c.id.includes('hold') ? ' (Halten)' : c.id.includes('nc') ? ' (Verriegelung)' : ''}`
    : id
}

export function ReversingWorkbench({
  state,
  fault,
  readings,
  onAction,
  busy = false,
  revealedFault,
  limited = false,
}: {
  state: ReversingState
  fault?: ReversingFault
  readings: DiagnosticReading[]
  onAction: (action: DiagnosticAction) => void
  busy?: boolean
  revealedFault?: string
  limited?: boolean
}) {
  const [selected, setSelected] = useState('')
  const [red, setRed] = useState('g1.a')
  const [black, setBlack] = useState('g1.b')
  const [understand, setUnderstand] = useState(false)
  const [overlay, setOverlay] = useState<'nets' | 'voltage'>('nets')
  const visuals = reversingVisuals(state, fault)
  const potentials = reversingPotentials(state, fault).values
  const component = reversingCircuit.components.find((c) => c.id === selected)
  const inputs = state.inputs
  const controls = [
    ['forward', 'Vor', inputs.forward],
    ['reverse', 'Rück', inputs.reverse],
    ['stop', 'Stop', inputs.stop],
  ] as const
  const points = reversingCircuit.components.flatMap((c) => c.terminals)
  return (
    <div className="reversing-workbench">
      <section className="control-panel" aria-label="Wendeschütze bedienen">
        <div className="control-panel-heading">
          <span className="eyebrow">24 V DC · STEUERSTROMKREIS</span>
          <strong>Zwei Richtungen erkunden</strong>
        </div>
        <p>
          Einmal drücken, nochmals loslassen. Zum Wenden: Stop, beide Starttaster loslassen, Stop
          loslassen, neue Richtung.
        </p>
        <div className="control-actions">
          {controls.map(([input, label, pressed]) => (
            <button
              key={input}
              className={`button ${input === 'stop' ? 'button-outline' : 'button-primary'}`}
              disabled={busy || limited}
              aria-pressed={pressed}
              onClick={() => onAction([input, !pressed])}
            >
              {label} {pressed ? 'loslassen' : 'drücken'}
            </button>
          ))}
          <button
            className="button button-outline"
            disabled={busy || limited}
            aria-pressed={!inputs.supply}
            onClick={() => onAction(['supply', !inputs.supply])}
          >
            {inputs.supply ? '24 V ausschalten' : '24 V einschalten'}
          </button>
        </div>
        <div className="control-readings" aria-live="polite">
          <span>
            K1 <strong>{state.direction === 'forward' ? 'ein' : 'aus'}</strong>
          </span>
          <span>
            K2 <strong>{state.direction === 'reverse' ? 'ein' : 'aus'}</strong>
          </span>
          <span>
            B1 <strong>{state.ready ? 'freigegeben' : 'gesperrt'}</strong>
          </span>
          <span>
            Auslösung F1 <strong>{state.tripped ? 'gespeichert' : 'quittiert'}</strong>
          </span>
        </div>
        <details className="control-details">
          <summary>Überlast und Reset bedienen</summary>
          <div className="control-actions">
            <button
              className="button button-outline"
              disabled={busy || limited}
              aria-pressed={inputs.trip}
              onClick={() => onAction(['trip', !inputs.trip])}
            >
              {inputs.trip ? 'Überlastursache beseitigen' : 'Überlast auslösen'}
            </button>
            <button
              className="button button-outline"
              disabled={busy || limited}
              aria-pressed={inputs.reset}
              onClick={() => onAction(['reset', !inputs.reset])}
            >
              {inputs.reset ? 'Reset loslassen' : 'F1 zurücksetzen'}
            </button>
          </div>
          <p>
            Reset wirkt nur als neue Betätigung bei vorhandener Versorgung, beseitigter Ursache und
            losgelassenen Start-/Stop-Tastern. Ein fehlerhaft offener F1-Kontakt bleibt davon
            unabhängig offen.
          </p>
        </details>
      </section>
      <div className="understand-controls">
        <label>
          <input
            type="checkbox"
            checked={understand}
            onChange={(e) => setUnderstand(e.target.checked)}
          />{' '}
          Schaltplan verstehen
        </label>
        {understand && (
          <label>
            Darstellung
            <select
              aria-label="Darstellung verstehen"
              value={overlay}
              onChange={(e) => setOverlay(e.target.value as 'nets' | 'voltage')}
            >
              <option value="nets">Netzzugehörigkeit</option>
              <option value="voltage">Potenziale gegen G1−</option>
            </select>
          </label>
        )}
      </div>
      <CircuitViewer
        circuit={reversingCircuit}
        selected={selected}
        onSelect={setSelected}
        states={visuals}
        overlay={understand ? overlay : undefined}
        potentials={potentials}
        revealedFault={revealedFault}
      />
      <p className="input-help">
        Gold = ausgewähltes Netz.{' '}
        {understand
          ? overlay === 'nets'
            ? 'Farbe und Strichmuster unterscheiden die fest verdrahteten Netze; sie zeigen keinen Strom.'
            : 'Grün = +24 V, Grau = 0 V, gestrichelt = Potenzial unbestimmt. Kein Stromnachweis.'
          : 'Spulenfüllung = erregt; Kontaktgeometrie = offen/geschlossen.'}{' '}
        Im Verstehen-Modus markieren blaue Punkte die virtuellen Messanschlüsse. Für kleine
        Beschriftungen vergrößern (bis 300 %), dann mit einem Finger verschieben. Zwei Finger
        zoomen.
      </p>
      <div className="diagnostic-inspection">
        <label>
          Bauteil untersuchen
          <select
            aria-label="Bauteil untersuchen"
            value={component?.id ?? ''}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Bauteil auswählen …</option>
            {reversingCircuit.components.map((c) => (
              <option key={c.id} value={c.id}>
                {c.designator} · {c.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Netz oder Anschluss
          <select
            aria-label="Netz oder Anschluss"
            value={component ? '' : selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Netz oder Anschluss wählen …</option>
            {reversingCircuit.nets.map((n) => (
              <option key={n.id} value={n.id}>
                Netz: {n.label}
              </option>
            ))}
            {points.map((t) => (
              <option key={t.id} value={t.id}>
                {pointLabel(t.id)}
              </option>
            ))}
          </select>
        </label>
        {component && (
          <div className="inspection-result">
            <strong>
              {component.designator} · {component.label}: {stateWords[visuals[component.id]!]}
            </strong>
            <span>
              {component.deviceId
                ? `Gerätezuordnung: ${component.deviceId.toUpperCase()}`
                : 'Eigenständiges Bauteil'}{' '}
              · {component.terminals.map((t) => t.role).join('–')}
            </span>
            <button
              className="button button-outline"
              disabled={busy || limited}
              onClick={() => onAction(['inspect', component.id])}
            >
              Beobachtung protokollieren
            </button>
          </div>
        )}
        {selected && !component && (
          <p className="input-help">
            {
              reversingCircuit.nets.find((n) => n.id === selected || n.terminals.includes(selected))
                ?.label
            }{' '}
            ·{' '}
            {understand && overlay === 'voltage'
              ? `${potentials[reversingPotentials(state, fault).netFor(selected) ?? selected] ?? 'unbestimmt'} gegen G1−`
              : 'Auswahl hebt die ausdrücklich definierten Netzanschlüsse hervor.'}
          </p>
        )}
      </div>
      <section className="virtual-meter" aria-label="Virtuelles Voltmeter">
        <div className="meter-title">
          <span className="eyebrow">VIRTUELLES VOLTMETER</span>
          <strong>Eine Differenz. Zwei Messpunkte.</strong>
        </div>
        <div className="meter-probes">
          {(
            [
              ['Rot (+)', red, setRed],
              ['Schwarz (−)', black, setBlack],
            ] as const
          ).map(([label, value, change]) => (
            <label key={label}>
              {label}
              <select aria-label={label} value={value} onChange={(e) => change(e.target.value)}>
                {points.map((t) => (
                  <option key={t.id} value={t.id}>
                    {pointLabel(t.id)}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <button
          className="button button-outline"
          disabled={busy || limited}
          onClick={() => onAction(['measure', red, black])}
        >
          Spannung ablesen
        </button>
        <p className="input-help">
          Ideal 24 V DC. G1− = 0 V. Rot minus Schwarz. Isolierte Teilnetze: unbestimmt.
          Ausschließlich virtuelle Lehrschaltung.
        </p>
        {!!readings.length && (
          <ol className="measurement-log" aria-label="Messprotokoll">
            {readings.map((r) => (
              <li key={r.index}>
                <span>
                  {pointLabel(r.red)} → {pointLabel(r.black)}
                  <small>
                    Vor {r.state.inputs.forward ? 'gedrückt' : 'los'} · K1{' '}
                    {r.state.direction === 'forward' ? 'ein' : 'aus'}
                  </small>
                </span>
                <strong>{r.voltage === null ? 'unbestimmt' : `${r.voltage} V`}</strong>
              </li>
            ))}
          </ol>
        )}
      </section>
      {limited && (
        <p role="status">
          24 Untersuchungsschritte erreicht. Deine Belege sind gespeichert; du kannst die Diagnose
          jetzt abgeben.
        </p>
      )}
      <p className="educational-note">
        Ideale, verzögerungsfreie Kontakte. B1 ist zusätzliche abstrakte Befehlslogik. Keine
        mechanische Verriegelung oder Motorphysik modelliert. Keine Anleitung zum Prüfen
        eingeschalteter Anlagen.
      </p>
    </div>
  )
}
