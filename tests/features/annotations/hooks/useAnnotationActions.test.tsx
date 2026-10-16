import { describe, it, expect, afterEach, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import { makeStore } from '@/app/store/store'
import type { AppStore } from '@/app/store/store'
import { useAnnotationActions } from '@/features/annotations/hooks/useAnnotationActions'
import { selectAnnotations } from '@/features/annotations/slices/annotationsSlice'
import { useUserContext } from '@/app/hooks/useUserContext'
import { transformGraphData } from '@/features/gocam/services/graphServices'
import { mockBarista, batchSuccess } from '@tests/fixtures/barista'
import { CURATOR, stateWith } from '@tests/fixtures/state'
import { rawEvidence, rawFact, rawIndividual, saeModelRaw } from '@tests/fixtures/saeModel'

const wrapperFor =
  (store: AppStore) =>
  ({ children }: PropsWithChildren) => <Provider store={store}>{children}</Provider>

afterEach(() => vi.unstubAllGlobals())

describe('useAnnotationActions.copyToGenes', () => {
  it("warns instead of writing when the row's relation can't be written", async () => {
    // A root MF that `occurs in` a CC: readable, but no SAE relation stores it.
    const model = transformGraphData({
      'modified-p': false,
      id: 'gomodel:occurs',
      individuals: [
        rawIndividual('mf', 'GO:0003674', 'molecular_function', ['GO:0003674']),
        rawIndividual('gp', 'UniProtKB:P1', 'ONE Hsap', ['CHEBI:33695']),
        rawIndividual('cc', 'GO:0005634', 'nucleus', ['GO:0005575']),
        rawEvidence('e1', 'ECO:0000314', 'IDA', ['PMID:1']),
      ],
      facts: [
        rawFact('mf', 'RO:0002333', 'enabled by', 'gp', { evidence: ['e1'] }),
        rawFact('mf', 'BFO:0000066', 'occurs in', 'cc'),
      ],
      annotations: [],
    })
    const { requests } = mockBarista()
    const store = makeStore(stateWith({ model }))
    const [annotation] = selectAnnotations(store.getState())
    expect(annotation.relation.id).toBe('')

    const { result } = renderHook(() => useAnnotationActions(), { wrapper: wrapperFor(store) })
    let saved = true
    await act(async () => {
      saved = await result.current.copyToGenes(annotation, ['UniProtKB:P2'])
    })

    expect(saved).toBe(false)
    expect(requests).toHaveLength(0)
    expect(store.getState().toast).toMatchObject({
      severity: 'warning',
      message: '"occurs in" annotations can\'t be copied to other genes.',
    })
  })

  it('copies a writable annotation and reports how many were created', async () => {
    const { requests } = mockBarista(() => batchSuccess(saeModelRaw))
    const store = makeStore(stateWith())
    const annotation = selectAnnotations(store.getState()).find(a => a.gp.label === 'BETA2 Hsap')!

    const { result } = renderHook(() => useAnnotationActions(), { wrapper: wrapperFor(store) })
    await act(async () => {
      await result.current.copyToGenes(annotation, ['UniProtKB:A', 'UniProtKB:B'])
    })

    await waitFor(() => expect(requests).toHaveLength(1))
    expect(store.getState().toast.message).toBe('2 Annotation(s) successfully created.')
  })
})

describe('useUserContext', () => {
  it('credits a user without a group by ORCID alone', () => {
    const store = makeStore({
      auth: {
        user: { ...CURATOR, groups: [], group: undefined },
        baristaToken: 'tok',
        userChecked: true,
      },
    })
    const { result } = renderHook(() => useUserContext(), { wrapper: wrapperFor(store) })
    expect(result.current).toEqual({ orcid: CURATOR.uri, groupUrl: '' })
  })

  it('is undefined when logged out', () => {
    const store = makeStore()
    const { result } = renderHook(() => useUserContext(), { wrapper: wrapperFor(store) })
    expect(result.current).toBeUndefined()
  })
})
