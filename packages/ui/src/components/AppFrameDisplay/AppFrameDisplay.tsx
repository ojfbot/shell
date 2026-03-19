interface AppFrameDisplayProps {
  state: 'loading' | 'error' | 'ready'
  appName: string
  errorMessage?: string
}

export function AppFrameDisplay({ state, appName, errorMessage }: AppFrameDisplayProps) {
  if (state === 'loading') {
    return <div className="frame-loading">Loading {appName}…</div>
  }
  if (state === 'error') {
    return (
      <div className="remote-error">
        <p>Could not load {appName}</p>
        {errorMessage && <p className="remote-error-detail">{errorMessage}</p>}
        <p className="remote-error-hint">Is the {appName} service running?</p>
      </div>
    )
  }
  return null
}
