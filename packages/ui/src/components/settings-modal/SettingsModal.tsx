import React from 'react'
import {
  ComposedModal,
  ModalHeader,
  ModalBody,
  Search,
} from '@carbon/react'
import { SettingsTabBar } from '../SettingsTabBar.js'
import { SettingsPanel } from './SettingsPanel.js'
import { useSettingsModal } from './useSettingsModal.js'
import type { SettingsModalProps } from './types.js'

export function SettingsModal({
  open,
  onClose,
  contextAppType,
  appTypes,
  appLabels,
  settingsMeta,
  settingsLoaders,
}: SettingsModalProps) {
  const {
    activeTab,
    setActiveTab,
    query,
    resetKey,
    visibleApps,
    handleClose,
    handleSearchChange,
    handleSearchClear,
  } = useSettingsModal({ open, onClose, contextAppType, appTypes, appLabels, settingsMeta })

  return (
    <ComposedModal open={open} onClose={handleClose} size="lg" className="shell-settings-modal">
      <ModalHeader title="Settings" closeModal={handleClose}>
        <Search
          size="sm"
          id="settings-search"
          labelText="Search settings"
          placeholder="Search settings..."
          value={query}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearchChange(e.target.value)}
          onClear={handleSearchClear}
          className="settings-search-input"
        />
        <SettingsTabBar
          visibleApps={visibleApps}
          appLabels={appLabels}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </ModalHeader>
      <ModalBody hasScrollingContent className="settings-modal-body">
        {visibleApps.length === 0 ? (
          <p className="settings-no-results">No settings match "{query}"</p>
        ) : (
          visibleApps.map((appType, i) => (
            <SettingsPanel
              key={appType}
              appType={appType}
              index={i}
              activeTab={activeTab}
              resetKey={resetKey}
              appLabels={appLabels}
              settingsLoaders={settingsLoaders}
              onClose={handleClose}
            />
          ))
        )}
      </ModalBody>
    </ComposedModal>
  )
}
