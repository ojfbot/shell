import { useState, useMemo } from 'react'
import { TextInput } from '@carbon/react'
import { Switcher } from '@carbon/icons-react'
import { useAppDispatch, useAppSelector } from '../store/hooks.js'
import {
  activateInstance,
  spawnInstance,
  goHome,
  APP_LABELS,
  type AppType,
} from '../store/slices/appRegistrySlice.js'

const APP_REMOTE_DEFAULTS: Record<AppType, string> = {
  'cv-builder': import.meta.env.VITE_REMOTE_CV_BUILDER ?? 'http://localhost:3000',
  'tripplanner': import.meta.env.VITE_REMOTE_TRIPPLANNER ?? 'http://localhost:3010',
  'blogengine': import.meta.env.VITE_REMOTE_BLOGENGINE ?? 'http://localhost:3005',
  'purefoy': import.meta.env.VITE_REMOTE_PUREFOY ?? 'http://localhost:3020',
}

const APP_TYPES: AppType[] = ['cv-builder', 'tripplanner', 'blogengine', 'purefoy']

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
        name: APP_LABELS[appType],
        remoteUrl: APP_REMOTE_DEFAULTS[appType],
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
        <button
          className={`sidebar-home-btn${activeInstanceId === null ? ' is-home' : ''}`}
          onClick={() => dispatch(goHome())}
          disabled={activeInstanceId === null}
          aria-label="Return to home"
          title="Return to home"
        >
          <Switcher size={16} />
        </button>
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
