import React, { useState, useRef, useEffect, useCallback } from 'react'
import { TextArea } from '@carbon/react'

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
  /** When true, the last response included an instance action (spawn or focus). */
  lastActionExecuted: boolean
  /** Called when the user submits a message. Shell-app dispatches to Redux. */
  onSubmit: (message: string) => void
  /** Called when the user clicks "Clear" in the chat overlay. */
  onClearChat: () => void
}

/**
 * Command input bar for the Frame OS Shell header.
 * Renders an expanding Carbon TextArea, submit button, domain badge, and chat overlay.
 *
 * Expanding behavior:
 * - Default: compact single-line (32px height, collapsed width)
 * - On focus: expands to full width (480px)
 * - On multi-line content: grows vertically up to 3 lines (96px)
 * - On blur when empty: collapses back
 * - Enter submits, Shift+Enter adds newline
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
  lastActionExecuted,
  onSubmit,
  onClearChat,
}: HeaderProps) {
  const [input, setInput] = useState('')
  const [showChat, setShowChat] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const placeholder = !agentAvailable
    ? 'Agent offline — demo mode'
    : activeAppLabel
      ? `Ask anything · ${activeAppLabel} (⌘K)`
      : 'Ask anything (⌘K)'

  const isExpanded = isFocused || input.length > 0

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    const msg = input.trim()
    if (!msg || isStreaming || !agentAvailable) return

    setShowChat(true)
    onSubmit(msg)
    setInput('')
    // Reset textarea height after submit
    if (inputRef.current) {
      inputRef.current.style.height = ''
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setShowChat(false)
      inputRef.current?.blur()
    }
    // Enter submits, Shift+Enter adds newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Auto-resize textarea height based on content (up to 3 lines / 96px)
  const autoResize = useCallback(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = '32px'
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    autoResize()
  }

  function handleFocus() {
    setIsFocused(true)
    setShowChat(true)
  }

  function handleBlur() {
    setIsFocused(false)
  }

  // Auto-close overlay briefly after an action executes so the user sees the app switch
  useEffect(() => {
    if (lastActionExecuted && showChat) {
      const timer = setTimeout(() => setShowChat(false), 1200)
      return () => clearTimeout(timer)
    }
  }, [lastActionExecuted, showChat])

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
    <div className={`shell-header__command-area${isExpanded ? ' shell-header__command-area--expanded' : ''}`}>
      <form className="shell-header__input-form" onSubmit={handleSubmit}>
        <TextArea
          ref={inputRef}
          id="frame-command"
          labelText="Frame command"
          hideLabel
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={isStreaming || !agentAvailable}
          rows={1}
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
