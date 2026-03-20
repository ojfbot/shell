/**
 * Connects the pure @ojfbot/shell ResumptionToast to the Redux store.
 * Handles dispatch + env var — the pure component is prop-only.
 */
import { ResumptionToast } from '@ojfbot/shell'
import { useAppDispatch, useAppSelector } from '../store/hooks.js'
import { sendMessage, clearResumptionSummary } from '../store/slices/chatSlice.js'

export function ResumptionToastConnected() {
  const dispatch = useAppDispatch()
  const { activeAppType, activeInstanceId, instances } = useAppSelector(s => s.appRegistry)
  const { resumptionSummary, resumptionSuggestions, messages } = useAppSelector(s => s.chat)

  const activeInstance = instances.find(i => i.id === activeInstanceId)
  const activeThreadId = activeInstance?.activeThreadId ?? null
  const frameAgentUrl = import.meta.env.VITE_FRAME_AGENT_URL ?? 'http://localhost:4001'

  if (!resumptionSummary) return null

  return (
    <ResumptionToast
      summary={resumptionSummary}
      suggestions={resumptionSuggestions}
      onSuggestionClick={(text) => {
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
      }}
      onDismiss={() => dispatch(clearResumptionSummary())}
    />
  )
}
