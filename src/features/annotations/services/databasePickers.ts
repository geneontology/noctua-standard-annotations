import { DB_NONE, referenceAllowedDBs, withFromAllowedDBs } from '../data/allowedDatabases'

/** The reference picker's database and accession. */
export interface ReferenceParts {
  dbName: string
  accession: string
}

/**
 * Prefill the reference picker from the field. Only a DB the picker offers is
 * kept; anything else (e.g. `WB:WBPaper…`) opens blank on PMID, as the Angular
 * picker always opened, rather than turning into `PMID:WBPaper…`.
 */
export const parseReference = (value: string | undefined): ReferenceParts => {
  const blank = { dbName: referenceAllowedDBs[0], accession: '' }
  const trimmed = value?.trim()
  if (!trimmed) return blank
  const colon = trimmed.indexOf(':')
  if (colon === -1) return { ...blank, accession: trimmed }
  const dbName = referenceAllowedDBs.find(db => db === trimmed.slice(0, colon).trim())
  return dbName ? { dbName, accession: trimmed.slice(colon + 1).trim() } : blank
}

export interface WithEntity {
  db: string
  accession: string
}

export interface WithGroup {
  entities: WithEntity[]
}

const emptyGroup = (): WithGroup => ({ entities: [{ db: DB_NONE, accession: '' }] })

/** The allowed DB spelled as Noctua spells it (`uniprotkb` → `UniProtKB`), else as given. */
const allowedDb = (raw: string): string =>
  withFromAllowedDBs.find(db => db.toLowerCase() === raw.toLowerCase()) ?? raw

/**
 * Split a with/from value into the picker's groups (`,`) of entities (`|`), as
 * the Angular with dropdown did.
 */
export const parseWithGroups = (value: string | undefined): WithGroup[] => {
  if (!value?.trim()) return [emptyGroup()]

  const groups = value
    .split(',')
    .map(group =>
      group
        .split('|')
        .map(entity => entity.trim())
        .filter(Boolean)
        .map(entity => {
          const colon = entity.indexOf(':')
          if (colon === -1) return { db: DB_NONE, accession: entity }
          return {
            db: allowedDb(entity.slice(0, colon).trim()) || DB_NONE,
            accession: entity.slice(colon + 1).trim(),
          }
        })
    )
    .filter(entities => entities.length > 0)
    .map(entities => ({ entities }))

  return groups.length > 0 ? groups : [emptyGroup()]
}

/**
 * The with/from value for the picker's groups, or the reasons it can't be saved
 * (Angular `WithDropdownComponent.save`): an accession needs a database and a
 * database needs an accession. Fully empty rows are ignored.
 */
export const serializeWithGroups = (groups: WithGroup[]): { value: string; errors: string[] } => {
  const errors: string[] = []
  const value = groups
    .map(group =>
      group.entities
        .map(({ db, accession }) => {
          const acc = accession.trim()
          if (db === DB_NONE && !acc) return null
          if (db === DB_NONE) {
            errors.push(`Please select a database for the accession value "${acc}"`)
            return null
          }
          if (!acc) {
            errors.push(`Accession value is required for database "${db}"`)
            return null
          }
          return `${db}:${acc}`
        })
        .filter((entity): entity is string => entity !== null)
        .join('|')
    )
    .filter(Boolean)
    .join(',')
  return { value, errors }
}
