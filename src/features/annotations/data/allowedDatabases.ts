/** Placeholder DB prefix for "no database selected" */
export const DB_NONE = 'None'

/** Reference database prefixes offered by the reference picker. */
export const referenceAllowedDBs = ['PMID', 'DOI', 'GO_REF'] as const

/**
 * Allowed with/from database prefixes.
 * Source: geneontology/noctua metadata/with-from-allowed-namespaces.yaml
 */
export const withFromAllowedDBs = [
  'AGI_LocusCode',
  'dictyBase',
  'CGD',
  'EcoCyc',
  'Ensembl',
  'FB',
  'GO',
  'MGI',
  'PomBase',
  'PR',
  'RGD',
  'RNAcentral',
  'SGD',
  'TAIR',
  'UniProtKB',
  'WB',
  'Xenbase',
  'ZFIN',
  'CHEBI',
  'ComplexPortal',
  'EC',
  'InterPro',
  'PANTHER',
  'RHEA',
] as const
