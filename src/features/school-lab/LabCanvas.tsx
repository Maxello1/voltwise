import { useState, type ReactNode, type PointerEvent } from 'react'

export function LabCanvas({
  title,
  width = 800,
  height = 300,
  children,
  onPoint,
}: {
  title: string
  width?: number
  height?: number
  children: ReactNode
  onPoint?: (x: number, y: number) => void
}) {
  const [zoom, setZoom] = useState(1),
    [pan, setPan] = useState({ x: 0, y: 0 })
  function point(event: PointerEvent<SVGSVGElement>) {
    const matrix = event.currentTarget.getScreenCTM()
    if (!matrix || !onPoint) return
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
    onPoint(p.x, p.y)
  }
  return (
    <div className="lab-canvas">
      <div className="canvas-tools" aria-label={`${title}: Ansicht`}>
        <button
          type="button"
          aria-label="Vergrößern"
          onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
        >
          +
        </button>
        <button
          type="button"
          aria-label="Verkleinern"
          onClick={() => setZoom((z) => Math.max(1, z - 0.25))}
        >
          −
        </button>
        {(['←', '→', '↑', '↓'] as const).map((label, i) => (
          <button
            type="button"
            key={label}
            aria-label={`Ansicht nach ${['links', 'rechts', 'oben', 'unten'][i]}`}
            onClick={() =>
              setPan((p) => ({
                x: p.x + (i === 0 ? -40 : i === 1 ? 40 : 0),
                y: p.y + (i === 2 ? -30 : i === 3 ? 30 : 0),
              }))
            }
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setZoom(1)
            setPan({ x: 0, y: 0 })
          }}
        >
          Einpassen
        </button>
      </div>
      <svg
        role="img"
        aria-label={title}
        viewBox={`${(width - width / zoom) / 2 + pan.x} ${(height - height / zoom) / 2 + pan.y} ${width / zoom} ${height / zoom}`}
        style={onPoint ? { touchAction: 'none' } : undefined}
        onPointerDown={
          onPoint
            ? (e) => {
                e.currentTarget.setPointerCapture(e.pointerId)
                point(e)
              }
            : undefined
        }
        onPointerMove={
          onPoint
            ? (e) => {
                if (e.buttons === 1) point(e)
              }
            : undefined
        }
      >
        <title>{title}</title>
        {children}
      </svg>
    </div>
  )
}
export function NumberControl({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  disabled = false,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  disabled?: boolean
}) {
  return (
    <label className="lab-control">
      <span>
        {label}
        <output>{value.toLocaleString('de')}</output>
      </span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}
