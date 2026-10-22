import { vi } from 'vitest'

type Handler = (...args: unknown[]) => void

/**
 * Stand-in for a socket.io client socket (`tests/setup.ts` mocks `socket.io-client`
 * with this module, so no test opens a real connection to Barista).
 */
export class FakeSocket {
  connected = true
  private handlers = new Map<string, Handler[]>()

  constructor(readonly url: string) {}

  on(event: string, handler: Handler) {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler])
    return this
  }

  disconnect() {
    this.connected = false
    return this
  }

  /** Deliver a server event (e.g. Barista's `relay`) to the client's handlers. */
  receive(event: string, ...args: unknown[]) {
    for (const handler of this.handlers.get(event) ?? []) handler(...args)
  }
}

export const sockets: FakeSocket[] = []

export const io = vi.fn((url: string) => {
  const socket = new FakeSocket(url)
  sockets.push(socket)
  return socket
})

/** The socket the app opened most recently. */
export const lastSocket = (): FakeSocket => {
  const socket = sockets.at(-1)
  if (!socket) throw new Error('No socket was opened')
  return socket
}
