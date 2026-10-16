import { describe, it, expect, afterEach, vi } from 'vitest'
import { makeStore } from '@/app/store/store'
import apiService from '@/app/store/apiService'
import '@/features/gocam/slices/camApiSlice'
import { OperationEntity, OperationType } from '@/features/gocam/models/operations'
import type { GraphModelApiResponse } from '@/features/gocam/models/cam'
import { batchSuccess, mockBarista } from '@tests/fixtures/barista'
import { saeModelRaw, SAE_MODEL_ID } from '@tests/fixtures/saeModel'

// The endpoints are injected into the shared API; reach them through it.
const endpoints = (apiService as unknown as { endpoints: Record<string, any> }).endpoints

const loggedIn = {
  auth: {
    baristaToken: 'tok-123',
    user: {
      uri: 'https://orcid.org/0000-0000-0000-0099',
      name: 'Test Curator',
      groups: [{ id: 'http://geneontology.org', label: 'GO Central' }],
      group: { id: 'http://geneontology.org', label: 'GO Central' },
    },
  },
}

afterEach(() => vi.unstubAllGlobals())

describe('getGraphModel', () => {
  it('reads the model with a query m3Batch, privileged when there is a token', async () => {
    const { requests } = mockBarista(() => batchSuccess(saeModelRaw))
    const store = makeStore()

    const result = await store.dispatch(
      endpoints.getGraphModel.initiate({ modelId: SAE_MODEL_ID, baristaToken: 'tok-123' })
    )

    const [request] = requests
    expect(request.url).toBe('http://localhost:3400/api/minerva_local/m3BatchPrivileged')
    expect(request.method).toBe('GET')
    expect(request.params.get('intention')).toBe('query')
    expect(request.params.get('token')).toBe('tok-123')
    expect(request.params.has('use-reasoner')).toBe(false)
    expect(request.operations).toEqual([
      { entity: 'model', operation: 'get', arguments: { 'model-id': SAE_MODEL_ID } },
    ])
    expect((result.data as GraphModelApiResponse).data.title).toBe('enabled by ALPHA1 Hsap')
  })

  it('uses the public endpoint without a token', async () => {
    const { requests } = mockBarista(() => batchSuccess(saeModelRaw))
    await makeStore().dispatch(
      endpoints.getGraphModel.initiate({ modelId: SAE_MODEL_ID, baristaToken: '' })
    )
    expect(requests[0].url).toBe('http://localhost:3400/api/minerva_local/m3Batch')
    expect(requests[0].params.has('token')).toBe(false)
  })

  it('surfaces a Minerva error body as an error', async () => {
    mockBarista(() => ({
      'message-type': 'error',
      message: 'MolecularModelManager$UnknownIdentifierException: Could not find a model',
    }))
    const result = await makeStore().dispatch(
      endpoints.getGraphModel.initiate({ modelId: 'gomodel:missing', baristaToken: '' })
    )
    expect(result.error).toEqual({ status: 'CUSTOM_ERROR', error: 'The model could not be found.' })
  })
})

describe('updateGraphModel', () => {
  const ops = [
    {
      entity: OperationEntity.MODEL,
      operation: OperationType.STORE,
      arguments: { 'model-id': SAE_MODEL_ID },
    },
  ]

  it('posts an action batch with the token and the acting group', async () => {
    const { requests } = mockBarista(() => batchSuccess(saeModelRaw))
    const store = makeStore(loggedIn)

    const result = await store.dispatch(endpoints.updateGraphModel.initiate(ops))

    const [request] = requests
    expect(request.url).toBe('http://localhost:3400/api/minerva_local/m3BatchPrivileged')
    expect(request.method).toBe('POST')
    expect(request.contentType).toMatch(/application\/x-www-form-urlencoded/)
    expect(request.params.get('token')).toBe('tok-123')
    expect(request.params.get('provided-by')).toBe('http://geneontology.org')
    expect(request.params.get('intention')).toBe('action')
    expect(request.operations).toEqual(ops)
    expect('data' in result && result.data).toBeTruthy()
  })

  it('surfaces a Barista bad-token error', async () => {
    mockBarista(() => ({ message_type: 'error', message: 'You are using a bad token; please remove it.' }))
    const result = await makeStore(loggedIn).dispatch(endpoints.updateGraphModel.initiate(ops))
    expect('error' in result && result.error).toEqual({
      status: 'CUSTOM_ERROR',
      error: 'It seems like you have a bad token. Please log in again.',
    })
  })
})

describe('resetGraphModel', () => {
  it('sends a model reset as a query batch', async () => {
    const { requests } = mockBarista()
    await makeStore(loggedIn).dispatch(endpoints.resetGraphModel.initiate(SAE_MODEL_ID))
    expect(requests[0].params.get('intention')).toBe('query')
    expect(requests[0].operations).toEqual([
      { entity: 'model', operation: 'reset', arguments: { 'model-id': SAE_MODEL_ID } },
    ])
  })
})
