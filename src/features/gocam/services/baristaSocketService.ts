import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'

/**
 * Barista's socket.io (4.x) messaging, so an open model doesn't go stale
 * (geneontology/noctua#1077; VPE's `BaristaSocketService`).
 *
 * Barista emits `relay` to every client for each m3Batch with `intention=action`
 * — the writer included. SAE knows its own writes by the response's `packet-id`
 * ({@link baristaSocketService.recordOwnPacket}); a relay that arrives before that
 * response gets {@link OWN_PACKET_WAIT_MS} to be claimed before it counts as
 * someone else's change.
 */

const OWN_PACKET_WAIT_MS = 500

interface RelayEvent {
  class: 'merge' | 'rebuild' | string
  model_id: string
  packet_id?: string
  data?: unknown
}

export interface ModelWatchHandlers {
  onExternalChange: () => void
}

type Unsubscribe = () => void

let socket: Socket | null = null
let connectedUrl: string | null = null

const ownPacketIds = new Set<string>()
const watchers = new Map<string, Set<ModelWatchHandlers>>()
/** Models already told about a change; quiet until the refresh is acknowledged. */
const notifiedModels = new Set<string>()

const notifyExternalChange = (modelId: string) => {
  const handlers = watchers.get(modelId)
  if (!handlers || handlers.size === 0 || notifiedModels.has(modelId)) return
  notifiedModels.add(modelId)
  for (const handler of handlers) handler.onExternalChange()
}

/** Whether the packet is one of SAE's own writes (and forget it: each relays once). */
const claimOwnPacket = (packetId: string) => ownPacketIds.delete(packetId)

const handleRelay = (event: RelayEvent) => {
  if (!event || (event.class !== 'merge' && event.class !== 'rebuild')) return
  if (!event.model_id || !watchers.has(event.model_id)) return

  const packetId = event.packet_id
  if (!packetId || packetId === 'unknown') {
    notifyExternalChange(event.model_id)
    return
  }
  if (claimOwnPacket(packetId)) return

  setTimeout(() => {
    if (!claimOwnPacket(packetId)) notifyExternalChange(event.model_id)
  }, OWN_PACKET_WAIT_MS)
}

export const baristaSocketService = {
  /** Connect to Barista (once per location). */
  connect(baseUrl: string): void {
    if (socket && connectedUrl === baseUrl) return
    socket?.disconnect()

    connectedUrl = baseUrl
    socket = io(baseUrl)
    socket.on('relay', handleRelay)
  },

  disconnect(): void {
    socket?.disconnect()
    socket = null
    connectedUrl = null
    watchers.clear()
    notifiedModels.clear()
    ownPacketIds.clear()
  },

  /** Be told when someone else changes `modelId`. */
  watchModel(modelId: string, handlers: ModelWatchHandlers): Unsubscribe {
    if (!modelId) return () => {}
    let set = watchers.get(modelId)
    if (!set) {
      set = new Set()
      watchers.set(modelId, set)
    }
    set.add(handlers)

    return () => {
      const current = watchers.get(modelId)
      if (!current) return
      current.delete(handlers)
      if (current.size === 0) {
        watchers.delete(modelId)
        notifiedModels.delete(modelId)
      }
    }
  },

  /** The user refreshed: tell them about the next change again. */
  acknowledgeRefresh(modelId: string): void {
    notifiedModels.delete(modelId)
  },

  /** A write SAE just made, so its relay isn't taken for someone else's. */
  recordOwnPacket(packetId: string | undefined | null): void {
    if (!packetId || packetId === 'unknown') return
    ownPacketIds.add(packetId)
  },
}
