import type { Contributor } from '../models/contributor'

/** A contributor's name from Barista, else their bare ORCID id (`0000-0002-…`). */
export const contributorName = (contributor: Contributor): string =>
  contributor.name || contributor.uri.replace(/^https?:\/\/orcid\.org\//, '')
