import { describe, it, expect, vi, afterEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/test-utils'
import AnchoredPopover from '@/@noctua.core/components/popover/AnchoredPopover'

const anchor = () => {
  const el = document.createElement('button')
  el.getBoundingClientRect = () =>
    ({ x: 10, y: 10, top: 10, left: 10, right: 30, bottom: 30, width: 20, height: 20 }) as DOMRect
  return document.body.appendChild(el)
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('AnchoredPopover Escape', () => {
  it('closes only the innermost popover', () => {
    const outerClose = vi.fn()
    const innerClose = vi.fn()
    renderWithProviders(
      <AnchoredPopover open anchorEl={anchor()} onClose={outerClose}>
        <input aria-label="outer field" />
        <AnchoredPopover open anchorEl={anchor()} onClose={innerClose}>
          <input aria-label="inner field" />
        </AnchoredPopover>
      </AnchoredPopover>
    )
    fireEvent.keyDown(screen.getByLabelText('inner field'), { key: 'Escape' })
    expect(innerClose).toHaveBeenCalledTimes(1)
    expect(outerClose).not.toHaveBeenCalled()
  })

  it('lets an open suggestion list close first', () => {
    const onClose = vi.fn()
    renderWithProviders(
      <AnchoredPopover open anchorEl={anchor()} onClose={onClose}>
        <textarea aria-label="term" aria-expanded="true" />
      </AnchoredPopover>
    )
    fireEvent.keyDown(screen.getByLabelText('term'), { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('closes on Escape otherwise, and not at all when told not to', () => {
    const onClose = vi.fn()
    const { rerender } = renderWithProviders(
      <AnchoredPopover open anchorEl={anchor()} onClose={onClose}>
        <input aria-label="field" />
      </AnchoredPopover>
    )
    fireEvent.keyDown(screen.getByLabelText('field'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)

    rerender(
      <AnchoredPopover open anchorEl={anchor()} onClose={onClose} closeOnEscape={false}>
        <input aria-label="field" />
      </AnchoredPopover>
    )
    fireEvent.keyDown(screen.getByLabelText('field'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
