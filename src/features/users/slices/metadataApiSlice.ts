import apiService from '@/app/store/apiService'
import { setUsers, setGroups } from './metadataSlice'
import { ENVIRONMENT } from '@/@noctua.core/data/constants'
import type { Contributor, Group } from '../models/contributor'

const addTagTypes = ['metadata'] as const

export const noctuaDataApi = apiService
  .enhanceEndpoints({
    addTagTypes,
  })
  .injectEndpoints({
    endpoints: builder => ({
      getAllData: builder.query<
        {
          users: Contributor[]
          groups: Group[]
        },
        void
      >({
        async queryFn(_arg, _queryApi, _extraOptions, fetchWithBQ) {
          try {
            // Fetch all data in parallel
            const [usersResponse, groupsResponse] = await Promise.all([
              fetchWithBQ(`${ENVIRONMENT.globalBaristaLocation}/users`),
              fetchWithBQ(`${ENVIRONMENT.globalBaristaLocation}/groups`),
            ])

            if (usersResponse.error) return { error: usersResponse.error }
            if (groupsResponse.error) return { error: groupsResponse.error }

            const users: Contributor[] = (usersResponse.data as any[]).map((item: any) => ({
              name: item.nickname,
              uri: item.uri,
              group: item.group,
              initials: getInitials(item.nickname ?? ''),
              color: item.color,
            }))

            const groups: Group[] = (groupsResponse.data as any[]).map((item: any) => ({
              id: item.id,
              label: item.label,
              shorthand: item.shorthand,
            }))

            return {
              data: {
                users,
                groups,
              },
            }
          } catch (error) {
            return { error: { status: 'CUSTOM_ERROR', error: (error as Error)?.message } }
          }
        },
        async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
          try {
            const { data } = await queryFulfilled
            dispatch(setUsers(data.users))
            dispatch(setGroups(data.groups))
          } catch {
            // The splash screen surfaces the error.
          }
        },
      }),
    }),
    overrideExisting: false,
  })

// Helper functions
function getInitials(name: string): string {
  const names = name.split(' ').filter(Boolean)
  if (names.length === 0) return ''
  let initials = names[0].substring(0, 1).toUpperCase()
  if (names.length > 1) {
    initials += names[names.length - 1].substring(0, 1).toUpperCase()
  }
  return initials
}

export const { useGetAllDataQuery } = noctuaDataApi
