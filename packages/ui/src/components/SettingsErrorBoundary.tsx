import React from 'react'
import { InlineNotification } from '@carbon/react'

export class SettingsErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }
  static getDerivedStateFromError(error: Error): { error: Error } { return { error } }
  componentDidCatch(err: Error, info: React.ErrorInfo) {
    console.error('[SettingsErrorBoundary]', err, info.componentStack)
  }
  render() {
    if (this.state.error) {
      return (
        <InlineNotification
          kind="error"
          title="Could not load settings panel"
          subtitle={this.state.error.message}
          hideCloseButton
        />
      )
    }
    return this.props.children
  }
}
