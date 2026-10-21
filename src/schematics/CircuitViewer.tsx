import { useId, useState } from 'react'
import { Maximize2, Minus, Plus } from 'lucide-react'
import { symbolRegistry } from './symbols'
import { terminalPoint, type CircuitDefinition } from './model'

interface Props {
  circuit: CircuitDefinition
  selected?: string
  onSelect?: (id: string) => void
  feedback?: 'correct' | 'incorrect'
  compact?: boolean
}
export function CircuitViewer({ circuit, selected, onSelect, feedback, compact = false }: Props) {
  const [zoom, setZoom] = useState(1)
  const prefix = useId().replace(/:/gu, '')
  const { width, height } = circuit.bounds
  const viewWidth = width / zoom,
    viewHeight = height / zoom
  return (
    <div className={`circuit-viewer ${compact ? 'compact' : ''}`}>
      <svg
        className="circuit-svg"
        viewBox={`${(width - viewWidth) / 2} ${(height - viewHeight) / 2} ${viewWidth} ${viewHeight}`}
        role="group"
        aria-label={`Stromlaufplan: ${circuit.description}`}
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
              className={selected === wire.netId ? 'wire-selected' : ''}
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
            className="circuit-junction"
          />
        ))}
        {circuit.components.map((component) => {
          const Symbol = symbolRegistry[component.kind]
          const isSelected = selected === component.id
          return (
            <g key={component.id}>
              <g
                transform={`translate(${component.position.join(' ')}) rotate(${component.rotation})`}
                role={onSelect ? 'button' : 'img'}
                tabIndex={onSelect ? 0 : undefined}
                aria-label={`${component.designator} · ${component.label}`}
                aria-pressed={onSelect ? isSelected : undefined}
                className={`circuit-component ${isSelected ? `selected ${feedback ?? ''}` : ''}`}
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
                  <Symbol />
                </g>
              </g>
              <text
                className="circuit-label"
                x={component.position[0] + 40}
                y={component.position[1] - 8}
              >
                {component.designator}
              </text>
              <text
                className="circuit-value"
                x={component.position[0] + 40}
                y={component.position[1] + 16}
              >
                {component.label}
              </text>
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
                      className={`circuit-terminal ${selected === terminal.id ? 'selected' : ''}`}
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
        <div className="circuit-toolbar">
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
            disabled={zoom >= 1.75}
            onClick={() => setZoom((z) => Math.min(1.75, z + 0.25))}
          >
            <Plus size={17} />
          </button>
          <button
            className="icon-button"
            aria-label="Schaltplan einpassen"
            onClick={() => setZoom(1)}
          >
            <Maximize2 size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
