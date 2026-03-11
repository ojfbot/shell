/**
 * Core types for @ojfbot/shell UI components.
 *
 * These are the minimal types needed by shell UI components.
 * They intentionally do NOT import from shell-app's Redux slice —
 * the package is a pure UI layer; store wiring lives in shell-app.
 */

export type AppType =
  | 'resume-builder'
  | 'tripplanner'
  | 'blogengine'
  | 'purefoy'
  | 'core-reader'

export interface AppInstance {
  id: string
  appType: AppType
  name: string
  remoteUrl: string
  singleton?: boolean
}

/** Minimal static config each app type exposes to the UI layer. */
export interface AppDisplayConfig {
  label: string
  singleton?: boolean
}
