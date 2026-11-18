import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

/**
 * Shared RTK Query API. Endpoints pass absolute URLs (Barista, GOlr, PubMed), so
 * there is no base URL. JSON is the default content type; m3Batch writes set their
 * own form-urlencoded header, which is kept rather than overwritten.
 */
const baseQuery = fetchBaseQuery({
  prepareHeaders: headers => {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    return headers
  },
})

export const apiService = createApi({
  baseQuery,
  endpoints: () => ({}),
  reducerPath: 'apiService',
})

export default apiService
