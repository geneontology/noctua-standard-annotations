import type { RenderOptions } from '@testing-library/react'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PropsWithChildren, ReactElement } from 'react'
import { Provider } from 'react-redux'
import { MantineProvider } from '@mantine/core'
import type { AppStore, RootState } from '@/app/store/store'
import { makeStore } from '@/app/store/store'
import { mantineTheme } from '@/@noctua.core/theme/mantineTheme'
import GroupGuardProvider from '@/features/gocam/components/GroupGuardProvider'

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  preloadedState?: Partial<RootState>
  store?: AppStore
}

/** Render inside an isolated Redux store and the app's Mantine theme (test env). */
export const renderWithProviders = (
  ui: ReactElement,
  extendedRenderOptions: ExtendedRenderOptions = {}
) => {
  const {
    preloadedState = {},
    store = makeStore(preloadedState),
    ...renderOptions
  } = extendedRenderOptions

  const Wrapper = ({ children }: PropsWithChildren) => (
    <Provider store={store}>
      {/* env="test" turns off Mantine transitions and portals. */}
      <MantineProvider theme={mantineTheme} env="test">
        {/* As in Layout: edits may ask before touching another group's model. */}
        <GroupGuardProvider>{children}</GroupGuardProvider>
      </MantineProvider>
    </Provider>
  )

  return {
    store,
    // No delay between simulated keystrokes: typing into the big form stays fast.
    user: userEvent.setup({ delay: null }),
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  }
}
