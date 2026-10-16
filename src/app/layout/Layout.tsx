import type React from 'react'
import { Outlet } from 'react-router-dom'
import { useMediaQuery } from '@mantine/hooks'
import Toolbar from './Toolbar'
import NotSavedBar from './NotSavedBar'
import { selectRightDrawerOpen } from '@/@noctua.core/components/drawer/drawerSlice'
import LoadingOverlay from '@/@noctua.core/components/loading-overlay/LoadingOverlay'
import { selectAuthUser } from '@/features/auth/slices/authSlice'
import CamToolbar from '@/features/gocam/components/CamToolbar'
import { useAppSelector } from '../hooks'

const RIGHT_DRAWER_WIDTH = 500

interface LayoutProps {
  rightDrawerContent?: React.ReactNode
}

/**
 * App frame: top toolbar, the not-logged-in notice, the model toolbar, then the
 * scrolling page with the right drawer (comments) sliding over it.
 */
const Layout: React.FC<LayoutProps> = ({ rightDrawerContent }) => {
  const isMobile = useMediaQuery('(max-width: 36em)')
  const rightDrawerOpen = useAppSelector(selectRightDrawerOpen)
  const isLoggedIn = !!useAppSelector(selectAuthUser)

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-gray-300">
      <LoadingOverlay />

      <div className="z-50 h-12 w-full shrink-0 border-b-2 border-b-primary-500">
        <Toolbar />
      </div>

      {!isLoggedIn && (
        <div className="flex h-8 w-full shrink-0 items-center justify-center bg-red-200 text-xs">
          Not Logged In: You can only view existing annotations
        </div>
      )}

      <NotSavedBar />

      <div className="z-40 w-full shrink-0">
        <CamToolbar />
      </div>

      <div className="relative flex min-h-0 w-full flex-1">
        <main className="min-w-0 flex-1 overflow-auto">
          <Outlet />
        </main>

        {rightDrawerContent && (
          <aside
            aria-hidden={!rightDrawerOpen}
            className={`absolute inset-y-0 right-0 overflow-hidden border-l border-gray-300 bg-white shadow-lg transition-transform duration-300 ease-out ${rightDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
            style={{ width: isMobile ? '100%' : RIGHT_DRAWER_WIDTH }}
          >
            {rightDrawerContent}
          </aside>
        )}
      </div>
    </div>
  )
}

export default Layout
