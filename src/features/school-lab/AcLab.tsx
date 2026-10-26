import { useCallback, useState } from 'react'
import { addPhasors, idealAc, peak, period, radians, type AcComponent } from '../../domain/ac'
import { NumberControl, LabCanvas } from './LabCanvas'
import { display } from './display'
import { useLabAnimation } from './useLabAnimation'
import { Waveform, PhasorView } from './Waveform'

export function AcSymbol({ component }: { component: AcComponent }) {
  return (
    <LabCanvas title={`Idealer ${component}-Wechselstromkreis`} width={500} height={190}>
      <path className="circuit-wire" d="M90 65V30H360V65M360 125V160H90V115" />
      <circle cx="90" cy="90" r="25" className="symbol-outline" />
      <text x="90" y="100" textAnchor="middle" fontSize="30">
        ~
      </text>
      {component === 'R' ? (
        <rect x="346" y="65" width="28" height="60" className="symbol-outline" />
      ) : component === 'C' ? (
        <path className="circuit-wire" d="M360 65V82M335 82H385M335 106H385M360 106V125" />
      ) : (
        <path
          className="circuit-wire"
          d="M360 65c-25 0 -25 15 0 15c-25 0 -25 15 0 15c-25 0 -25 15 0 15c-25 0 -25 15 0 15"
        />
      )}
      <text x="130" y="94">
        Ueff · f
      </text>
      <text x="400" y="99">
        {component}
      </text>
      <text x="212" y="180">
        Ein idealer Verbraucher
      </text>
    </LabCanvas>
  )
}
export function AcLab() {
  const [mode, setMode] = useState<'sine' | 'R' | 'L' | 'C' | 'vectors'>('sine')
  const [f, setF] = useState(50),
    [amplitude, setAmplitude] = useState(325),
    [phase, setPhase] = useState(0)
  const [otherAmplitude, setOtherAmplitude] = useState(200),
    [otherPhase, setOtherPhase] = useState(60),
    [compare, setCompare] = useState(false)
  const [u, setU] = useState(24),
    [r, setR] = useState(120),
    [l, setL] = useState(100),
    [c, setC] = useState(100)
  const [timeMs, setTimeMs] = useState(1),
    [playing, setPlaying] = useState(false),
    [prediction, setPrediction] = useState(''),
    [revealed, setRevealed] = useState(false)
  const [first, setFirst] = useState(20),
    [second, setSecond] = useState(15),
    [angle, setAngle] = useState(60)
  const tick = useCallback(
    () => setTimeMs((t) => (t + (period(f) * 1000) / 80) % (period(f) * 2000)),
    [f],
  )
  const reduced = useLabAnimation(playing, tick)
  const component = mode === 'R' || mode === 'L' || mode === 'C' ? mode : undefined
  const model = component
    ? idealAc(component, f, u, component === 'R' ? r : component === 'L' ? l / 1000 : c / 1e6)
    : undefined
  const voltage = {
    amplitude: model ? peak(u) : amplitude,
    frequencyHz: f,
    phaseDegrees: model ? 0 : phase,
  }
  const current = model
    ? { amplitude: peak(model.currentRms), frequencyHz: f, phaseDegrees: model.currentPhaseDegrees }
    : undefined
  const resultant = addPhasors(
    { magnitude: first, angleDegrees: 0, frequencyHz: f },
    { magnitude: second, angleDegrees: angle, frequencyHz: f },
  )
  function choose(next: typeof mode) {
    setMode(next)
    setPlaying(false)
    setPrediction('')
    setRevealed(false)
  }
  return (
    <div className="school-lab">
      <div className="lab-mode-tabs" aria-label="AC-Modell">
        {(
          [
            ['sine', 'Sinus'],
            ['R', 'Widerstand'],
            ['L', 'Spule'],
            ['C', 'Kondensator'],
            ['vectors', 'Zeigeraddition'],
          ] as const
        ).map(([id, title]) => (
          <button type="button" key={id} aria-pressed={mode === id} onClick={() => choose(id)}>
            {title}
          </button>
        ))}
      </div>
      {mode === 'vectors' ? (
        <div className="lab-workspace">
          <section className="card lab-main">
            <h2>Zwei Spannungen. Eine Summe.</h2>
            <PhasorView
              magnitude={first}
              angleDegrees={0}
              second={{ magnitude: second, angleDegrees: angle }}
              result={resultant}
            />
            <div className="lab-readings">
              <span>
                x <strong>{display(resultant.x)} V</strong>
              </span>
              <span>
                y <strong>{display(resultant.y)} V</strong>
              </span>
              <span>
                Uges <strong>{display(resultant.magnitude)} V</strong>
              </span>
              <span>
                φges <strong>{display(resultant.angleDegrees)}°</strong>
              </span>
            </div>
            <p className="formula">Uges = √(U1² + U2² + 2 U1 U2 cos φ)</p>
            <p>Gleiche Frequenz, gemeinsame Referenz; alle Zeigerlängen sind Effektivspannungen.</p>
          </section>
          <aside className="card lab-settings">
            <NumberControl label="U1 [V]" value={first} min={1} max={50} onChange={setFirst} />
            <NumberControl label="U2 [V]" value={second} min={1} max={50} onChange={setSecond} />
            <NumberControl
              label="Winkel U2 [°]"
              value={angle}
              min={-180}
              max={180}
              onChange={setAngle}
            />
            <p>Referenz: U1 = 20 V, U2 = 15 V, φ = 60° → 30,414 V bei 25,285°.</p>
          </aside>
        </div>
      ) : (
        <div className="lab-workspace">
          <section className="card lab-main">
            <span className="eyebrow">
              {model ? 'EINGESCHWUNGENER IDEALER WECHSELSTROM' : 'ZEIT UND WINKEL VERBINDEN'}
            </span>
            <h2>
              {component
                ? `${component}: ${component === 'R' ? 'Spannung und Strom im Gleichklang' : component === 'L' ? 'Der Strom folgt' : 'Der Strom eilt voraus'}`
                : 'Den Sinus begreifen.'}
            </h2>
            {component && <AcSymbol component={component} />}
            <Waveform
              voltage={voltage}
              current={current}
              timeMs={Math.min(timeMs, period(f) * 2000)}
              onTime={setTimeMs}
            />
            {compare && !model && (
              <>
                <p>Zweite Spannung v(t), gleiche Frequenz, eigene Scheitelwertskala:</p>
                <Waveform
                  voltage={{ amplitude: otherAmplitude, frequencyHz: f, phaseDegrees: otherPhase }}
                  timeMs={Math.min(timeMs, period(f) * 2000)}
                  onTime={setTimeMs}
                />
              </>
            )}
            <div className="lab-controls-row">
              <button
                type="button"
                className="button button-outline"
                disabled={reduced}
                onClick={() => setPlaying((p) => !p)}
              >
                {playing && !reduced ? 'Pause' : 'Animation starten'}
              </button>
              <button type="button" className="button button-outline" onClick={tick}>
                Schritt +T/80
              </button>
              {reduced && <span>Bewegung reduziert: Einzelschritte verwenden.</span>}
            </div>
            <NumberControl
              label="Zeitcursor [ms]"
              value={Math.min(timeMs, period(f) * 2000)}
              min={0}
              max={period(f) * 2000}
              step={0.05}
              onChange={setTimeMs}
            />
            <div className="lab-diagram-row">
              <PhasorView
                magnitude={1}
                angleDegrees={voltage.phaseDegrees}
                second={
                  current
                    ? { magnitude: 1, angleDegrees: current.phaseDegrees }
                    : compare
                      ? { magnitude: otherAmplitude / amplitude, angleDegrees: otherPhase }
                      : undefined
                }
                timeAngle={((f * Math.min(timeMs, period(f) * 2000)) / 1000) * 360}
                normalized={!!current}
              />
              <div>
                <h3>Formel und Bezug</h3>
                <p className="formula">
                  u(t) = {display(voltage.amplitude)} V · sin(2π · {f} Hz · t +{' '}
                  {display(voltage.phaseDegrees)}°)
                </p>
                <p>
                  Positiver Winkel = voreilender Sinus. Die blaue senkrechte Projektion folgt
                  u(t)/Û.
                </p>
                <p>
                  Phasenabstand:{' '}
                  {current
                    ? `${current.phaseDegrees}° für i gegenüber u`
                    : compare
                      ? `${otherPhase - phase}° für v gegenüber u`
                      : `${phase}° zum Sinusbezug`}
                  . T = {display(period(f) * 1000)} ms.
                </p>
                {current && (
                  <p>Zeiger auf eigene Scheitelwerte normiert [1]; keine gemeinsame V/A-Skala.</p>
                )}
              </div>
            </div>
            {model && (
              <div className="lab-readings" data-testid="ac-results">
                <span>
                  {component === 'R' ? 'R' : component === 'L' ? 'XL' : 'XC'}{' '}
                  <strong>{display(model.impedance)} Ω</strong>
                </span>
                <span>
                  Ieff <strong>{display(model.currentRms)} A</strong>
                </span>
                <span>
                  P <strong>{display(model.activePowerW)} W</strong>
                </span>
                <span>
                  Q <strong>{display(model.reactivePowerVar)} var</strong>
                </span>
              </div>
            )}
          </section>
          <aside className="card lab-settings">
            <h3>Ausprobieren</h3>
            <NumberControl label="Frequenz [Hz]" value={f} min={10} max={200} onChange={setF} />
            {!model ? (
              <>
                <NumberControl
                  label="Scheitelwert Û [V]"
                  value={amplitude}
                  min={1}
                  max={400}
                  onChange={setAmplitude}
                />
                <NumberControl
                  label="Anfangswinkel φ [°]"
                  value={phase}
                  min={-180}
                  max={180}
                  onChange={setPhase}
                />
                <label className="lab-check">
                  <input
                    type="checkbox"
                    checked={compare}
                    onChange={(e) => setCompare(e.target.checked)}
                  />
                  Zweite Spannung vergleichen
                </label>
                {compare && (
                  <>
                    <NumberControl
                      label="Scheitelwert zweite Spannung [V]"
                      value={otherAmplitude}
                      min={1}
                      max={400}
                      onChange={setOtherAmplitude}
                    />
                    <NumberControl
                      label="Winkel zweite Spannung [°]"
                      value={otherPhase}
                      min={-180}
                      max={180}
                      onChange={setOtherPhase}
                    />
                  </>
                )}
              </>
            ) : (
              <>
                <NumberControl
                  label="Effektivspannung [V]"
                  value={u}
                  min={1}
                  max={48}
                  onChange={setU}
                />
                {component === 'R' ? (
                  <NumberControl
                    label="Widerstand [Ω]"
                    value={r}
                    min={10}
                    max={1000}
                    step={10}
                    onChange={setR}
                  />
                ) : component === 'L' ? (
                  <NumberControl
                    label="Induktivität [mH]"
                    value={l}
                    min={10}
                    max={500}
                    step={10}
                    onChange={setL}
                  />
                ) : (
                  <NumberControl
                    label="Kapazität [µF]"
                    value={c}
                    min={1}
                    max={200}
                    onChange={setC}
                  />
                )}
                <div className="prediction-box">
                  <h3>Vorhersagen</h3>
                  <p>Bei doppelter Frequenz und gleichem Ueff: Was passiert mit Ieff?</p>
                  <select
                    aria-label="Vorhersage zum Strom"
                    value={prediction}
                    onChange={(e) => {
                      setPrediction(e.target.value)
                      setRevealed(false)
                    }}
                  >
                    <option value="">Auswählen …</option>
                    <option value="same">Bleibt gleich</option>
                    <option value="half">Halbiert sich</option>
                    <option value="double">Verdoppelt sich</option>
                  </select>
                  <button
                    type="button"
                    className="button button-outline"
                    disabled={!prediction}
                    onClick={() => setRevealed(true)}
                  >
                    Vorhersage prüfen
                  </button>
                  {revealed && (
                    <p role="status">
                      {prediction ===
                      (component === 'R' ? 'same' : component === 'L' ? 'half' : 'double')
                        ? 'Richtig.'
                        : 'Noch einmal überlegen.'}{' '}
                      Bei {f * 2} Hz wären es{' '}
                      {display(
                        idealAc(
                          component!,
                          f * 2,
                          u,
                          component === 'R' ? r : component === 'L' ? l / 1000 : c / 1e6,
                        ).currentRms,
                      )}{' '}
                      A.{' '}
                      {component === 'R'
                        ? 'R ist frequenzunabhängig.'
                        : component === 'L'
                          ? 'XL wächst mit f.'
                          : 'XC sinkt mit f.'}
                    </p>
                  )}
                </div>
              </>
            )}
            <p className="input-help">
              {model
                ? `Ein einzelnes ideales ${component}-Bauteil; reiner Sinus, stationärer Zustand, f > 0. Passive Lastkonvention: QL positiv, QC negativ. Keine Verlust-, Einschalt- oder Netzsimulation.`
                : `Reiner Sinus; φ in der Formel als Winkel (${display(radians(phase))} rad). Animation zeitlich verlangsamt; der Cursor bestimmt die Modellzeit.`}
            </p>
          </aside>
        </div>
      )}
    </div>
  )
}
