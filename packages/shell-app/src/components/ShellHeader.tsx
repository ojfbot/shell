import React, { useState, useRef, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../store/hooks.js'
import { sendMessage, clearChat } from '../store/slices/chatSlice.js'

export function ShellHeader() {
  const dispatch = useAppDispatch()
  const { activeAppType } = useAppSelector(s => s.appRegistry)
  const { isStreaming, messages, error, lastDomain } = useAppSelector(s => s.chat)

  const [input, setInput] = useState('')
  const [showChat, setShowChat] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const frameAgentUrl = import.meta.env.VITE_FRAME_AGENT_URL ?? 'http://localhost:4001'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const msg = input.trim()
    if (!msg || isStreaming) return

    setShowChat(true)
    dispatch(sendMessage({
      message: msg,
      activeAppType,
      frameAgentUrl,
      conversationHistory: messages,
    }))
    setInput('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setShowChat(false)
      inputRef.current?.blur()
    }
  }

  // Focus input on Cmd+K
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

  const placeholder = activeAppType
    ? `Ask anything · ${activeAppType} (⌘K)`
    : 'Ask anything (⌘K)'

  return (
    <header className="shell-header">
      <div className="shell-header__logo">Frame</div>

      <form className="shell-header__input-form" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          className="shell-header__input"
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowChat(true)}
          placeholder={placeholder}
          disabled={isStreaming}
          aria-label="Frame OS command input"
        />
        <button
          type="submit"
          className="shell-header__submit"
          disabled={isStreaming || !input.trim()}
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
            <button onClick={() => { dispatch(clearChat()); setShowChat(false) }} className="shell-chat-clear">
              Clear
            </button>
            <button onClick={() => setShowChat(false)} className="shell-chat-close">
              Close esc
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
