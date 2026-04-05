/**
 * Redux middleware that publishes state changes to FrameBus.
 *
 * This is the shell-side publisher: when shell state changes in ways
 * that sub-apps need to know about, the middleware publishes typed
 * messages. Sub-apps subscribe in their own store setup.
 *
 * See: ADR-0034, ADR-0013
 */
import type { Middleware } from '@reduxjs/toolkit'
import { frameBus } from '../lib/frame-bus.js'

// Use structural type to avoid circular reference with RootState
interface ShellState {
  theme: { isDark: boolean }
  appRegistry: { activeAppType: string | null }
}

export const frameBusMiddleware: Middleware = (store) => (next) => (action) => {
  const prevState = store.getState() as ShellState
  const result = next(action)
  const nextState = store.getState() as ShellState

  // Publish theme changes
  if (prevState.theme.isDark !== nextState.theme.isDark) {
    frameBus.publish('shell:theme-changed', 'shell', {
      theme: nextState.theme.isDark ? 'g100' : 'white',
    })
  }

  // Publish active app changes
  if (prevState.appRegistry.activeAppType !== nextState.appRegistry.activeAppType) {
    const appType = nextState.appRegistry.activeAppType
    if (appType) {
      frameBus.publish('shell:active-app-changed', 'shell', { appType })
    }
  }

  return result
}
