import { useState, useMemo } from 'react'
import { TextInput, IconButton } from '@carbon/react'
import './AppSwitcher.css'
import { Switcher, Close } from '@carbon/icons-react'
import type { AppType, AppInstance, AppDisplayConfig } from '../types.js'

export interface AppSwitcherProps {
  instances: AppInstance[]
  activeInstanceId: string | null
  /** Instance ID that was just spawned — triggers entry animation. Null when idle. */
  lastSpawnedInstanceId: string | null
  /** Display config keyed by AppType — labels, singleton flags. */
  appConfig: Record<AppType, AppDisplayConfig>
  /** Ordered list of app types, controls group render order. */
  appTypes: AppType[]
  onActivate: (instanceId: string) => void
  onClose: (instanceId: string) => void
  onSpawnNew: (appType: AppType) => void
  onGoHome: () => void
  /** Called after spawn animation completes to clear the flag. */
  onSpawnAnimationEnd?: () => void
}

/**
 * Instance list with search — renders inside Carbon SideNav.
 * Shows all instances grouped by app type; clicking activates the instance.
 * Extra instances (beyond the first per app type) show a × close button.
 * Singleton app types suppress the "+ New" entry.
 *
 * Pure component — no Redux imports. Wire via AppSwitcherConnected in shell-app.
 */
export function AppSwitcher({
  instances,
  activeInstanceId,
  lastSpawnedInstanceId,
  appConfig,
  appTypes,
  onActivate,
  onClose,
  onSpawnNew,
  onGoHome,
  onSpawnAnimationEnd,
}: AppSwitcherProps) {
  const [search, setSearch] = useState('')
  const q = search.toLowerCase()

  const filteredInstances = useMemo(
    () =>
      q
        ? instances.filter(
            i =>
              i.name.toLowerCase().includes(q) ||
              appConfig[i.appType].label.toLowerCase().includes(q),
          )
        : instances,
    [instances, q, appConfig],
  )

  const visibleTypes = useMemo(
    () => appTypes.filter(t => filteredInstances.some(i => i.appType === t)),
    [appTypes, filteredInstances],
  )

  return (
    <div className="sidebar-search-container">
      <div className="sidebar-search-row">
        <TextInput
          id="app-search"
          labelText="Search applications"
          hideLabel
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          size="sm"
        />
        <IconButton
          label="Return to home"
          kind="ghost"
          size="sm"
          align="bottom-right"
          onClick={onGoHome}
          disabled={activeInstanceId === null}
        >
          <Switcher size={16} />
        </IconButton>
      </div>

      <div className="applications-list">
        {visibleTypes.length > 0 ? (
          visibleTypes.map(appType => {
            const typeInstances = filteredInstances.filter(i => i.appType === appType)
            const totalOfType = instances.filter(i => i.appType === appType).length
            const isSingleton = appConfig[appType].singleton ?? false

            return (
              <div key={appType} className="app-group">
                <div className="app-group__label">{appConfig[appType].label}</div>
                {typeInstances.map(inst => {
                  const isDeletable = totalOfType > 1
                  const isCurrent = activeInstanceId === inst.id
                  const isJustSpawned = inst.id === lastSpawnedInstanceId
                  return (
                    <div
                      key={inst.id}
                      className={`application-item${isCurrent ? ' current-app' : ''}${isJustSpawned ? ' application-item--spawned' : ''}`}
                      onClick={() => onActivate(inst.id)}
                      onAnimationEnd={isJustSpawned ? onSpawnAnimationEnd : undefined}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onActivate(inst.id)
                        }
                      }}
                    >
                      <span className="application-item__label">{inst.name}</span>
                      {isDeletable && (
                        <button
                          className="application-item__delete"
                          aria-label={`Close ${inst.name}`}
                          onClick={e => {
                            e.stopPropagation()
                            onClose(inst.id)
                          }}
                        >
                          <Close size={14} />
                        </button>
                      )}
                    </div>
                  )
                })}
                {!q && !isSingleton && (
                  <div
                    className="application-item application-item--new"
                    onClick={() => onSpawnNew(appType)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onSpawnNew(appType)
                      }
                    }}
                  >
                    + New
                  </div>
                )}
              </div>
            )
          })
        ) : (
          <div className="no-results">No applications found</div>
        )}
      </div>
    </div>
  )
}
