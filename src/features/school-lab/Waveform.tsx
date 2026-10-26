import { display } from './display'
import { sineValue, period, rms, phasorComponents, type SineSignal } from '../../domain/ac'
import { LabCanvas } from './LabCanvas'

export function Waveform({
  voltage,
  current,
  timeMs,
  onTime,
  normalized = false,
}: {
  voltage: SineSignal
  current?: SineSignal
  timeMs: number
  onTime?: (timeMs: number) => void
  normalized?: boolean
}) {
  const duration = period(voltage.frequencyHz) * 2
  const x = (seconds: number) => 60 + (seconds / duration) * 650
  const y = (value: number, amplitude: number) => 145 - (value / Math.max(amplitude, 1e-12)) * 95
  const path = (signal: SineSignal) =>
    Array.from({ length: 401 }, (_, i) => {
      const t = (i / 400) * duration
      return `${i ? 'L' : 'M'}${x(t)},${y(sineValue(signal, t), signal.amplitude)}`
    }).join(' ')
  const u = sineValue(voltage, timeMs / 1000),
    i = current ? sineValue(current, timeMs / 1000) : undefined
  const peakTimeU = ((((((90 - voltage.phaseDegrees) % 360) + 360) % 360) / 360) * duration) / 2
  const peakTimeI = current
    ? ((((((90 - current.phaseDegrees) % 360) + 360) % 360) / 360) * duration) / 2
    : 0
  return (
    <>
      <LabCanvas
        title="Sinusdiagramm mit Zeitcursor"
        onPoint={
          onTime
            ? (px) =>
                onTime(Math.min(duration * 1000, Math.max(0, ((px - 60) / 650) * duration * 1000)))
            : undefined
        }
      >
        <g className="plot-grid">
          {Array.from({ length: 9 }, (_, n) => (
            <path key={n} d={`M${60 + n * 81.25} 40V250`} />
          ))}
          {[50, 97.5, 145, 192.5, 240].map((yy) => (
            <path key={yy} d={`M60 ${yy}H710`} />
          ))}
        </g>
        <path className="plot-axis" d="M60 35V250M60 145H715" />
        <text x="15" y="25" className="voltage-text">
          {normalized ? 'u/Û [1]' : 'u [V]'}
        </text>
        {current && (
          <text x="715" y="25" className="current-text">
            {normalized ? 'i/Î [1]' : 'i [A]'}
          </text>
        )}
        <text x="740" y="160">
          t [ms]
        </text>
        <text x="6" y="54" className="voltage-text">
          {normalized ? '1' : display(voltage.amplitude, 1)}
        </text>
        <text x="20" y="245" className="voltage-text">
          {normalized ? '−1' : display(-voltage.amplitude, 1)}
        </text>
        {current && (
          <>
            <text x="720" y="54" className="current-text">
              {normalized ? '1' : display(current.amplitude, 2)}
            </text>
            <text x="720" y="245" className="current-text">
              {normalized ? '−1' : display(-current.amplitude, 2)}
            </text>
          </>
        )}
        {[0, 0.5, 1, 1.5, 2].map((f) => (
          <text key={f} x={x((f * duration) / 2)} y="272" textAnchor="middle">
            {display(((f * duration) / 2) * 1000, 2)}
          </text>
        ))}
        <path className="voltage-line" d={path(voltage)} />
        {current && <path className="current-line" d={path(current)} />}
        {current && (
          <>
            <path
              className="period-marker"
              d={`M${x(peakTimeU)} 245v12M${x(peakTimeU)} 251H${x(peakTimeI)}M${x(peakTimeI)} 245v12`}
            />
            <text x="485" y="291">
              Δt der Spitzen: {display((peakTimeI - peakTimeU) * 1000)} ms
            </text>
          </>
        )}
        <path className="period-marker" d={`M60 20V32M60 26H385M385 20V32`} />
        <text x="220" y="19" textAnchor="middle">
          T = {display((duration / 2) * 1000)} ms
        </text>
        <path className="time-cursor" d={`M${x(timeMs / 1000)} 40V250`} />
        <circle cx={x(timeMs / 1000)} cy={y(u, voltage.amplitude)} r="6" className="voltage-dot" />
        {current && i !== undefined && (
          <circle
            cx={x(timeMs / 1000)}
            cy={y(i, current.amplitude)}
            r="6"
            className="current-dot"
          />
        )}
      </LabCanvas>
      <p className="input-help">
        {current
          ? normalized
            ? 'Normiert: Jede Kurve wird durch ihren eigenen Scheitelwert geteilt; die Werte an beiden Achsen sind dimensionslos.'
            : 'Getrennte Skalen: Spannung links in V (durchgezogen), Strom rechts in A (gestrichelt). Gleiche Bildhöhe bedeutet nicht denselben physikalischen Wert.'
          : 'Spannung in V, Zeit in ms. Zeitcursor ziehen oder den Regler mit Pfeiltasten bedienen.'}
      </p>
      <div className="lab-readings" aria-live="off">
        <span>
          t <strong>{display(timeMs)} ms</strong>
        </span>
        <span>
          u(t) <strong>{display(u)} V</strong>
        </span>
        {i !== undefined && (
          <span>
            i(t) <strong>{display(i)} A</strong>
          </span>
        )}
        <span>
          Ueff <strong>{display(rms(voltage.amplitude))} V</strong>
        </span>
        <span>
          ωt <strong>{display(((voltage.frequencyHz * timeMs) / 1000) * 360)}°</strong>
        </span>
      </div>
    </>
  )
}
export function PhasorView({
  magnitude = 1,
  angleDegrees,
  second,
  timeAngle = 0,
  onPoint,
  result,
  normalized = false,
}: {
  magnitude?: number
  angleDegrees: number
  second?: { magnitude: number; angleDegrees: number }
  timeAngle?: number
  onPoint?: (x: number, y: number) => void
  result?: { x: number; y: number }
  normalized?: boolean
}) {
  const scale = result ? 3 : 110 / Math.max(magnitude, second?.magnitude ?? 0, 1)
  const vector = (m: number, a: number) =>
    phasorComponents({ magnitude: m, angleDegrees: a + timeAngle, frequencyHz: 50 })
  const p = vector(magnitude, angleDegrees),
    q = second ? vector(second.magnitude, second.angleDegrees) : undefined
  const arrow = (x: number, y: number, cls: string) => (
    <g className={cls}>
      <path d={`M200 150L${200 + x * scale} ${150 - y * scale}`} />
      <circle cx={200 + x * scale} cy={150 - y * scale} r="5" />
    </g>
  )
  return (
    <LabCanvas
      title="Zeigerdiagramm"
      width={400}
      onPoint={onPoint ? (x, y) => onPoint((x - 200) / scale, (150 - y) / scale) : undefined}
    >
      <circle cx="200" cy="150" r="110" className="phasor-circle" />
      <path className="plot-axis" d="M30 150H370M200 20V275" />
      <text x="355" y="175">
        Re
      </text>
      <text x="213" y="25">
        Im
      </text>
      <text x="28" y="285">
        {normalized
          ? 'Normierte Zeiger [1]'
          : result
            ? 'Effektivwerte [V]'
            : 'Relative Scheitelwertzeiger [1]'}
      </text>
      {arrow(p.x, p.y, 'voltage-vector')}
      {q && arrow(q.x, q.y, 'current-vector')}
      {result && (
        <>
          <path
            className="plot-grid"
            d={`M${200 + result.x * scale} 150V${150 - result.y * scale}H200`}
          />
          {arrow(result.x, result.y, 'result-vector')}
        </>
      )}
    </LabCanvas>
  )
}
