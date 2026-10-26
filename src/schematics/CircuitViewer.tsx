import { useId, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Maximize2, Minus, Plus } from 'lucide-react'
import { symbolRegistry } from './symbols'
import { terminalPoint, type CircuitDefinition } from './model'
import { controlVisuals, initialControlState, type ControlVisualState } from '../domain/control'
import { initialReversingState, reversingVisuals } from '../domain/reversing'

interface Props {
  circuit: CircuitDefinition
  selected?: string
  onSelect?: (id: string) => void
  feedback?: 'correct' | 'incorrect'
  compact?: boolean
  correctSelection?: string
  states?: Record<string, ControlVisualState>
  overlay?: 'nets' | 'voltage'
  potentials?: Record<string, number | null>
  revealedFault?: string
}
export function CircuitViewer({
  circuit,
  selected,
  onSelect,
  feedback,
  compact = false,
  correctSelection,
  states,
  overlay,
  potentials,
  revealedFault,
}: Props) {
  const [zoom, setZoom] = useState(1)
  const dynamic = circuit.simulationMode !== 'verified-static'
  const maxZoom = dynamic ? 3 : 1.75
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const dragged = useRef(false)
  const visualStates =
    states ??
    (circuit.simulationMode === 'finite-state'
      ? controlVisuals(circuit.control, initialControlState())
      : circuit.simulationMode === 'reversing'
        ? reversingVisuals(initialReversingState())
        : undefined)
  const prefix = useId().replace(/:/gu, '')
  const { width, height } = circuit.bounds
  const viewWidth = width / zoom,
    viewHeight = height / zoom
  const limitX = (width - viewWidth) / 2,
    limitY = (height - viewHeight) / 2
  const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value))
  const move = (x: number, y: number) =>
    setPan((previous) => ({
      x: clamp(clamp(previous.x, limitX) + (x * viewWidth) / 5, limitX),
      y: clamp(clamp(previous.y, limitY) + (y * viewHeight) / 5, limitY),
    }))
  const selectedNet = circuit.nets.find(
    (net) => net.id === selected || net.terminals.includes(selected ?? ''),
  )?.id
  return (
    <div
      className={`circuit-viewer ${compact ? 'compact' : ''} ${dynamic ? 'control-circuit' : ''} ${overlay ? 'understand-circuit' : ''}`}
    >
      <svg
        className="circuit-svg"
        viewBox={`${limitX + clamp(pan.x, limitX)} ${limitY + clamp(pan.y, limitY)} ${viewWidth} ${viewHeight}`}
        role="group"
        aria-label={`Stromlaufplan: ${circuit.description}`}
        style={dynamic && !compact ? { touchAction: 'none' } : undefined}
        onPointerDown={(event) => {
          if (!dynamic || compact) return
          if (!pointers.current.size) dragged.current = false
          pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
        }}
        onPointerMove={(event) => {
          const previous = pointers.current.get(event.pointerId)
          if (!previous) return
          const others = [...pointers.current.entries()].filter(([id]) => id !== event.pointerId)
          const next = { x: event.clientX, y: event.clientY }
          if (Math.hypot(next.x - previous.x, next.y - previous.y) > 2) {
            dragged.current = true
            event.currentTarget.setPointerCapture?.(event.pointerId)
          }
          if (others.length) {
            const other = others[0]![1]
            const before = Math.hypot(previous.x - other.x, previous.y - other.y)
            const after = Math.hypot(next.x - other.x, next.y - other.y)
            if (before > 5) setZoom((z) => Math.max(1, Math.min(maxZoom, (z * after) / before)))
          } else if (zoom > 1) {
            const rect = event.currentTarget.getBoundingClientRect()
            const scale = Math.min(rect.width / viewWidth, rect.height / viewHeight)
            setPan((p) => ({
              x: clamp(p.x - (next.x - previous.x) / scale, limitX),
              y: clamp(p.y - (next.y - previous.y) / scale, limitY),
            }))
          }
          pointers.current.set(event.pointerId, next)
        }}
        onPointerUp={(event) => {
          pointers.current.delete(event.pointerId)
        }}
        onPointerCancel={(event) => {
          pointers.current.delete(event.pointerId)
        }}
        onClickCapture={(event) => {
          if (dragged.current) {
            event.stopPropagation()
            dragged.current = false
          }
        }}
      >
        <title>{circuit.title}</title>
        <defs>
          <pattern id={`${prefix}-grid`} width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.8" fill="currentColor" opacity="0.15" />
          </pattern>
        </defs>
        <rect width={width} height={height} fill={`url(#${prefix}-grid)`} />
        <g
          className="circuit-wires"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {circuit.wires.map((wire) => (
            <polyline
              key={wire.id}
              points={wire.points.map((p) => p.join(',')).join(' ')}
              className={`${selectedNet === wire.netId ? 'wire-selected' : ''} ${overlay === 'voltage' ? (potentials?.[wire.netId] === 24 ? 'wire-voltage' : potentials?.[wire.netId] === null ? 'wire-floating' : 'wire-zero') : ''}`}
              style={
                overlay === 'nets' && selectedNet !== wire.netId
                  ? {
                      stroke: ['#3978a8', '#a85d26', '#8a59b2', '#21806e', '#aa4567'][
                        circuit.nets.findIndex((n) => n.id === wire.netId) % 5
                      ],
                      strokeDasharray: `${8 + circuit.nets.findIndex((n) => n.id === wire.netId) * 2} 4`,
                    }
                  : undefined
              }
            />
          ))}
        </g>
        {circuit.junctions.map((j) => (
          <circle
            key={j.id}
            cx={j.point[0]}
            cy={j.point[1]}
            r="4.5"
            fill="currentColor"
            className={`circuit-junction ${selectedNet === j.netId ? 'net-selected' : ''}`}
          />
        ))}
        {circuit.components.map((component) => {
          const Symbol = symbolRegistry[component.kind]
          const isSelected = selected === component.id
          const labelOffset = component.labelOffset ?? [40, -8]
          const state = visualStates?.[component.id]
          const stateLabel =
            state === 'on'
              ? 'ein'
              : state === 'off'
                ? 'aus'
                : state === 'closed'
                  ? 'geschlossen'
                  : state === 'open'
                    ? 'offen'
                    : ''
          return (
            <g key={component.id}>
              <g
                transform={`translate(${component.position.join(' ')}) rotate(${component.rotation})`}
                role={onSelect ? 'button' : 'img'}
                tabIndex={onSelect ? 0 : undefined}
                aria-label={`${component.designator} · ${component.label}${stateLabel ? ` · ${stateLabel}` : ''}`}
                data-component-id={component.id}
                data-state={state}
                aria-pressed={onSelect ? isSelected : undefined}
                className={`circuit-component ${state === 'on' ? 'energized' : ''} ${revealedFault === component.id ? 'revealed-fault' : ''} ${isSelected ? `selected ${feedback ?? ''}` : correctSelection === component.id ? 'answer-target' : ''}`}
                onClick={() => onSelect?.(component.id)}
                onKeyDown={(event) => {
                  if (onSelect && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault()
                    onSelect(component.id)
                  }
                }}
              >
                <rect className="component-target" x="-32" y="-45" width="64" height="90" rx="12" />
                <g
                  stroke="currentColor"
                  fill="none"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <Symbol component={component} state={state} />
                </g>
              </g>
              <text
                className="circuit-label"
                x={component.position[0] + labelOffset[0]!}
                y={component.position[1] + labelOffset[1]!}
              >
                {component.designator}
              </text>
              <text
                className="circuit-value"
                x={component.position[0] + labelOffset[0]!}
                y={component.position[1] + labelOffset[1]! + 24}
              >
                {component.label}
              </text>
              {dynamic &&
                component.terminals.map((terminal) => {
                  const [x, y] = terminalPoint(component, terminal.offset)
                  return (
                    <text
                      key={`label-${terminal.id}`}
                      className="control-terminal-label"
                      x={x + 12}
                      y={y + 4}
                    >
                      {terminal.role === 'positive'
                        ? '+'
                        : terminal.role === 'negative'
                          ? '−'
                          : terminal.role}
                    </text>
                  )
                })}
              {!compact &&
                component.terminals.map((terminal) => {
                  const point = terminalPoint(component, terminal.offset)
                  return (
                    <g
                      key={terminal.id}
                      role={onSelect ? 'button' : 'img'}
                      tabIndex={onSelect ? 0 : undefined}
                      aria-label={`Anschluss ${terminal.id}`}
                      aria-pressed={onSelect ? selected === terminal.id : undefined}
                      className={`circuit-terminal ${overlay ? 'measurement-point' : ''} ${selected === terminal.id ? `selected ${feedback ?? ''}` : ''}`}
                      onClick={() => onSelect?.(terminal.id)}
                      onKeyDown={(event) => {
                        if (onSelect && ['Enter', ' '].includes(event.key)) {
                          event.preventDefault()
                          onSelect(terminal.id)
                        }
                      }}
                    >
                      <circle cx={point[0]} cy={point[1]} r="20" fill="transparent" />
                      <circle cx={point[0]} cy={point[1]} r="3" />
                    </g>
                  )
                })}
            </g>
          )
        })}
        {circuit.annotations.map((a) => (
          <text key={a.id} x={a.point[0]} y={a.point[1]} className={`circuit-annotation ${a.kind}`}>
            {a.text}
          </text>
        ))}
      </svg>
      {!compact && (
        <div className="circuit-toolbar" role="group" aria-label="Schaltplanansicht">
          <span>{Math.round(zoom * 100)} %</span>
          <button
            className="icon-button"
            aria-label="Verkleinern"
            disabled={zoom <= 1}
            onClick={() => setZoom((z) => Math.max(1, z - 0.25))}
          >
            <Minus size={17} />
          </button>
          <button
            className="icon-button"
            aria-label="Vergrößern"
            disabled={zoom >= maxZoom}
            onClick={() => setZoom((z) => Math.min(maxZoom, z + 0.25))}
          >
            <Plus size={17} />
          </button>
          <button
            className="icon-button"
            aria-label="Schaltplan einpassen"
            onClick={() => {
              setZoom(1)
              setPan({ x: 0, y: 0 })
            }}
          >
            <Maximize2 size={16} />
          </button>
          <div className="pan-controls">
            <button
              className="icon-button"
              aria-label="Ausschnitt nach links"
              disabled={zoom === 1}
              onClick={() => move(-1, 0)}
            >
              <ArrowLeft size={16} />
            </button>
            <button
              className="icon-button"
              aria-label="Ausschnitt nach rechts"
              disabled={zoom === 1}
              onClick={() => move(1, 0)}
            >
              <ArrowRight size={16} />
            </button>
            <button
              className="icon-button"
              aria-label="Ausschnitt nach oben"
              disabled={zoom === 1}
              onClick={() => move(0, -1)}
            >
              <ArrowUp size={16} />
            </button>
            <button
              className="icon-button"
              aria-label="Ausschnitt nach unten"
              disabled={zoom === 1}
              onClick={() => move(0, 1)}
            >
              <ArrowDown size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
