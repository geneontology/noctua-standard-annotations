import type React from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { mantineTheme } from './@noctua.core/theme/mantineTheme'
import Layout from './app/layout/Layout'
import RightDrawerContent from './app/layout/RightDrawer'
import StandardAnnotations from './app/StandardAnnotations'
import SplashScreen from './features/users/components/SplashScreen'
import { AuthProvider } from './features/auth/authProvider'
import GlobalDialog from './@noctua.core/components/dialog/GlobalDialog'
import { DialogComponent } from './@noctua.core/components/dialog/dialogSlice'
import GlobalToast from './@noctua.core/components/toast/GlobalToast'
import CamDetailsForm from './features/gocam/components/CamDetailsForm'

const DIALOG_COMPONENTS: Partial<Record<DialogComponent, React.ComponentType<any>>> = {
  [DialogComponent.CAM_DETAILS_FORM]: CamDetailsForm,
}

const routes = [
  {
    path: '/',
    element: <Layout rightDrawerContent={<RightDrawerContent />} />,
    children: [{ path: '', element: <StandardAnnotations /> }],
  },
]

const router = createBrowserRouter(routes, {
  basename: import.meta.env.VITE_BASE_URL,
})

const App: React.FC = () => {
  return (
    <MantineProvider theme={mantineTheme}>
      <Notifications position="top-center" />
      <AuthProvider>
        <SplashScreen>
          <RouterProvider router={router} />
          <GlobalDialog componentMap={DIALOG_COMPONENTS} />
          <GlobalToast />
        </SplashScreen>
      </AuthProvider>
    </MantineProvider>
  )
}

export default App
