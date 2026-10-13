import { ENVIRONMENT } from '@/@noctua.core/data/constants'
import type { GOlrResponse, TermSearchFilter } from '../models/search'
import apiService from '@/app/store/apiService'
import { buildCategoryFilter, formatSolrQueryString, mapGOlrResponse } from '../services/lookupServices'

let jsonpCounter = 0

// GOlr only speaks JSONP to the browser (no CORS), so lookups inject a <script>.
function createJsonpScript(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const callbackName = `jsonp_callback_${Date.now()}_${++jsonpCounter}`
    const jsonpUrl = `${url}${url.includes('?') ? '&' : '?'}json.wrf=${callbackName}`
    const script = document.createElement('script')
    let called = false

    const cleanup = () => {
      if (script.parentNode) script.parentNode.removeChild(script)
      delete (window as any)[callbackName]
    }

    ;(window as any)[callbackName] = (data: any) => {
      called = true
      cleanup()
      resolve(data)
    }

    script.onload = () => {
      setTimeout(() => {
        if (!called) {
          console.warn(`JSONP: script loaded but callback ${callbackName} never invoked`, jsonpUrl)
          cleanup()
          reject(new Error(`JSONP callback ${callbackName} was never invoked`))
        }
      }, 0)
    }

    script.onerror = () => {
      console.warn('JSONP: script load error', jsonpUrl)
      cleanup()
      reject(new Error('JSONP request failed'))
    }

    script.async = true
    script.src = jsonpUrl
    document.body.appendChild(script)
  })
}

const toSearchParams = (requestParams: Record<string, string | string[]>): string => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(requestParams)) {
    if (Array.isArray(value)) {
      value.forEach(v => params.append(key, v))
    } else {
      params.append(key, value)
    }
  }
  return params.toString()
}

const addTagTypes = ['search'] as const

const lookupApi = apiService
  .enhanceEndpoints({
    addTagTypes,
  })
  .injectEndpoints({
    endpoints: builder => ({
      searchTerms: builder.query<GOlrResponse[], { searchText: string } & TermSearchFilter>({
        queryFn: async ({ searchText, closureIds, excludeClosureIds, excludeIdspaces }) => {
          try {
            const categoryFilter = buildCategoryFilter({
              closureIds,
              excludeClosureIds,
              excludeIdspaces,
            })

            const requestParams = {
              q: formatSolrQueryString(searchText),
              defType: 'edismax',
              indent: 'on',
              qt: 'standard',
              wt: 'json',
              rows: '50',
              start: '0',
              packet: '1',
              callback_type: 'search',
              fq: ['document_category:"ontology_class"', ...(categoryFilter ? [categoryFilter] : [])],
              qf: [
                'annotation_class^3',
                'annotation_class_label_searchable^5.5',
                'description_searchable^1',
                'comment_searchable^0.5',
                'synonym_searchable^1',
                'alternate_id^1',
                'isa_closure^1',
                'isa_closure_label_searchable^1',
              ],
            }

            const url = `${ENVIRONMENT.globalGolrNeoServer}select?${toSearchParams(requestParams)}`
            const response = await createJsonpScript(url)

            return {
              data: mapGOlrResponse(response, closureIds),
            }
          } catch (error) {
            return {
              error: { status: 'CUSTOM_ERROR', error: (error as Error)?.message },
            }
          }
        },
      }),

      /**
       * Resolve gene product ids to their labels (Add More Gene(s)). Only exact id
       * matches come back; the caller sorts them into matched / unlabeled / not found.
       */
      getGenesDetails: builder.query<GOlrResponse[], string[]>({
        queryFn: async ids => {
          try {
            const requestParams = {
              q: ids.map(id => `annotation_class:"${id}"`).join(' OR '),
              defType: 'edismax',
              indent: 'on',
              qt: 'standard',
              wt: 'json',
              rows: String(ids.length),
              start: '0',
              fl: 'annotation_class,annotation_class_label,score',
              packet: '1',
              callback_type: 'search',
              fq: ['document_category:"ontology_class"'],
            }

            const url = `${ENVIRONMENT.globalGolrNeoServer}select?${toSearchParams(requestParams)}`
            const response = await createJsonpScript(url)
            const exactMatches = mapGOlrResponse(response).filter(result => ids.includes(result.id))

            return { data: exactMatches }
          } catch (error) {
            return {
              error: { status: 'CUSTOM_ERROR', error: (error as Error)?.message },
            }
          }
        },
      }),

      getPubmedInfo: builder.query<
        { title: string; authors: string; date: string } | null,
        string
      >({
        queryFn: async pmid => {
          try {
            const url = `${ENVIRONMENT.pubmedApiUrl}${encodeURIComponent(pmid)}`
            const res = await fetch(url)
            if (!res.ok) return { data: null }
            const data = await res.json()
            const entry = data?.result?.[pmid]
            if (!entry) return { data: null }
            const title = entry.title || ''
            const authors = Array.isArray(entry.authors)
              ? entry.authors
                  .map((a: { name?: string }) => a.name)
                  .filter(Boolean)
                  .join(', ')
              : ''
            const date = entry.pubdate || ''
            return { data: { title, authors, date } }
          } catch {
            return { data: null }
          }
        },
      }),
    }),
  })

export const { useSearchTermsQuery, useLazyGetGenesDetailsQuery, useLazyGetPubmedInfoQuery } =
  lookupApi
