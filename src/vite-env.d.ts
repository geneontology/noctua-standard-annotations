/// <reference types="vite/client" />

type AppEnv = 'dev' | 'beta' | 'prod'

interface ImportMetaEnv {
  readonly VITE_APP_ENV: AppEnv
  readonly VITE_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
