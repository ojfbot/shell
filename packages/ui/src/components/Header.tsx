import React, { useState, useRef, useEffect } from 'react'
import { TextInput } from '@carbon/react'
import type { AppType } from '../types.js'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface HeaderProps {
  /** Currently active app type — used to contextualise the input placeholder. */
  activeAppType: AppType | null
  /** Currently active instance ID — included in sendMessage payload. */
  activeInstanceId: string | null
  /** Whether frame-agent is currently processing a request. */
  isStreaming: boolean
  /** Full conversation history from the chat slice. */
  messages: ChatMessage[]
  /** Last error string from chat slice, or null. */
  error: string | null
  /** Domain badge shown after a successful response. */
  lastDomain: string | null
  /** Base URL for the frame-agent API. */
  frameAgentUrl: string
  /**
   * Called when the user submits a message.
   * The host (shell-app) is responsible for dispatching sendMessage to the store.
   */
  onSendMessage: (payload: {
    message: string
    activeAppType: AppType | null
    activeInstanceId: string | null
    frameAgentUrl: string
    conversationHistory: ChatMessage[]
  }) => void
  /** Called when the user clicks the Clear button in the chat overlay. */
  onClearChat: () => void
}

/**
 * Command bar rendered inside the Carbon Header flex row.
 * Occupies remaining space between HeaderName and the right edge.
 *
 * Pure component — no Redux imports. Wire via HeaderConnected in shell-app.
 */
export function Header({
  activeAppType,
  activeInstanceId,
  isStreaming,
  messages,
  error,
  lastDomain,
  frameAgentUrl,
  onSendMessage,
  onClearChat,
}: HeaderProps) {
  const [input, setInput] = useState('')
  const [showChat, setShowChat] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const agentAvailable = frameAgentUrl !== ''

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const msg = input.trim()
    if (!msg || isStreaming || !agentAvailable) return

    setShowChat(true)
    onSendMessage({
      message: msg,
      activeAppType,
      activeInstanceId,
      frameAgentUrl,
      conversationHistory: messages,
    })
    setInput('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setShowChat(false)
      inputRef.current?.blur()
    }
  }

  useEffect(() => {
    function handleGlobalKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setShowChat(true)
      }
    }
    window.addEventListener('keydown', handleGlobalKey)
    return () => window.removeEventListener('keydown', handleGlobalKey)
  }, [])

  const placeholder = !agentAvailable
    ? 'Agent offline — demo mode'
    : activeAppType
      ? `Ask anything · ${activeAppType} (⌘K)`
      : 'Ask anything (⌘K)'

  return (
    <div className="shell-header__command-area">
      <form className="shell-header__input-form" onSubmit={handleSubmit}>
        <TextInput
          ref={inputRef}
          id="frame-command"
          labelText="Frame command"
          hideLabel
          size="sm"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowChat(true)}
          placeholder={placeholder}
          disabled={isStreaming || !agentAvailable}
        />
        <button
          type="submit"
          className="shell-header__submit"
          disabled={isStreaming || !input.trim() || !agentAvailable}
          aria-label="Send"
        >
          {isStreaming ? '…' : '↑'}
        </button>
      </form>

      {lastDomain && (
        <span className="shell-header__domain-badge" title={`Handled by ${lastDomain}`}>
          {lastDomain}
        </span>
      )}

      {showChat && messages.length > 0 && (
        <div className="shell-chat-overlay">
          <div className="shell-chat-overlay__messages">
            {messages.map((msg, i) => (
              <div key={i} className={`shell-chat-msg shell-chat-msg--${msg.role}`}>
                <span className="shell-chat-msg__role">{msg.role === 'user' ? 'You' : 'Frame'}</span>
                <span className="shell-chat-msg__content">{msg.content}</span>
              </div>
            ))}
            {isStreaming && (
              <div className="shell-chat-msg shell-chat-msg--assistant shell-chat-msg--streaming">
                <span className="shell-chat-msg__role">Frame</span>
                <span className="shell-chat-msg__content">thinking…</span>
              </div>
            )}
            {error && (
              <div className="shell-chat-msg shell-chat-msg--error">
                <span className="shell-chat-msg__content">Error: {error}</span>
              </div>
            )}
          </div>
          <div className="shell-chat-overlay__actions">
            <button
              onClick={() => { onClearChat(); setShowChat(false) }}
              className="shell-chat-clear"
            >
              Clear
            </button>
            <button onClick={() => setShowChat(false)} className="shell-chat-close">
              Close esc
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
