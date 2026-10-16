import { useMemo } from 'react'
import { useAppSelector } from '@/app/hooks'
import { selectAuthUser } from '@/features/auth/slices/authSlice'
import type { UserContext } from '@/features/gocam/models/cam'

/**
 * Who edits are credited to. A user without a group is still credited by ORCID
 * (`groupUrl` is then empty and no `providedBy` is written).
 */
export function useUserContext(): UserContext | undefined {
  const authUser = useAppSelector(selectAuthUser)
  return useMemo(() => {
    if (!authUser?.uri) return undefined
    return { orcid: authUser.uri, groupUrl: authUser.group?.id ?? '' }
  }, [authUser])
}
