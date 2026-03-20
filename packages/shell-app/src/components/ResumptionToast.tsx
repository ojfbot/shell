/**
 * ResumptionToast — "last time you were…" thread resumption surface.
 *
 * Appears bottom-right when returning to a thread with history.
 * Persists until the user sends a message, clicks a suggestion, or dismisses.
 * Suggestion badges dispatch sendMessage directly — one tap continues the work.
 */
import { useAppDispatch, useAppSelector } from '../store/hooks.js'
import { sendMessage, clearResumptionSummary } from '../store/slices/chatSlice.js'

export function ResumptionToast() {
  const dispatch = useAppDispatch()
  const { activeAppType, activeInstanceId, instances } = useAppSelector(s => s.appRegistry)
  const { resumptionSummary, resumptionSuggestions, messages } = useAppSelector(s => s.chat)

  const activeInstance = instances.find(i => i.id === activeInstanceId)
  const activeThreadId = activeInstance?.activeThreadId ?? null
  const frameAgentUrl = import.meta.env.VITE_FRAME_AGENT_URL ?? 'http://localhost:4001'

  if (!resumptionSummary) return null

  function handleSuggestion(text: string) {
    dispatch(clearResumptionSummary())
    dispatch(sendMessage({
      message: text,
      activeAppType,
      activeInstanceId,
      activeThreadId,
      frameAgentUrl,
      conversationHistory: messages,
      instances: instances.map(i => ({ id: i.id, appType: i.appType, name: i.name })),
    }))
  }

  return (
    <div className="resumption-toast" role="status" aria-live="polite">
      <div className="resumption-toast__header">
        <span className="resumption-toast__label">Last session</span>
        <button
          className="resumption-toast__close"
          onClick={() => dispatch(clearResumptionSummary())}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
      <p className="resumption-toast__summary">{resumptionSummary}</p>
      {resumptionSuggestions.length > 0 && (
        <div className="resumption-toast__suggestions">
          {resumptionSuggestions.map((s, i) => (
            <button
              key={i}
              className="resumption-toast__badge"
              onClick={() => handleSuggestion(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
