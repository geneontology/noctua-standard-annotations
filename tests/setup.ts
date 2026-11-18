import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// The page connects to Barista's socket; tests get a fake one they can drive.
vi.mock('socket.io-client', () => import('./mocks/socketIoMock'))

// Node 22+ `Request` (undici 7) only takes Node's own AbortSignal, but under jsdom
// RTK Query passes jsdom's. No test aborts a request, so the signal is left out.
const NodeRequest = globalThis.Request
globalThis.Request = class extends NodeRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    super(input, init && { ...init, signal: null })
  }
} as typeof Request

// jsdom lacks window.matchMedia; Mantine's MantineProvider color-scheme logic
// calls it on mount. Provide a stub so component tests can render Mantine
// components (Modal, etc.) without crashing.
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

// jsdom lacks ResizeObserver; Mantine's Textarea autosize uses it.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}

// jsdom lacks Element.prototype.scrollIntoView; the Comments panel calls it to
// bring the selected activity section into view when the selection changes.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

// jsdom lacks document.fonts; Mantine's Textarea autosize listens to it.
if (typeof document !== 'undefined' && !document.fonts) {
  Object.defineProperty(document, 'fonts', {
    writable: true,
    value: {
      addEventListener: () => {},
      removeEventListener: () => {},
      ready: Promise.resolve(),
    },
  })
}
