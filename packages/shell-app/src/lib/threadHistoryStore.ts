/**
 * threadHistoryStore — per-thread conversation history in localStorage.
 *
 * Key schema:
 *   localStorage:   ojfbot:thread:{instanceId}:{threadId}  → ChatMessage[]
 *   sessionStorage: ojfbot:resumed:{instanceId}:{threadId} → '1'
 *
 * History is best-effort — QuotaExceededError is silently ignored.
 * Session tracking uses sessionStorage so it clears on tab/browser close,
 * meaning resumption fires once per real session, not once ever.
 */

import type { ChatMessage } from '../store/slices/chatSlice.js'

function threadKey(instanceId: string, threadId: string): string {
  return `ojfbot:thread:${instanceId}:${threadId}`
}

function sessionKey(instanceId: string, threadId: string): string {
  return `ojfbot:resumed:${instanceId}:${threadId}`
}

export function saveThreadHistory(
  instanceId: string,
  threadId: string,
  messages: ChatMessage[],
): void {
  try {
    localStorage.setItem(threadKey(instanceId, threadId), JSON.stringify(messages))
  } catch {
    // QuotaExceededError or SecurityError — history is best-effort
  }
}

export function loadThreadHistory(
  instanceId: string,
  threadId: string,
): ChatMessage[] | null {
  try {
    const raw = localStorage.getItem(threadKey(instanceId, threadId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null
    return parsed as ChatMessage[]
  } catch {
    return null
  }
}

export function clearThreadHistory(instanceId: string, threadId: string): void {
  try {
    localStorage.removeItem(threadKey(instanceId, threadId))
  } catch {
    // ignore
  }
}

/**
 * Returns true if this thread has not been resumed yet in the current
 * browser session. Resumption should only fire once per session per thread.
 */
export function isFirstVisitThisSession(instanceId: string, threadId: string): boolean {
  try {
    return sessionStorage.getItem(sessionKey(instanceId, threadId)) === null
  } catch {
    return false
  }
}

/**
 * Mark this thread as visited this session so subsequent activations
 * in the same tab don't re-trigger the resumption synthesis.
 */
export function markResumedThisSession(instanceId: string, threadId: string): void {
  try {
    sessionStorage.setItem(sessionKey(instanceId, threadId), '1')
  } catch {
    // ignore
  }
}
