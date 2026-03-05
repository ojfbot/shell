import { useState, useMemo } from 'react'
import { TextInput, IconButton } from '@carbon/react'
import { Switcher } from '@carbon/icons-react'
import { useAppDispatch, useAppSelector } from '../store/hooks.js'
import {
  activateInstance,
  spawnInstance,
  goHome,
  APP_CONFIG,
  APP_LABELS,
  APP_TYPES,
  type AppType,
} from '../store/slices/appRegistrySlice.js'

/**
 * Instance list with search — renders inside Carbon SideNav.
 * Shows all instances grouped by app type; clicking activates the instance.
 * "+ New" spawns an additional instance of that app type.
 * The home button clears the active app and returns to HomeScreen.
 */
export function AppSwitcher() {
  const dispatch = useAppDispatch()
  const { instances, activeInstanceId } = useAppSelector(s => s.appRegistry)
  const [search, setSearch] = useState('')

  const q = search.toLowerCase()

  const filteredInstances = useMemo(
    () => q
      ? instances.filter(i =>
          i.name.toLowerCase().includes(q) ||
          APP_LABELS[i.appType].toLowerCase().includes(q)
        )
      : instances,
    [instances, q]
  )

  const visibleTypes = useMemo(
    () => APP_TYPES.filter(t => filteredInstances.some(i => i.appType === t)),
    [filteredInstances]
  )

  function handleSpawnNew(appType: AppType) {
    const existing = instances.filter(i => i.appType === appType)
    const base = APP_CONFIG[appType].defaultInstanceName
    const name = existing.length === 0 ? base : `${base} ${existing.length + 1}`
    dispatch(spawnInstance({ appType, name, remoteUrl: APP_CONFIG[appType].remoteUrl }))
  }

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
          onClick={() => dispatch(goHome())}
          disabled={activeInstanceId === null}
        >
          <Switcher size={16} />
        </IconButton>
      </div>

      <div className="applications-list">
        {visibleTypes.length > 0 ? (
          visibleTypes.map(appType => {
            const typeInstances = filteredInstances.filter(i => i.appType === appType)
            return (
              <div key={appType} className="app-group">
                <div className="app-group__label">{APP_LABELS[appType]}</div>
                {typeInstances.map(inst => (
                  <div
                    key={inst.id}
                    className={`application-item${activeInstanceId === inst.id ? ' current-app' : ''}`}
                    onClick={() => dispatch(activateInstance(inst.id))}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        dispatch(activateInstance(inst.id))
                      }
                    }}
                  >
                    {inst.name}
                  </div>
                ))}
                {!q && (
                  <div
                    className="application-item application-item--new"
                    onClick={() => handleSpawnNew(appType)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleSpawnNew(appType)
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
