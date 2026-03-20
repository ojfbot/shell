/**
 * Connects the pure @ojfbot/shell Header to the Redux store.
 * This is the only place in shell-app that knows about both the store shape
 * and the @ojfbot/shell Header props interface.
 *
 * Prop mapping:
 *   activeAppType → activeAppLabel via APP_CONFIG
 *   lastDomain    → lastDomainLabel via APP_CONFIG
 *   VITE_FRAME_AGENT_URL env → agentAvailable boolean
 *   chatSlice.{isStreaming, messages, error} → direct pass-through
 *   sendMessage thunk → onSubmit (wraps full payload construction)
 *   clearChat action → onClearChat
 */
import { Header } from '@ojfbot/shell'
import { useAppDispatch, useAppSelector } from '../store/hooks.js'
import { sendMessage, clearChat } from '../store/slices/chatSlice.js'
import { APP_CONFIG } from '../store/slices/appRegistrySlice.js'

export function HeaderConnected() {
  const dispatch = useAppDispatch()
  const { activeAppType, activeInstanceId, instances } = useAppSelector(s => s.appRegistry)
  const { isStreaming, messages, error, lastDomain, lastActionExecuted } = useAppSelector(s => s.chat)

  const activeInstance = instances.find(i => i.id === activeInstanceId)
  const activeThreadId = activeInstance?.activeThreadId ?? null

  const frameAgentUrl = import.meta.env.VITE_FRAME_AGENT_URL ?? 'http://localhost:4001'
  const agentAvailable = Boolean(frameAgentUrl)

  const activeAppLabel = activeAppType ? (APP_CONFIG[activeAppType]?.label ?? null) : null
  const lastDomainLabel = lastDomain ? (APP_CONFIG[lastDomain as keyof typeof APP_CONFIG]?.label ?? lastDomain) : null

  function handleSubmit(message: string) {
    dispatch(sendMessage({
      message,
      activeAppType,
      activeInstanceId,
      activeThreadId,
      frameAgentUrl,
      conversationHistory: messages,
      instances: instances.map(i => ({ id: i.id, appType: i.appType, name: i.name })),
    }))
  }

  return (
    <Header
      activeAppLabel={activeAppLabel}
      agentAvailable={agentAvailable}
      isStreaming={isStreaming}
      messages={messages}
      error={error}
      lastDomainLabel={lastDomainLabel}
      lastActionExecuted={lastActionExecuted}
      onSubmit={handleSubmit}
      onClearChat={() => dispatch(clearChat())}
    />
  )
}
