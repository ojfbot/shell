import React, { Suspense, useState, useMemo, useEffect } from 'react'
import {
  ComposedModal,
  ModalHeader,
  ModalBody,
  InlineLoading,
  Search,
} from '@carbon/react'
import type { AppType } from '../types.js'
import { SettingsErrorBoundary } from './SettingsErrorBoundary.js'
import { SettingsTabBar } from './SettingsTabBar.js'

export interface SettingsFieldMeta {
  label: string
  keywords: string[]
}

export interface SettingsModalProps {
  open: boolean
  onClose: () => void
  contextAppType: AppType | null
  appTypes: AppType[]
  appLabels: Record<string, string>
  settingsMeta: Record<string, SettingsFieldMeta[]>
  settingsLoaders: Record<string, React.LazyExoticComponent<React.ComponentType<{ onClose?: () => void }>> | undefined>
}

export function SettingsModal({
  open,
  onClose,
  contextAppType,
  appTypes,
  appLabels,
  settingsMeta,
  settingsLoaders,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState(0)
  const [query, setQuery] = useState('')
  const [resetKey, setResetKey] = useState(0)

  useEffect(() => {
    if (!open || !contextAppType) return
    const idx = appTypes.indexOf(contextAppType)
    if (idx >= 0) setActiveTab(idx)
  }, [open, contextAppType, appTypes])

  const visibleApps = useMemo<AppType[]>(() => {
    if (!query.trim()) return appTypes
    const q = query.toLowerCase()
    return appTypes.filter(appType => {
      if (appLabels[appType]?.toLowerCase().includes(q)) return true
      const fields = settingsMeta[appType] ?? []
      return fields.some(f =>
        f.label.toLowerCase().includes(q) ||
        f.keywords.some(k => k.includes(q))
      )
    })
  }, [query, appTypes, appLabels, settingsMeta])

  const safeTab = Math.min(activeTab, Math.max(0, visibleApps.length - 1))

  const handleClose = () => {
    setQuery('')
    setActiveTab(0)
    setResetKey(k => k + 1)
    onClose()
  }

  return (
    <ComposedModal open={open} onClose={handleClose} size="lg" className="shell-settings-modal">
      <ModalHeader title="Settings" closeModal={handleClose}>
        <Search
          size="sm"
          id="settings-search"
          labelText="Search settings"
          placeholder="Search settings..."
          value={query}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setQuery(e.target.value)
            setActiveTab(0)
          }}
          onClear={() => { setQuery(''); setActiveTab(0) }}
          className="settings-search-input"
        />
        <SettingsTabBar
          visibleApps={visibleApps}
          appLabels={appLabels}
          activeTab={safeTab}
          onTabChange={setActiveTab}
        />
      </ModalHeader>
      <ModalBody hasScrollingContent className="settings-modal-body">
        {visibleApps.length === 0 ? (
          <p className="settings-no-results">No settings match "{query}"</p>
        ) : (
          visibleApps.map((appType, i) => {
            const PanelComponent = settingsLoaders[appType]
            return (
              <div
                key={appType}
                id={`settings-panel-${appType}`}
                role="tabpanel"
                aria-labelledby={`settings-tab-${appType}`}
                hidden={safeTab !== i}
                className="settings-panel-region"
              >
                {safeTab === i && (
                  <SettingsErrorBoundary key={`${appType}-${resetKey}`}>
                    <Suspense fallback={<InlineLoading description="Loading settings..." className="settings-loading-fallback" />}>
                      {PanelComponent ? <PanelComponent onClose={handleClose} /> : (
                        <p className="settings-no-panel">No settings panel available for {appLabels[appType]}.</p>
                      )}
                    </Suspense>
                  </SettingsErrorBoundary>
                )}
              </div>
            )
          })
        )}
      </ModalBody>
    </ComposedModal>
  )
}
