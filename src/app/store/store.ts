import type { Middleware } from '@reduxjs/toolkit'
import { combineSlices, configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import apiService from './apiService'
import { drawerSlice } from '@/@noctua.core/components/drawer/drawerSlice'
import { dialogSlice } from '@/@noctua.core/components/dialog/dialogSlice'
import { toastSlice } from '@/@noctua.core/components/toast/toastSlice'
import { loadingOverlaySlice } from '@/@noctua.core/components/loading-overlay/loadingOverlaySlice'
import { loadingOverlayMiddleware } from '@/@noctua.core/components/loading-overlay/loadingOverlayMiddleware'
import { authSlice } from '@/features/auth/slices/authSlice'
import { metadataSlice } from '@/features/users/slices/metadataSlice'
import { camSlice } from '@/features/gocam/slices/camSlice'
import { annotationsSlice } from '@/features/annotations/slices/annotationsSlice'

const rootReducer = combineSlices({
  auth: authSlice.reducer,
  metadata: metadataSlice.reducer,
  cam: camSlice.reducer,
  annotations: annotationsSlice.reducer,
  drawer: drawerSlice.reducer,
  dialog: dialogSlice.reducer,
  toast: toastSlice.reducer,
  loadingOverlay: loadingOverlaySlice.reducer,
  [apiService.reducerPath]: apiService.reducer,
})

const middlewares: Middleware[] = [apiService.middleware, loadingOverlayMiddleware]

export type RootState = ReturnType<typeof rootReducer>

export const makeStore = (preloadedState?: Partial<RootState>) => {
  const store = configureStore({
    reducer: rootReducer,
    middleware: getDefaultMiddleware => {
      return getDefaultMiddleware({
        // Dialog `customProps` is an opaque escape hatch — entry-point dialogs may
        // pass callbacks through it. Excluding it from the serializable-state check
        // keeps those callbacks out of module-level singletons.
        serializableCheck: {
          ignoredActions: ['dialog/openDialog'],
          ignoredPaths: ['dialog.customProps'],
        },
      }).concat(middlewares)
    },
    preloadedState,
  })
  setupListeners(store.dispatch)
  return store
}

export const store = makeStore()

export type AppStore = typeof store
export type AppDispatch = AppStore['dispatch']
