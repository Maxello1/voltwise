import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { CircuitViewer } from '../../src/schematics/CircuitViewer'
import { parallelDemo } from '../../src/content/circuit'
import { circuitById } from '../../src/content/circuit-library'

it('selects real circuit components by click and keyboard, and fits after zooming', () => {
  const onSelect = vi.fn()
  render(<CircuitViewer circuit={parallelDemo} onSelect={onSelect} />)
  const r2 = screen.getByRole('button', { name: 'R2 · 200 Ω' })
  fireEvent.click(r2)
  expect(onSelect).toHaveBeenLastCalledWith('r2')
  fireEvent.keyDown(r2, { key: 'Enter' })
  expect(onSelect).toHaveBeenLastCalledWith('r2')
  fireEvent.click(screen.getByRole('button', { name: 'Vergrößern' }))
  expect(screen.getByText('125 %')).toBeInTheDocument()
  const svg = screen.getByRole('group', { name: /Stromlaufplan:/ })
  const centered = svg.getAttribute('viewBox')
  fireEvent.click(screen.getByRole('button', { name: 'Ausschnitt nach rechts' }))
  expect(svg.getAttribute('viewBox')).not.toBe(centered)
  fireEvent.click(screen.getByRole('button', { name: 'Schaltplan einpassen' }))
  expect(screen.getByText('100 %')).toBeInTheDocument()
  expect(svg).toHaveAttribute('viewBox', '0 0 640 320')
})

it('highlights only the selected terminal net without changing topology', () => {
  const circuit = circuitById.get('meters-24v')!
  const original = JSON.stringify(circuit)
  const { container } = render(<CircuitViewer circuit={circuit} selected="vm1.a" />)
  expect(container.querySelectorAll('.wire-selected')).toHaveLength(3)
  expect(container.querySelectorAll('.net-selected')).toHaveLength(1)
  expect(JSON.stringify(circuit)).toBe(original)
})

it('keeps a wrong selection and the correct component visually distinct', () => {
  const { container } = render(
    <CircuitViewer
      circuit={circuitById.get('meters-24v')!}
      selected="r1"
      feedback="incorrect"
      correctSelection="a1"
      compact
    />,
  )
  expect(container.querySelector('.circuit-component.selected.incorrect')).toHaveAttribute(
    'aria-label',
    'R1 · 100 Ω',
  )
  expect(container.querySelector('.circuit-component.answer-target')).toHaveAttribute(
    'aria-label',
    'A1 · ideal',
  )
})
