import React, { Suspense } from 'react'
import { InlineLoading } from '@carbon/react'
import type { AppType } from '../../types.js'
import { SettingsErrorBoundary } from '../SettingsErrorBoundary.js'

export interface SettingsPanelProps {
  appType: AppType
  index: number
  activeTab: number
  resetKey: number
  appLabels: Record<string, string>
  settingsLoaders: Record<string, React.LazyExoticComponent<React.ComponentType<{ onClose?: () => void }>> | undefined>
  onClose: () => void
}

export function SettingsPanel({
  appType,
  index,
  activeTab,
  resetKey,
  appLabels,
  settingsLoaders,
  onClose,
}: SettingsPanelProps) {
  const PanelComponent = settingsLoaders[appType]

  return (
    <div
      key={appType}
      id={`settings-panel-${appType}`}
      role="tabpanel"
      aria-labelledby={`settings-tab-${appType}`}
      hidden={activeTab !== index}
      className="settings-panel-region"
    >
      {activeTab === index && (
        <SettingsErrorBoundary key={`${appType}-${resetKey}`}>
          <Suspense fallback={<InlineLoading description="Loading settings..." className="settings-loading-fallback" />}>
            {PanelComponent ? <PanelComponent onClose={onClose} /> : (
              <p className="settings-no-panel">No settings panel available for {appLabels[appType]}.</p>
            )}
          </Suspense>
        </SettingsErrorBoundary>
      )}
    </div>
  )
}
