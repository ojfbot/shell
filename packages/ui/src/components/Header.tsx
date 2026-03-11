import React, { useState, useRef, useEffect } from 'react'
import { TextInput } from '@carbon/react'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface HeaderProps {
  /** Label for the active app — shown in placeholder text. Null when no app is active. */
  activeAppLabel: string | null
  /** Whether the frame-agent is available (controls disabled state and placeholder). */
  agentAvailable: boolean
  /** Whether a message is currently streaming. */
  isStreaming: boolean
  /** Current conversation history to render in the chat overlay. */
  messages: ChatMessage[]
  /** Non-null when the last response had an error. */
  error: string | null
  /** Domain badge label for the last routed domain. Null when no message has been sent. */
  lastDomainLabel: string | null
  /** Called when the user submits a message. Shell-app dispatches to Redux. */
  onSubmit: (message: string) => void
  /** Called when the user clicks "Clear" in the chat overlay. */
  onClearChat: () => void
}

/**
 * Command input bar for the Frame OS Shell header.
 * Renders a Carbon TextInput, submit button, domain badge, and chat overlay.
 *
 * Pure component — no Redux imports. Wire via a connected wrapper in shell-app.
 */
export function Header({
  activeAppLabel,
  agentAvailable,
  isStreaming,
  messages,
  error,
  lastDomainLabel,
  onSubmit,
  onClearChat,
}: HeaderProps) {
  const [input, setInput] = useState('')
  const [showChat, setShowChat] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const placeholder = !agentAvailable
    ? 'Agent offline — demo mode'
    : activeAppLabel
      ? `Ask anything · ${activeAppLabel} (⌘K)`
      : 'Ask anything (⌘K)'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const msg = input.trim()
    if (!msg || isStreaming || !agentAvailable) return

    setShowChat(true)
    onSubmit(msg)
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

      {lastDomainLabel && (
        <span className="shell-header__domain-badge" title={`Handled by ${lastDomainLabel}`}>
          {lastDomainLabel}
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
