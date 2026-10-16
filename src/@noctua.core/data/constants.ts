declare global {
  interface Window {
    global_barista_location?: string
    global_minerva_definition_name?: string
    global_golr_neo_server?: string
    global_golr_server?: string
    global_noctua_url?: string
    global_workbench_url?: string
  }
}

// The Noctua workbench host injects these globals at runtime; the fallbacks are for
// local development against a local Barista.
const baristaLocation = window.global_barista_location ?? 'http://localhost:3400'
const minervaDefinitionName = window.global_minerva_definition_name ?? 'minerva_local'
const golrNeoServer = window.global_golr_neo_server ?? 'http://noctua-golr.berkeleybop.org/'
const golrServer = window.global_golr_server ?? 'https://golr-aux.geneontology.io/solr/'
const noctuaUrl = window.global_noctua_url ?? window.location.origin
const workbenchUrl = window.global_workbench_url ?? `${window.location.origin}/workbench/`

const appEnv: AppEnv = (import.meta.env.VITE_APP_ENV ?? 'dev') as AppEnv

export const ENVIRONMENT = {
  appEnv,
  isDev: appEnv === 'dev',
  isBeta: appEnv === 'beta',
  isProd: appEnv === 'prod',

  globalGolrNeoServer: golrNeoServer,
  globalGolrServer: golrServer,
  globalMinervaDefinitionName: minervaDefinitionName,
  globalBaristaLocation: baristaLocation,

  noctuaUrl,

  workbenchUrl,

  amigoTermUrl: 'http://amigo.geneontology.org/amigo/term/',
  pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/',
  pubmedApiUrl:
    'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=',
  evidenceOntologyUrl: 'http://www.evidenceontology.org/term/',
}

export const EXTERNAL_LINKS = {
  GO_HELP: 'http://help.geneontology.org',
  GO_ONTOLOGY_ISSUES: 'https://github.com/geneontology/go-ontology/issues',
  NOCTUA_USERS_GUIDE: 'https://docs.google.com/document/d/1a5YZBJrnJ9LKJxPVpXk62dJJGpHB2b9zH8-xr_Rm1Vs',
  GO_HOMEPAGE: 'http://geneontology.org/',
  ALLIANCE_GENOME: 'https://www.alliancegenome.org',
  NOCTUA_PRODUCTION: 'http://noctua.geneontology.org/',
}
