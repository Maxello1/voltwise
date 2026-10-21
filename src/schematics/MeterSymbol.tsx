import type { CircuitComponent } from './model'

export function MeterSymbol({
  component,
  letter,
}: {
  component: CircuitComponent
  letter: 'A' | 'V'
}) {
  return (
    <>
      <path d="M0 -40V-25M0 25V40" />
      <circle r="25" />
      <text
        className="meter-letter"
        transform={`rotate(${-component.rotation})`}
        x="0"
        y="1"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="currentColor"
        stroke="none"
      >
        {letter}
      </text>
    </>
  )
}
