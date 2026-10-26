import type { ReactNode } from 'react'
import { motorParts, motorState, type Excitation, excitationNets } from '../../domain/dc-motor'
import { LabCanvas } from './LabCanvas'

export function MotorDiagram({
  angle = 0,
  commutated = true,
  fieldPolarity = 1,
  supplyPolarity = 1,
  selected = '',
  onSelect,
  quiz = false,
}: {
  angle?: number
  commutated?: boolean
  fieldPolarity?: 1 | -1
  supplyPolarity?: 1 | -1
  selected?: string
  onSelect?: (part: string) => void
  quiz?: boolean
}) {
  const state = motorState(angle, { commutated, fieldPolarity, supplyPolarity })
  const part = (id: string, children: ReactNode) => {
    const index = motorParts.findIndex((p) => p.id === id),
      record = motorParts[index]!
    return (
      <g
        className={`motor-part ${selected === id ? 'selected-part' : ''}`}
        key={id}
        role={onSelect ? 'button' : undefined}
        tabIndex={onSelect ? 0 : undefined}
        aria-label={quiz ? `Bauteil ${index + 1}` : record.name}
        aria-pressed={onSelect ? selected === id : undefined}
        onClick={onSelect ? () => onSelect(id) : undefined}
        onKeyDown={
          onSelect
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect(id)
                }
              }
            : undefined
        }
      >
        <title>{quiz ? `Bauteil ${index + 1}` : record.name}</title>
        {children}
      </g>
    )
  }
  const x = 380 + state.x * 85,
    y = 180 - state.y * 85
  const x2 = 380 - state.x * 85,
    y2 = 180 + state.y * 85
  const direction = state.forceDirection
  return (
    <LabCanvas
      title={quiz ? 'Motor: Bauteile selbst erkennen' : 'Gleichstrommotor: Aufbau und Kräfte'}
      width={760}
      height={440}
    >
      {part(
        'stator',
        <>
          <rect x="145" y="35" width="470" height="290" rx="55" className="motor-stator" />
          <text x="175" y="60">
            {quiz ? '1' : 'Ständer'}
          </text>
        </>,
      )}
      {part(
        'poles',
        <>
          <rect x="155" y="100" width="80" height="160" rx="8" className="north-pole" />
          <rect x="525" y="100" width="80" height="160" rx="8" className="south-pole" />
          <text x="195" y="185" textAnchor="middle" className="pole-letter">
            {fieldPolarity === 1 ? 'N' : 'S'}
          </text>
          <text x="565" y="185" textAnchor="middle" className="pole-letter">
            {fieldPolarity === 1 ? 'S' : 'N'}
          </text>
        </>,
      )}
      {[115, 180, 245].map((yy) => (
        <g key={yy} className="field-line">
          <path d={`M245 ${yy}H515`} />
          <path
            d={
              fieldPolarity === 1
                ? `M505 ${yy - 5}L515 ${yy}L505 ${yy + 5}`
                : `M255 ${yy - 5}L245 ${yy}L255 ${yy + 5}`
            }
          />
        </g>
      ))}
      {part(
        'armature',
        <>
          <circle cx="380" cy="180" r="100" className="motor-armature" />
          <text x="380" y="290" textAnchor="middle">
            {quiz ? '3' : 'Rotor / Anker'}
          </text>
        </>,
      )}
      <path className="neutral-zone" d="M380 65V295" />
      <text x="391" y="80">
        Neutrale Lage
      </text>
      {part(
        'shaft',
        <>
          <path className="motor-shaft" d="M380 180V330" />
          <circle cx="380" cy="180" r="12" className="symbol-outline" />
          <text x="410" y="306">
            {quiz ? '5' : 'Welle'}
          </text>
        </>,
      )}
      {part(
        'winding',
        <>
          <path className="motor-loop" d={`M${x} ${y}L${x2} ${y2}`} />
          {[
            [x, y, state.currentDirection],
            [x2, y2, -state.currentDirection],
          ].map(([cx, cy, sign], i) => (
            <g key={i}>
              <circle cx={cx} cy={cy} r="15" className="motor-conductor" />
              {sign! > 0 ? (
                <circle cx={cx} cy={cy} r="4" className="conductor-dot" />
              ) : sign! < 0 ? (
                <path className="circuit-wire" d={`M${cx! - 7} ${cy! - 7}l14 14m-14 0l14 -14`} />
              ) : (
                <text x={cx} y={cy! + 5} textAnchor="middle">
                  0
                </text>
              )}
            </g>
          ))}
          <text x="70" y="340">
            {quiz ? '4' : 'Ankerwicklung: • heraus, × hinein'}
          </text>
        </>,
      )}
      {direction !== 0 &&
        [
          [x, y, direction],
          [x2, y2, -direction],
        ].map(([cx, cy, d], i) => (
          <g className="force-vector" key={i}>
            <path d={`M${cx} ${cy}v${-d! * 48}`} />
            <path
              d={`M${cx! - 7} ${cy! - d! * 38}L${cx} ${cy! - d! * 48}L${cx! + 7} ${cy! - d! * 38}`}
            />
            <text x={cx! + 15} y={cy! - d! * 40}>
              F
            </text>
          </g>
        ))}
      {part(
        'commutator',
        <>
          <g transform={`rotate(${-angle} 380 360)`}>
            <path className="commutator-a" d="M376 330a30 30 0 0 0 0 60" />
            <path className="commutator-b" d="M384 330a30 30 0 0 1 0 60" />
          </g>
          <text x="480" y="366">
            {quiz ? '6' : 'Stromwender'}
          </text>
        </>,
      )}
      {part(
        'brushes',
        <>
          <rect x="318" y="348" width="30" height="24" className="brush" />
          <rect x="412" y="348" width="30" height="24" className="brush" />
          <path className="circuit-wire" d="M318 360H295V405H365M395 405H465V360H442" />
          <circle cx="380" cy="405" r="15" className="symbol-outline" />
          <text x="380" y="410" textAnchor="middle">
            {supplyPolarity === 1 ? '+ −' : '− +'}
          </text>
          <text x="380" y="426" textAnchor="middle">
            {quiz ? '7' : 'Kohlebürsten · äußere Gleichstromquelle'}
          </text>
        </>,
      )}
      <text x="40" y="30">
        B: {fieldPolarity === 1 ? '→' : '←'} · α = {angle.toFixed(0)}° · Leiterwinkel zu B: 90°
      </text>
      <text x="525" y="35">
        Drehmoment:{' '}
        {Math.abs(state.torqueNm) < 1e-10 ? '0' : state.torqueNm > 0 ? '↺ positiv' : '↻ negativ'}
      </text>
    </LabCanvas>
  )
}
export function ExcitationDiagram({ type }: { type: Excitation }) {
  const nets = excitationNets(type)
  const separate = type === 'Fremderregung',
    series = type === 'Reihenschluss' || type === 'Doppelschluss',
    shunt = type === 'Nebenschluss' || type === 'Doppelschluss'
  return (
    <>
      <LabCanvas title={`Erregung: ${type}`} width={650} height={260}>
        <path className="circuit-wire" d="M70 65V25H380V70M380 130V225H70V125" />
        <circle cx="70" cy="95" r="30" className="symbol-outline" />
        <text x="70" y="102" textAnchor="middle">
          U ±
        </text>
        {series ? (
          <>
            <rect x="180" y="12" width="80" height="26" className="symbol-outline" />
            <text x="220" y="65" textAnchor="middle">
              D1—D2 · Reihe
            </text>
          </>
        ) : null}
        <circle cx="380" cy="100" r="30" className="symbol-outline" />
        <text x="380" y="108" textAnchor="middle">
          M
        </text>
        <text x="345" y="62">
          A1
        </text>
        <text x="345" y="155">
          A2
        </text>
        {shunt && (
          <>
            <path className="circuit-wire" d="M110 25H540V80M540 140V225H110" />
            <rect x="527" y="80" width="26" height="60" className="symbol-outline" />
            <circle cx="110" cy="25" r="4" />
            <circle cx="110" cy="225" r="4" />
            <text x="570" y="110">
              F1/F2
            </text>
          </>
        )}
        {separate && (
          <>
            <path className="circuit-wire" d="M480 80V25H590V80M590 140V225H480V140" />
            <circle cx="480" cy="110" r="30" className="symbol-outline" />
            <text x="480" y="115" textAnchor="middle">
              UF
            </text>
            <rect x="577" y="80" width="26" height="60" className="symbol-outline" />
            <text x="535" y="250">
              F1/F2 separat
            </text>
          </>
        )}
        {type === 'Permanentmagnet' && (
          <text x="430" y="110">
            N · S (Magnete)
          </text>
        )}
        <text x="150" y="250">
          Lehrtopologie · keine Anschlussanleitung
        </text>
      </LabCanvas>
      <p className="input-help">
        Explizite Netze: {nets.map((n) => n.join(' = ')).join(' · ')}.{' '}
        {type === 'Doppelschluss' &&
          'Der Wicklungssinn der beiden Felder wird hier nicht festgelegt.'}
      </p>
    </>
  )
}
