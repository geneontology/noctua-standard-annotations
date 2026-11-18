import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { baristaSocketService } from '@/features/gocam/services/baristaSocketService'
import { io, lastSocket } from '@tests/mocks/socketIoMock'

const BARISTA = 'http://localhost:3400'
const MODEL = 'gomodel:0000000000000001'

const relay = (event: Record<string, unknown>) => lastSocket().receive('relay', event)

const watch = (modelId = MODEL) => {
  const onExternalChange = vi.fn()
  const unsubscribe = baristaSocketService.watchModel(modelId, { onExternalChange })
  return { onExternalChange, unsubscribe }
}

beforeEach(() => {
  io.mockClear()
  baristaSocketService.connect(BARISTA)
})

afterEach(() => {
  baristaSocketService.disconnect()
  vi.useRealTimers()
})

describe('baristaSocketService', () => {
  it('connects once per Barista location', () => {
    baristaSocketService.connect(BARISTA)
    expect(io).toHaveBeenCalledTimes(1)
    expect(io).toHaveBeenCalledWith(BARISTA)

    const first = lastSocket()
    baristaSocketService.connect('http://barista.example.org')
    expect(first.connected).toBe(false)
    expect(lastSocket().url).toBe('http://barista.example.org')
  })

  it('reports a change to the watched model once, until the refresh is acknowledged', () => {
    const { onExternalChange } = watch()

    relay({ class: 'rebuild', model_id: MODEL })
    relay({ class: 'merge', model_id: MODEL })
    expect(onExternalChange).toHaveBeenCalledTimes(1)

    baristaSocketService.acknowledgeRefresh(MODEL)
    relay({ class: 'rebuild', model_id: MODEL, packet_id: 'unknown' })
    expect(onExternalChange).toHaveBeenCalledTimes(2)
  })

  it('ignores other models, other message classes, and unwatched models', () => {
    const { onExternalChange, unsubscribe } = watch()

    relay({ class: 'rebuild', model_id: 'gomodel:other' })
    relay({ class: 'telekinesis', model_id: MODEL })
    relay({ class: 'rebuild' })
    expect(onExternalChange).not.toHaveBeenCalled()

    unsubscribe()
    relay({ class: 'rebuild', model_id: MODEL })
    expect(onExternalChange).not.toHaveBeenCalled()
  })

  it("ignores the relay of SAE's own write, before or after its response", () => {
    vi.useFakeTimers()
    const { onExternalChange } = watch()

    baristaSocketService.recordOwnPacket('p-1')
    relay({ class: 'rebuild', model_id: MODEL, packet_id: 'p-1' })

    relay({ class: 'rebuild', model_id: MODEL, packet_id: 'p-2' })
    vi.advanceTimersByTime(200)
    baristaSocketService.recordOwnPacket('p-2')
    vi.advanceTimersByTime(500)

    expect(onExternalChange).not.toHaveBeenCalled()
  })

  it("reports a packet SAE didn't send once the wait for its response is over", () => {
    vi.useFakeTimers()
    const { onExternalChange } = watch()

    relay({ class: 'merge', model_id: MODEL, packet_id: 'p-3' })
    vi.advanceTimersByTime(499)
    expect(onExternalChange).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onExternalChange).toHaveBeenCalledTimes(1)
  })

  it('claims each own packet once', () => {
    vi.useFakeTimers()
    const { onExternalChange } = watch()

    baristaSocketService.recordOwnPacket('p-4')
    baristaSocketService.recordOwnPacket(undefined)
    baristaSocketService.recordOwnPacket('unknown')
    relay({ class: 'rebuild', model_id: MODEL, packet_id: 'p-4' })
    relay({ class: 'rebuild', model_id: MODEL, packet_id: 'p-4' })
    vi.advanceTimersByTime(500)

    expect(onExternalChange).toHaveBeenCalledTimes(1)
  })
})
