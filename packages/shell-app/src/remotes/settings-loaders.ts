/**
 * SETTINGS_LOADERS — module-level React.lazy() factories for sub-app SettingsPanel components.
 *
 * Pattern mirrors REMOTE_LOADERS in AppFrame.tsx:
 *   - `as string` bypasses TypeScript's module resolution for virtual MF modules
 *   - `as never`  suppresses the Promise<{ default: T }> mismatch at the React.lazy call site
 *   - Module-level lazy: cached after first fetch, one instance per app type
 *
 * 'purefoy' is intentionally omitted — no settings panel; the gear button is hidden
 * when purefoy is the active app (enforced in App.tsx).
 */

import React from 'react'
import type { AppType } from '../store/slices/appRegistrySlice.js'

export interface SettingsPanelProps {
  /** Called after a successful Save — signals shell to close the modal. */
  onClose?: () => void
}

type LazyPanel = React.LazyExoticComponent<React.ComponentType<SettingsPanelProps>>

export const SETTINGS_LOADERS: Partial<Record<AppType, LazyPanel>> = {
  'cv-builder':  React.lazy(() => import('cv_builder/Settings'  as string) as never) as unknown as LazyPanel,
  'blogengine':  React.lazy(() => import('blogengine/Settings'  as string) as never) as unknown as LazyPanel,
  'tripplanner': React.lazy(() => import('tripplanner/Settings' as string) as never) as unknown as LazyPanel,
}
