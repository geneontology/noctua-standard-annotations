import { useCallback, useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { removeBaristaTokenFromUrl } from '../authServices'
import { useGetUserInfoQuery } from '../slices/authApiSlice'
import {
  setBaristaToken,
  setUser,
  setUserCheckFailed,
  selectBaristaToken,
  selectAuthUser,
} from '../slices/authSlice'

export const useAuthSetup = () => {
  const dispatch = useAppDispatch()
  const baristaToken = useAppSelector(selectBaristaToken)
  const user = useAppSelector(selectAuthUser)
  const [isInitialized, setIsInitialized] = useState(false)

  // Parse query parameters - removed useLocation dependency
  useEffect(() => {
    try {
      const url = new URL(window.location.href)
      const tokenFromUrl = url.searchParams.get('barista_token')

      if (tokenFromUrl) {
        dispatch(setBaristaToken(tokenFromUrl))
        localStorage.setItem('barista_token', tokenFromUrl)
        removeBaristaTokenFromUrl()
      } else if (!baristaToken) {
        // Check localStorage if no token in URL
        const storedToken = localStorage.getItem('barista_token')
        if (storedToken) {
          dispatch(setBaristaToken(storedToken))
        }
      }

      setIsInitialized(true)
    } catch (error) {
      console.error('Error processing URL params:', error)
      setIsInitialized(true)
    }
  }, [dispatch, baristaToken])

  // Fetch user info when we have a token
  const {
    currentData: userInfo,
    isError,
    refetch,
  } = useGetUserInfoQuery(baristaToken || '', {
    skip: !baristaToken || !isInitialized,
  })

  useEffect(() => {
    if (userInfo && userInfo.token) {
      dispatch(setUser(userInfo))
    } else if (userInfo !== undefined) {
      // Barista answered without a token (`{}`): the token is no longer valid.
      dispatch(setUser(null))
      dispatch(setBaristaToken(null))
      localStorage.removeItem('barista_token')
    } else if (isError) {
      // Barista unreachable (e.g. the laptop just woke up): keep the login, as
      // Angular did, rather than logging out every Noctua tab.
      dispatch(setUserCheckFailed())
    }
  }, [userInfo, isError, dispatch])

  // Back on the tab: pick up a login or logout done in another Noctua tab (they
  // share the stored token), else re-check the current one.
  const handleFocus = useCallback(() => {
    if (!isInitialized) return
    const storedToken = localStorage.getItem('barista_token')
    if (storedToken && storedToken !== baristaToken) {
      dispatch(setBaristaToken(storedToken))
    } else if (baristaToken) {
      refetch()
    }
  }, [baristaToken, isInitialized, refetch, dispatch])

  useEffect(() => {
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [handleFocus])

  const isLoggedIn = !!baristaToken && !!user

  return {
    isLoggedIn,
    isInitialized,
  }
}
