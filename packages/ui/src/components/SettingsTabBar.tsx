import type { AppType } from '../types.js'

export interface SettingsTabBarProps {
  visibleApps: AppType[]
  appLabels: Record<string, string>
  activeTab: number
  onTabChange: (index: number) => void
}

export function SettingsTabBar({
  visibleApps,
  appLabels,
  activeTab,
  onTabChange,
}: SettingsTabBarProps) {
  if (visibleApps.length === 0) return null

  return (
    <div className="settings-modal-tabs" role="tablist" aria-label="App settings panels">
      {visibleApps.map((appType, i) => (
        <button
          key={appType}
          id={`settings-tab-${appType}`}
          role="tab"
          aria-selected={activeTab === i}
          aria-controls={`settings-panel-${appType}`}
          className={`settings-tab${activeTab === i ? ' settings-tab--active' : ''}`}
          onClick={() => onTabChange(i)}
          tabIndex={activeTab === i ? 0 : -1}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') { e.preventDefault(); onTabChange((activeTab + 1) % visibleApps.length) }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); onTabChange((activeTab - 1 + visibleApps.length) % visibleApps.length) }
          }}
        >
          {appLabels[appType]}
        </button>
      ))}
    </div>
  )
}
