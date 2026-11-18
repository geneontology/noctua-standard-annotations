import type React from 'react'
import { useEffect, useState } from 'react'
import { useGetAllDataQuery } from '../slices/metadataApiSlice'
import { SPLASH_SCREEN_DELAY_MS } from '@/@noctua.core/data/uiConstants'

interface SplashScreenProps {
  children: React.ReactNode
}

const errorMessage = (error: unknown): string => {
  if (!error || typeof error !== 'object') return 'unknown error'
  const e = error as { message?: string; error?: string; status?: unknown }
  return e.message ?? e.error ?? String(e.status ?? 'unknown error')
}

const SplashScreen: React.FC<SplashScreenProps> = ({ children }) => {
  const { isLoading, isError, error } = useGetAllDataQuery()
  const [displaySplash, setDisplaySplash] = useState(true)

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        setDisplaySplash(false)
      }, SPLASH_SCREEN_DELAY_MS)

      return () => clearTimeout(timer)
    }
  }, [isLoading])

  if (displaySplash) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-white">
        <img src="assets/images/logos/go-logo.large.png" alt="App Logo" className="mb-6 h-32" />
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-700"></div>
        <p className="text-lg text-gray-600">
          {isError ? `Error loading data: ${errorMessage(error)}` : 'Loading application data...'}
        </p>
      </div>
    )
  }

  return children
}

export default SplashScreen
