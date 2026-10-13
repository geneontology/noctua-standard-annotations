import type { RootState } from '@/app/store/store'
import type { GraphModel } from '@/features/gocam/models/cam'
import { loadModel, saeModelRaw } from './models'

export const CURATOR = {
  uri: 'https://orcid.org/0000-0000-0000-0099',
  name: 'Test Curator',
  groups: [
    { id: 'http://geneontology.org', label: 'GO Central' },
    { id: 'https://www.uniprot.org', label: 'UniProt' },
  ],
  group: { id: 'http://geneontology.org', label: 'GO Central' },
}

/** Preloaded store state: a model in the cam slice, logged in or not. */
export const stateWith = (
  options: { model?: GraphModel | null; loggedIn?: boolean } = {}
): Partial<RootState> => {
  const { model = loadModel(saeModelRaw), loggedIn = true } = options
  return {
    auth: {
      user: loggedIn ? CURATOR : null,
      baristaToken: loggedIn ? 'tok-123' : null,
    },
    cam: { model },
  }
}
