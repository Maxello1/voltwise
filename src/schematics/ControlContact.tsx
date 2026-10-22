import type { CircuitComponent } from './model'
import type { ControlVisualState } from '../domain/control'

export function ControlContact({
  component,
  state,
}: {
  component: CircuitComponent
  state?: ControlVisualState
}) {
  const nc = ['contact-nc', 'pushbutton-nc', 'overload-contact'].includes(component.kind)
  const closed = state ? state === 'closed' : nc || component.kind === 'restart-permit'
  const pushbutton = component.kind.startsWith('pushbutton')
  return (
    <>
      <path d="M0 -40V-20M0 20V40" />
      <circle cy="-20" r="2.5" />
      <circle cy="20" r="2.5" />
      <path d={closed ? 'M0 18V-18' : 'M0 18 22 -16'} />
      {nc && <path d="M-8 -6 8 6" />}
      {pushbutton && (
        <>
          <path d="M-24 -13V13M-24 0H-9" />
          <path d="M-9 0H0" strokeDasharray="3 4" />
        </>
      )}
      {component.kind === 'overload-contact' && (
        <path d="M-26 -12H-16V0H-8" strokeDasharray="3 3" />
      )}
      {component.kind === 'restart-permit' && (
        <rect x="-28" y="-29" width="56" height="58" rx="5" strokeDasharray="5 4" />
      )}
    </>
  )
}
