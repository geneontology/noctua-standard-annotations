import { describe, it, expect, afterEach, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '@tests/test-utils'
import { mockBarista, batchSuccess } from '@tests/fixtures/barista'
import { stateWith } from '@tests/fixtures/state'
import { saeModelRaw, saeUid } from '@tests/fixtures/saeModel'
import CommentsPanel from '@/features/annotations/components/CommentsPanel'
import { selectCommentAnnotation } from '@/features/annotations/slices/annotationsSlice'
import { makeStore } from '@/app/store/store'

const THETA9 = `${saeUid('mf9')}|RO:0002333|${saeUid('gp9')}`

afterEach(() => vi.unstubAllGlobals())

describe('CommentsPanel', () => {
  it('lists only annotations with comments, with what they annotate', () => {
    renderWithProviders(<CommentsPanel />, { preloadedState: stateWith() })
    const boxes = screen.getAllByTestId('comments-box')
    expect(boxes).toHaveLength(2)
    expect(boxes[0]).toHaveTextContent('ALPHA1 Hsap')
    expect(boxes[0]).toHaveTextContent('NOT enables')
    expect(boxes[1]).toHaveTextContent('first comment')
    expect(boxes[1]).toHaveTextContent('second comment')
  })

  it('highlights the annotation picked from the table, and picks on click', async () => {
    const store = makeStore(stateWith())
    store.dispatch(selectCommentAnnotation(THETA9))
    const { user } = renderWithProviders(<CommentsPanel />, { store })

    const [alpha, theta] = screen.getAllByTestId('comments-box')
    expect(theta).toHaveAttribute('data-selected', 'true')
    await user.click(within(alpha).getByText('checked'))
    expect(store.getState().annotations.selectedCommentAnnotationId).not.toBe(THETA9)
    expect(alpha).toHaveAttribute('data-selected', 'true')
  })

  it('replaces the comments from the dialog', async () => {
    const { requests } = mockBarista(() => batchSuccess(saeModelRaw))
    const { user } = renderWithProviders(<CommentsPanel />, { preloadedState: stateWith() })

    const theta = screen.getAllByTestId('comments-box')[1]
    await user.click(within(theta).getByRole('button', { name: 'Edit comments' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getAllByRole('button', { name: 'Delete comment' })[0])
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(requests).toHaveLength(1))
    const ops = requests[0].operations
    expect(ops[0]).toMatchObject({
      entity: 'edge',
      operation: 'remove-annotation',
      arguments: {
        values: [
          { key: 'comment', value: 'first comment' },
          { key: 'comment', value: 'second comment' },
        ],
      },
    })
    expect(ops[1].arguments.values).toEqual([{ key: 'comment', value: 'second comment' }])
  })

  it('has no edit buttons when logged out', () => {
    renderWithProviders(<CommentsPanel />, { preloadedState: stateWith({ loggedIn: false }) })
    expect(screen.queryByRole('button', { name: 'Edit comments' })).not.toBeInTheDocument()
  })
})
