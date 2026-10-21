import type { CircuitComponent, SymbolKind } from './model'
import { MeterSymbol } from './MeterSymbol'

// Original vector geometry, not extracted from a commercial symbol database.
export const symbolRegistry: Record<
  SymbolKind,
  (props: { component: CircuitComponent }) => React.ReactNode
> = {
  source: () => (
    <>
      <path d="M0 -40V-27M0 27V40" />
      <circle r="27" />
      <path d="M-8 -10H8M0 -18V-2M-8 12H8" />
    </>
  ),
  resistor: () => (
    <>
      <path d="M0 -40V-24M0 24V40" />
      <rect x="-13" y="-24" width="26" height="48" rx="1" />
    </>
  ),
  switch: ({ component }) => (
    <>
      <path d="M0 -40V-20M0 20V40" />
      <path d={component.properties.state === 'closed' ? 'M0 18V-18' : 'M0 18 24 -17'} />
      <circle cy="-20" r="3" />
      <circle cy="20" r="3" />
    </>
  ),
  lamp: () => (
    <>
      <path d="M0 -40V-25M0 25V40" />
      <circle r="25" />
      <path d="M-17 -17 17 17M17 -17-17 17" />
    </>
  ),
  ground: () => (
    <>
      <path d="M0 -40V0M-22 0H22M-14 8H14M-6 16H6" />
    </>
  ),
  ammeter: ({ component }) => <MeterSymbol component={component} letter="A" />,
  voltmeter: ({ component }) => <MeterSymbol component={component} letter="V" />,
}
