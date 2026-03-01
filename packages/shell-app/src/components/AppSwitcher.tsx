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
 * Flat app list with search — renders inside Carbon SideNav.
 * Clicking an app activates its first instance (or creates one).
 * The home button clears the active app and returns to HomeScreen.
 */
export function AppSwitcher() {
  const dispatch = useAppDispatch()
  const { instances, activeInstanceId } = useAppSelector(s => s.appRegistry)
  const [search, setSearch] = useState('')

  const activeAppType = instances.find(i => i.id === activeInstanceId)?.appType

  const filtered = useMemo(
    () => APP_TYPES.filter(t =>
      APP_LABELS[t].toLowerCase().includes(search.toLowerCase())
    ),
    [search]
  )

  function handleSelect(appType: AppType) {
    const existing = instances.find(i => i.appType === appType)
    if (existing) {
      dispatch(activateInstance(existing.id))
    } else {
      dispatch(spawnInstance({
        appType,
        name: APP_CONFIG[appType].defaultInstanceName,
        remoteUrl: APP_CONFIG[appType].remoteUrl,
      }))
    }
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
          onClick={() => dispatch(goHome())}
          disabled={activeInstanceId === null}
        >
          <Switcher size={16} />
        </IconButton>
      </div>
      <div className="applications-list">
        {filtered.length > 0 ? (
          filtered.map(appType => (
            <div
              key={appType}
              className={`application-item${activeAppType === appType ? ' current-app' : ''}`}
              onClick={() => handleSelect(appType)}
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleSelect(appType)
                }
              }}
            >
              {APP_LABELS[appType]}
            </div>
          ))
        ) : (
          <div className="no-results">No applications found</div>
        )}
      </div>
    </div>
  )
}
