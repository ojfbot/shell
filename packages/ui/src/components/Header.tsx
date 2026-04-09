import { useState, useRef, useEffect } from 'react'
import { HeaderInput } from './HeaderInput.js'
import { ChatHistoryOverlay } from './ChatHistoryOverlay.js'
import { DomainBadge } from './DomainBadge.js'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface HeaderProps {
  activeAppLabel: string | null
  agentAvailable: boolean
  isStreaming: boolean
  messages: ChatMessage[]
  error: string | null
  lastDomainLabel: string | null
  lastActionExecuted: boolean
  onSubmit: (message: string) => void
  onClearChat: () => void
}

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

  function handleSubmit() {
    const msg = input.trim()
    if (!msg || isStreaming || !agentAvailable) return
    setShowChat(true)
    onSubmit(msg)
    setInput('')
    if (inputRef.current) inputRef.current.style.height = ''
  }

  // Auto-close overlay briefly after an action executes so the user sees the app switch
  useEffect(() => {
    if (lastActionExecuted && showChat) {
      const timer = setTimeout(() => setShowChat(false), 1200)
      return () => clearTimeout(timer)
    }
  }, [lastActionExecuted, showChat])

  // Global Cmd+K shortcut
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
      <HeaderInput
        ref={inputRef}
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        onEscape={() => { setShowChat(false) }}
        onFocus={() => { setIsFocused(true); setShowChat(true) }}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        disabled={isStreaming || !agentAvailable}
        isStreaming={isStreaming}
      />

      <DomainBadge label={lastDomainLabel} />

      {showChat && messages.length > 0 && (
        <ChatHistoryOverlay
          messages={messages}
          isStreaming={isStreaming}
          error={error}
          onClearChat={onClearChat}
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  )
}
