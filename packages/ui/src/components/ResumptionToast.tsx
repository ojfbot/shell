export interface ResumptionToastProps {
  summary: string
  suggestions: string[]
  onSuggestionClick: (text: string) => void
  onDismiss: () => void
}

export function ResumptionToast({ summary, suggestions, onSuggestionClick, onDismiss }: ResumptionToastProps) {
  return (
    <div className="resumption-toast" role="status" aria-live="polite">
      <div className="resumption-toast__header">
        <span className="resumption-toast__label">Last session</span>
        <button
          className="resumption-toast__close"
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          x
        </button>
      </div>
      <p className="resumption-toast__summary">{summary}</p>
      {suggestions.length > 0 && (
        <div className="resumption-toast__suggestions">
          {suggestions.map((s, i) => (
            <button
              key={i}
              className="resumption-toast__badge"
              onClick={() => onSuggestionClick(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
