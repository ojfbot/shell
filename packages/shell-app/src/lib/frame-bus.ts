/**
 * FrameBus — typed pub/sub message bus for cross-app coordination.
 *
 * Uses BroadcastChannel for same-origin cross-window communication,
 * with CustomEvent fallback for same-window (Module Federation) context.
 *
 * See: ADR-0034 (isolated Redux stores with FrameBus)
 *      ADR-0013 (cross-domain fanout protocol)
 */

// ---------------------------------------------------------------------------
// Event catalog — every cross-app message type is defined here.
// Adding a new message type requires updating this catalog.
// ---------------------------------------------------------------------------

export interface FrameBusEvents {
  'shell:theme-changed': { theme: string }
  'shell:instance-spawned': { appType: string; instanceId: string }
  'shell:active-app-changed': { appType: string }
  'remote:ready': { appType: string }
}

export type FrameBusEventType = keyof FrameBusEvents

export interface FrameBusMessage<T extends FrameBusEventType = FrameBusEventType> {
  type: T
  source: string
  payload: FrameBusEvents[T]
  timestamp: number
}

// ---------------------------------------------------------------------------
// Bus implementation
// ---------------------------------------------------------------------------

type Listener<T extends FrameBusEventType> = (msg: FrameBusMessage<T>) => void

const CHANNEL_NAME = 'frame-bus'

class FrameBusImpl {
  private channel: BroadcastChannel | null = null
  private listeners = new Map<string, Set<Listener<any>>>()

  constructor() {
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(CHANNEL_NAME)
      this.channel.onmessage = (ev: MessageEvent<FrameBusMessage>) => {
        this.dispatch(ev.data)
      }
    }
    // Same-window fallback: listen for CustomEvents
    if (typeof window !== 'undefined') {
      window.addEventListener('frame-bus', ((ev: CustomEvent<FrameBusMessage>) => {
        this.dispatch(ev.detail)
      }) as EventListener)
    }
  }

  publish<T extends FrameBusEventType>(
    type: T,
    source: string,
    payload: FrameBusEvents[T],
  ): void {
    const msg: FrameBusMessage<T> = {
      type,
      source,
      payload,
      timestamp: Date.now(),
    }

    // Broadcast to other windows/tabs
    this.channel?.postMessage(msg)

    // Dispatch locally via CustomEvent (same-window MF remotes)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('frame-bus', { detail: msg }))
    }
  }

  subscribe<T extends FrameBusEventType>(
    type: T,
    listener: Listener<T>,
  ): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    this.listeners.get(type)!.add(listener)

    return () => {
      this.listeners.get(type)?.delete(listener)
    }
  }

  private dispatch(msg: FrameBusMessage): void {
    const listeners = this.listeners.get(msg.type)
    if (listeners) {
      for (const fn of listeners) {
        try {
          fn(msg)
        } catch (err) {
          console.error(`[FrameBus] Error in listener for ${msg.type}:`, err)
        }
      }
    }
  }

  destroy(): void {
    this.channel?.close()
    this.listeners.clear()
  }
}

/** Singleton FrameBus instance. */
export const frameBus = new FrameBusImpl()
