import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice, createSelector } from '@reduxjs/toolkit'
import type { GraphModel } from '../models/cam'
import { PHASE_CATEGORIES } from '../models/cam'
import type { GOlrResponse } from '@/features/search/models/search'
import { getEntityUrl } from '@/@noctua.core/services/goLinker/goLinker'

interface CamState {
  model: GraphModel | null
}

const initialState: CamState = {
  model: null,
}

export const camSlice = createSlice({
  name: 'cam',
  initialState,
  reducers: {
    setModel: (state, action: PayloadAction<GraphModel | null>) => {
      state.model = action.payload
    },
  },
})

export const { setModel } = camSlice.actions

// ── Base selectors ─────────────────────────────────────────────────

export const selectCamModel = (state: { cam: CamState }) => state.cam.model

// ── Prelookup selectors (options offered before the user types) ─────

/**
 * A model term as an autocomplete option. It carries the individual's root types,
 * like the Angular `termPreLookup`: the form's relation and range rules read them.
 */
const toOption = (
  node: { id: string; label: string; rootTypes?: string[] },
  notAnnotatable = true
): GOlrResponse => ({
  id: node.id,
  label: node.label,
  link: getEntityUrl(node.id) ?? '',
  description: '',
  isObsolete: false,
  replacedBy: '',
  rootTypes: (node.rootTypes ?? []).map(id => ({ id, label: id })),
  xref: '',
  notAnnotatable,
  neighborhoodGraphJson: '',
})

/**
 * Terms already used in the model whose root types fall in `closureIds` — the
 * Angular `termPreLookup`. An empty range offers nothing. `excludeIdspaces`
 * mirrors the search filter (the gene product field leaves out GO classes).
 */
export const makeSelectModelTerms = () =>
  createSelector(
    [
      selectCamModel,
      (_state: { cam: CamState }, closureIds: string[]) => closureIds,
      (_state: { cam: CamState }, _closureIds: string[], excludeIdspaces?: string[]) =>
        excludeIdspaces,
    ],
    (model, closureIds, excludeIdspaces): GOlrResponse[] => {
      if (!model || closureIds.length === 0) return []
      // When the field's range is a phase/stage (e.g. `happens during`), allow
      // do-not-annotate terms; otherwise phase terms stay blocked outside their fields.
      const allowNotAnnotatable = closureIds.some(id => PHASE_CATEGORIES.has(id))
      const seen = new Set<string>()
      const results: GOlrResponse[] = []
      for (const node of model.nodes) {
        if (!node.id || seen.has(node.id)) continue
        if (!node.rootTypes.some(rt => closureIds.includes(rt))) continue
        if (excludeIdspaces?.some(idspace => node.id.startsWith(`${idspace}:`))) continue
        seen.add(node.id)
        const isPhase = node.rootTypes.some(rt => PHASE_CATEGORIES.has(rt))
        results.push(toOption(node, allowNotAnnotatable || !isPhase))
      }
      return results
    }
  )

/** Unique evidence codes used anywhere in the model. */
export const selectModelEvidence = createSelector([selectCamModel], (model): GOlrResponse[] => {
  if (!model) return []
  const seen = new Set<string>()
  const results: GOlrResponse[] = []
  for (const edge of model.edges) {
    for (const ev of edge.evidence) {
      if (!ev.evidenceCode?.id || seen.has(ev.evidenceCode.id)) continue
      seen.add(ev.evidenceCode.id)
      results.push(toOption(ev.evidenceCode))
    }
  }
  return results
})

/** Unique reference values (e.g. PMID:123) from all evidence in the model. */
export const selectModelReferences = createSelector([selectCamModel], (model): string[] => {
  if (!model) return []
  const seen = new Set<string>()
  for (const edge of model.edges) {
    for (const ev of edge.evidence) {
      if (ev.reference) seen.add(ev.reference)
    }
  }
  return Array.from(seen)
})

/** Unique with/from values from all evidence in the model. */
export const selectModelWiths = createSelector([selectCamModel], (model): string[] => {
  if (!model) return []
  const seen = new Set<string>()
  for (const edge of model.edges) {
    for (const ev of edge.evidence) {
      if (ev.with) seen.add(ev.with)
    }
  }
  return Array.from(seen)
})

export default camSlice.reducer
