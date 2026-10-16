import apiService from '@/app/store/apiService'
import { getBatchErrorMessage, transformGraphData } from '../services/graphServices'
import type { GraphMetadata } from '../services/graphServices'
import type { GraphModelApiResponse } from '../models/cam'
import type { RootState } from '@/app/store/store'
import { getBaristaApiUrl } from '@/@noctua.core/services/linksService'
import { OperationEntity, OperationType } from '../models/operations'
import type { Operation } from '../models/operations'

const addTagTypes = ['graph'] as const

interface GraphQueryArg {
  modelId: string
  baristaToken: string
}

const FORM_HEADERS = { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }

const metadataOf = (state: RootState): GraphMetadata => ({
  contributors: state.metadata.contributors,
  groups: state.metadata.groups,
})

/** The m3Batch POST body: token, the acting group, the intention, and the requests. */
const batchBody = (
  state: RootState,
  intention: 'action' | 'query',
  requests: Operation[],
  baristaToken = state.auth.baristaToken || ''
) => {
  const groupId = state.auth.user?.group?.id || ''

  const bodyParams = new URLSearchParams()
  bodyParams.append('token', baristaToken)
  if (groupId) bodyParams.append('provided-by', groupId)
  bodyParams.append('intention', intention)
  bodyParams.append('requests', JSON.stringify(requests))

  return { url: getBaristaApiUrl(baristaToken), body: bodyParams.toString() }
}

/**
 * Minerva (via Barista) m3Batch endpoints. Writes are a single batch of
 * {@link Operation}s that ends in a `store`, so every edit is saved as it is made,
 * the same as the Angular SAE did through bbop-manager-minerva.
 */
const graphApi = apiService.enhanceEndpoints({ addTagTypes }).injectEndpoints({
  endpoints: builder => ({
    getGraphModel: builder.query<GraphModelApiResponse | null, GraphQueryArg>({
      async queryFn({ modelId, baristaToken }, queryApi, _extraOptions, baseQuery) {
        const state = queryApi.getState() as RootState
        const get: Operation[] = [
          {
            entity: OperationEntity.MODEL,
            operation: OperationType.GET,
            arguments: { 'model-id': modelId },
          },
        ]

        // Logged in: a privileged POST, so the token stays out of the URL (and
        // server logs), as the Angular manager sent it. Otherwise a public GET.
        const result = baristaToken
          ? await baseQuery({
              ...batchBody(state, 'query', get, baristaToken),
              method: 'POST',
              headers: FORM_HEADERS,
            })
          : await baseQuery({
              url: `${getBaristaApiUrl('')}?intention=query&requests=${encodeURIComponent(JSON.stringify(get))}`,
            })

        if (result.error) return { error: result.error }

        const errorMessage = getBatchErrorMessage(result.data)
        if (errorMessage) return { error: { status: 'CUSTOM_ERROR', error: errorMessage } }

        const body = result.data as { data?: unknown } | undefined

        return {
          data: body?.data ? { data: transformGraphData(body.data, metadataOf(state)) } : null,
        }
      },
      providesTags: (_result, _error, { modelId }) => [{ type: 'graph', id: modelId }],
    }),

    updateGraphModel: builder.mutation<GraphModelApiResponse | null, Operation[]>({
      async queryFn(requests, queryApi, _extraOptions, baseQuery) {
        const state = queryApi.getState() as RootState
        // A save with no edits is a query, as the Angular `storeCam` sent it: other
        // editors on the model aren't told to rebuild for nothing.
        const storeOnly = requests.every(op => op.operation === OperationType.STORE)
        const { url, body } = batchBody(state, storeOnly ? 'query' : 'action', requests)

        const result = await baseQuery({ url, method: 'POST', headers: FORM_HEADERS, body })

        if (result.error) return { error: result.error }

        const errorMessage = getBatchErrorMessage(result.data)
        if (errorMessage) return { error: { status: 'CUSTOM_ERROR', error: errorMessage } }

        const responseBody = result.data as { data?: unknown } | undefined
        return {
          data: responseBody?.data
            ? { data: transformGraphData(responseBody.data, metadataOf(state)) }
            : null,
        }
      },
      invalidatesTags: ['graph'],
    }),

    /** Discard the unsaved changes of the active model (back to the last stored version). */
    resetGraphModel: builder.mutation<null, string>({
      async queryFn(modelId, queryApi, _extraOptions, baseQuery) {
        const state = queryApi.getState() as RootState
        const { url, body } = batchBody(state, 'query', [
          {
            entity: OperationEntity.MODEL,
            operation: OperationType.RESET,
            arguments: { 'model-id': modelId },
          },
        ])

        const result = await baseQuery({ url, method: 'POST', headers: FORM_HEADERS, body })

        if (result.error) return { error: result.error }

        const errorMessage = getBatchErrorMessage(result.data)
        if (errorMessage) return { error: { status: 'CUSTOM_ERROR', error: errorMessage } }

        return { data: null }
      },
      invalidatesTags: ['graph'],
    }),
  }),
})

export const { useGetGraphModelQuery, useUpdateGraphModelMutation, useResetGraphModelMutation } =
  graphApi

/** A readable message from an RTK Query error (Barista/Minerva or network). */
export const getMutationErrorMessage = (error: unknown): string => {
  if (!error || typeof error !== 'object') return 'Unknown error'
  const e = error as { error?: string; status?: unknown; data?: unknown; message?: string }
  if (typeof e.error === 'string') return e.error
  if (e.message) return e.message
  if (e.status !== undefined) return `Request failed (${String(e.status)})`
  return 'Unknown error'
}
