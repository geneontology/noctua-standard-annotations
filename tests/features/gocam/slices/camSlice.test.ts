import { describe, it, expect } from 'vitest'
import { makeStore } from '@/app/store/store'
import {
  makeSelectModelTerms,
  selectModelEvidence,
  selectModelReferences,
  selectModelWiths,
  setModel,
} from '@/features/gocam/slices/camSlice'
import { loadModel, saeModelRaw } from '@tests/fixtures/models'

const storeWithModel = () => {
  const store = makeStore()
  store.dispatch(setModel(loadModel(saeModelRaw)))
  return store
}

describe('model prelookups', () => {
  it('offers model terms in a range, with their root types for the form rules', () => {
    const select = makeSelectModelTerms()
    const options = select(storeWithModel().getState(), ['GO:0008150'])
    const apoptotic = options.find(o => o.id === 'GO:0006915')!
    expect(apoptotic.label).toBe('apoptotic process')
    expect(apoptotic.rootTypes.map(r => r.id)).toEqual(['GO:0008150'])
    expect(options.every(o => o.rootTypes.some(r => r.id === 'GO:0008150'))).toBe(true)
  })

  it('leaves GO complex classes out of the gene product prelookup', () => {
    const select = makeSelectModelTerms()
    const ids = select(storeWithModel().getState(), ['CHEBI:33695', 'GO:0032991'], ['GO']).map(
      o => o.id
    )
    expect(ids).toContain('ComplexPortal:CPX-0001')
    expect(ids).toContain('UniProtKB:P00001')
    expect(ids).not.toContain('GO:0005667')
  })

  it('offers nothing for an empty range', () => {
    expect(makeSelectModelTerms()(storeWithModel().getState(), [])).toEqual([])
  })

  it('allows phase terms only where the range is a phase', () => {
    const select = makeSelectModelTerms()
    const phase = select(storeWithModel().getState(), ['GO:0044848']).find(o => o.id === 'GO:0000080')
    expect(phase?.notAnnotatable).toBe(true)
  })

  it('collects unique evidence codes, references and with/froms', () => {
    const state = storeWithModel().getState()
    expect(selectModelEvidence(state).map(e => e.id).sort()).toEqual(
      ['ECO:0000307', 'ECO:0000314', 'ECO:0000315'].sort()
    )
    expect(selectModelReferences(state)).toContain('PMID:555| PMID:444')
    expect(selectModelWiths(state).sort()).toEqual(
      ['UniProtKB:Q00001', 'ZFIN:ZDB-MRPHLNO-000001-1'].sort()
    )
  })
})
