/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'
import tsChecker from 'vite-plugin-checker'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const outDir = env.VITE_OUTPUT_PATH || 'dist'

  // The Noctua workbench host inlines `inject.tmpl`, so the emitted index.html is
  // renamed after the bundle is written. A non-root base gets an explicit <base>.
  const workbenchInjectTmpl = {
    name: 'workbench-inject-tmpl',
    apply: 'build' as const,
    transformIndexHtml(html: string) {
      if (env.VITE_BASE_URL && env.VITE_BASE_URL !== '/') {
        return html.replace(/<head>/i, `<head>\n  <base href="${env.VITE_BASE_URL}">`)
      }
      return html
    },
    closeBundle() {
      const indexPath = path.resolve(outDir, 'index.html')
      const injectPath = path.resolve(outDir, 'inject.tmpl')
      if (fs.existsSync(indexPath)) {
        fs.renameSync(indexPath, injectPath)
      }
    },
  }

  return {
    base: env.VITE_BASE_URL,
    logLevel: 'info',
    plugins: [
      react(),
      tailwindcss(),
      // Type-check in dev and build; Vitest has its own run and doesn't need it.
      ...(mode === 'test' ? [] : [tsChecker({ typescript: { tsconfigPath: 'tsconfig.app.json' } })]),
      workbenchInjectTmpl,
      visualizer({
        filename: `${outDir}/stats-treemap.html`,
        template: 'treemap',
        gzipSize: true,
        brotliSize: true,
      }),
    ],
    build: {
      outDir,
      assetsDir: 'assets',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('@mantine')) return 'mantine'
            if (id.includes('@reduxjs') || id.includes('react-redux')) return 'redux'
            if (id.includes('react-router')) return 'react-router'
            if (id.includes('react-icons')) return 'react-icons'
          },
          assetFileNames: assetInfo => {
            let extType = assetInfo.names?.[0]?.split('.').at(1) ?? 'misc'
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
              extType = 'img'
            }
            return `assets/${extType}/[name]-[hash][extname]`
          },
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@tests': path.resolve(__dirname, './tests'),
      },
    },
    server: {
      port: 4203,
      // Playwright starts its own server (`--mode e2e`); don't open a browser tab for it.
      open: mode !== 'e2e',
    },
    preview: {
      port: 4203,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: 'tests/setup.ts',
      include: ['tests/**/*.test.{ts,tsx}'],
      mockReset: true,
      // Component tests drive Mantine forms through jsdom, which is slow on CI.
      testTimeout: 20000,
    },
  }
})
