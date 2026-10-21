import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { CircuitViewer } from '../../src/schematics/CircuitViewer'
import { parallelDemo } from '../../src/content/circuit'

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
  fireEvent.click(screen.getByRole('button', { name: 'Schaltplan einpassen' }))
  expect(screen.getByText('100 %')).toBeInTheDocument()
})
