/**
 * SettingsModal — shell-owned modal chrome for sub-app settings panels.
 *
 * The shell owns: <Modal> wrapper, title, close mechanics, Suspense, error boundary.
 * Sub-apps own:   panel content (form fields / status cards), Save/Cancel logic.
 *
 * Each sub-app exposes a bare SettingsPanel component via MF './Settings' export.
 * SETTINGS_LOADERS provides the React.lazy() factory for each app type.
 *
 * z-index: overridden to 9500 via .shell-settings-modal in index.css
 * (above chat overlay at 9000 and sidebar overlay at 8999).
 */

import React, { Suspense } from 'react'
import { Modal, InlineLoading, InlineNotification } from '@carbon/react'
import { APP_LABELS } from '../store/slices/appRegistrySlice.js'
import type { AppType } from '../store/slices/appRegistrySlice.js'
import { SETTINGS_LOADERS } from '../remotes/settings-loaders.js'

interface SettingsModalProps {
  open: boolean
  appType: AppType
  onClose: () => void
}

class SettingsEB extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }
  static getDerivedStateFromError(error: Error): { error: Error } { return { error } }
  render() {
    if (this.state.error) {
      return (
        <InlineNotification
          kind="error"
          title="Could not load settings"
          subtitle={this.state.error.message}
          lowContrast
          hideCloseButton
        />
      )
    }
    return this.props.children
  }
}

export function SettingsModal({ open, appType, onClose }: SettingsModalProps) {
  const Panel = SETTINGS_LOADERS[appType]

  return (
    <Modal
      open={open}
      passiveModal
      modalHeading={`${APP_LABELS[appType]} Settings`}
      onRequestClose={onClose}
      size="sm"
      className="shell-settings-modal"
    >
      {/* key=appType resets the error boundary when the active app changes */}
      <SettingsEB key={appType}>
        <Suspense
          fallback={
            <InlineLoading
              description="Loading settings…"
              style={{ minHeight: '120px' }}
            />
          }
        >
          {open && Panel && <Panel onClose={onClose} />}
        </Suspense>
      </SettingsEB>
    </Modal>
  )
}
