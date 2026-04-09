import type { ChatMessage } from './Header.js'

export interface ChatHistoryOverlayProps {
  messages: ChatMessage[]
  isStreaming: boolean
  error: string | null
  onClearChat: () => void
  onClose: () => void
}

export function ChatHistoryOverlay({
  messages,
  isStreaming,
  error,
  onClearChat,
  onClose,
}: ChatHistoryOverlayProps) {
  return (
    <div className="shell-chat-overlay">
      <ul className="shell-chat-overlay__messages" role="log" aria-label="Chat history">
        {messages.map((msg, i) => (
          <li key={i} className={`shell-chat-msg shell-chat-msg--${msg.role}`}>
            <span className="shell-chat-msg__role">{msg.role === 'user' ? 'You' : 'Frame'}</span>
            <span className="shell-chat-msg__content">{msg.content}</span>
          </li>
        ))}
        {isStreaming && (
          <li
            className="shell-chat-msg shell-chat-msg--assistant shell-chat-msg--streaming"
            role="status"
            aria-live="polite"
          >
            <span className="shell-chat-msg__role">Frame</span>
            <span className="shell-chat-msg__content">thinking…</span>
          </li>
        )}
        {error && (
          <li className="shell-chat-msg shell-chat-msg--error" role="alert">
            <span className="shell-chat-msg__content">Error: {error}</span>
          </li>
        )}
      </ul>
      <div className="shell-chat-overlay__actions">
        <button
          onClick={() => { onClearChat(); onClose() }}
          className="shell-chat-clear"
        >
          Clear
        </button>
        <button onClick={onClose} className="shell-chat-close">
          Close esc
        </button>
      </div>
    </div>
  )
}
