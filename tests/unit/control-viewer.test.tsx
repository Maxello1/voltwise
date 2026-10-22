import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { CircuitViewer } from '../../src/schematics/CircuitViewer'
import { ControlPanel } from '../../src/features/circuit-lab/ControlPanel'
import { controlHold, controlLamp, controlOverload } from '../../src/content/circuits/control'
import { controlVisuals, initialControlState, transitionControl } from '../../src/domain/control'
import { ControlContact } from '../../src/schematics/ControlContact'

it('renders actual coil, linked NO, Stop NC and overload states independently of selection', () => {
  const initial = initialControlState()
  const { container, rerender } = render(<CircuitViewer circuit={controlOverload} />)
  const component = (id: string) => container.querySelector(`[data-component-id="${id}"]`)!
  expect(component('k1-coil')).toHaveAttribute('data-state', 'off')
  expect(component('k1-hold')).toHaveAttribute('data-state', 'open')
  expect(component('s0')).toHaveAttribute('data-state', 'closed')
  const running = transitionControl('overload', initial, { start: true })
  rerender(
    <CircuitViewer
      circuit={controlOverload}
      states={controlVisuals(controlOverload.control, running)}
      selected="k1-coil"
    />,
  )
  expect(component('k1-coil')).toHaveAttribute('data-state', 'on')
  expect(component('k1-coil')).toHaveClass('energized')
  expect(component('k1-hold')).toHaveAttribute('data-state', 'closed')
  const trip = transitionControl('overload', running, { fault: true })
  rerender(
    <CircuitViewer
      circuit={controlOverload}
      states={controlVisuals(controlOverload.control, trip)}
    />,
  )
  expect(component('k1-coil')).toHaveAttribute('data-state', 'off')
  expect(component('k1-hold')).toHaveAttribute('data-state', 'open')
  expect(component('f1-contact')).toHaveAttribute('data-state', 'open')
  expect(component('f1-contact')).toHaveAccessibleName(/offen/)
})
it('shows a lit lamp and supports keyboard component selection and 300% pan/fit', () => {
  const state = transitionControl('momentary-lamp', initialControlState(), { start: true })
  const selected = vi.fn()
  render(
    <CircuitViewer
      circuit={controlLamp}
      states={controlVisuals(controlLamp.control, state)}
      onSelect={selected}
    />,
  )
  const lamp = screen.getByRole('button', { name: 'H1 · Meldeleuchte · ein' })
  fireEvent.keyDown(lamp, { key: ' ' })
  expect(selected).toHaveBeenCalledWith('h1')
  for (let i = 0; i < 8; i++) fireEvent.click(screen.getByRole('button', { name: 'Vergrößern' }))
  expect(screen.getByText('300 %')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Vergrößern' })).toBeDisabled()
  const svg = screen.getByRole('group', { name: /Stromlaufplan/ })
  const before = svg.getAttribute('viewBox')
  fireEvent.click(screen.getByRole('button', { name: 'Ausschnitt nach unten' }))
  expect(svg.getAttribute('viewBox')).not.toBe(before)
  fireEvent.click(screen.getByRole('button', { name: 'Schaltplan einpassen' }))
  expect(svg).toHaveAttribute('viewBox', '0 0 660 420')
})
it('renders both generic NC and NO contact rest states with distinct live open/closed paths', () => {
  const nc = {
    ...controlHold.components.find((c) => c.id === 'k1-hold')!,
    kind: 'contact-nc' as const,
  }
  const { container, rerender } = render(
    <svg>
      <ControlContact component={nc} />
    </svg>,
  )
  expect(container.querySelector('path[d="M0 18V-18"]')).toBeTruthy()
  rerender(
    <svg>
      <ControlContact component={nc} state="open" />
    </svg>,
  )
  expect(container.querySelector('path[d="M0 18 22 -16"]')).toBeTruthy()
})
it('disables invalid manual Reset and emits deterministic button and scenario transitions', () => {
  const onChange = vi.fn()
  const state = transitionControl('overload', initialControlState(), { fault: true })
  const { rerender } = render(
    <ControlPanel circuit={controlOverload} state={state} onChange={onChange} />,
  )
  fireEvent.click(screen.getByText('Zustände & Fehlersuche'))
  expect(screen.getByRole('button', { name: 'F1 manuell zurücksetzen' })).toBeDisabled()
  const cleared = transitionControl('overload', state, { fault: false })
  rerender(<ControlPanel circuit={controlOverload} state={cleared} onChange={onChange} />)
  fireEvent.click(screen.getByRole('button', { name: 'F1 manuell zurücksetzen' }))
  expect(onChange).toHaveBeenLastCalledWith(
    expect.objectContaining({ tripped: false, coil: false }),
  )
  fireEvent.change(screen.getByLabelText('Fehlersuche'), { target: { value: 'restore' } })
  fireEvent.click(screen.getByRole('button', { name: 'Szenario laden' }))
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ ready: false, coil: false }))
})
