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
import CamTitleForm from './features/gocam/components/CamTitleForm'
import CamStateForm from './features/gocam/components/CamStateForm'
import CamCommentsForm from './features/gocam/components/CamCommentsForm'

const DIALOG_COMPONENTS: Partial<Record<DialogComponent, React.ComponentType<any>>> = {
  [DialogComponent.CAM_DETAILS_FORM]: CamDetailsForm,
  [DialogComponent.CAM_TITLE_FORM]: CamTitleForm,
  [DialogComponent.CAM_STATE_FORM]: CamStateForm,
  [DialogComponent.CAM_COMMENTS_FORM]: CamCommentsForm,
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
