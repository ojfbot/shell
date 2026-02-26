import { ClickableTile } from '@carbon/react'
import { type CarbonIconType, Document, AirlineManageGates, Blog } from '@carbon/icons-react'
import { useAppDispatch, useAppSelector } from '../store/hooks.js'
import {
  spawnInstance,
  activateInstance,
  type AppInstance,
  type AppType,
} from '../store/slices/appRegistrySlice.js'

const APPS: {
  type: AppType
  label: string
  hint: string
  Icon: CarbonIconType
  remoteEnvKey: string
  defaultPort: number
  defaultName: string
}[] = [
  {
    type: 'cv-builder',
    label: 'CV Builder',
    hint: 'Resume · cover letters · interview prep',
    Icon: Document,
    remoteEnvKey: 'VITE_REMOTE_CV_BUILDER',
    defaultPort: 3000,
    defaultName: 'My CV',
  },
  {
    type: 'tripplanner',
    label: 'Trip Planner',
    hint: 'Itineraries · budgets · bookings',
    Icon: AirlineManageGates,
    remoteEnvKey: 'VITE_REMOTE_TRIPPLANNER',
    defaultPort: 3010,
    defaultName: 'My Trips',
  },
  {
    type: 'blogengine',
    label: 'Blog Engine',
    hint: 'Posts · drafts · Notion sync',
    Icon: Blog,
    remoteEnvKey: 'VITE_REMOTE_BLOGENGINE',
    defaultPort: 3005,
    defaultName: 'My Blog',
  },
]

function relativeTime(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function HomeScreen() {
  const dispatch = useAppDispatch()
  const { instances } = useAppSelector(s => s.appRegistry)

  function handleLaunch(
    type: AppType,
    remoteEnvKey: string,
    defaultPort: number,
    defaultName: string,
    existing: AppInstance | undefined,
  ) {
    if (existing) {
      dispatch(activateInstance(existing.id))
    } else {
      const remoteUrl = (import.meta.env[remoteEnvKey] as string | undefined) ?? `http://localhost:${defaultPort}`
      dispatch(spawnInstance({ appType: type, name: defaultName, remoteUrl }))
    }
  }

  return (
    <div className="home-screen">
      <div className="home-screen__hero">
        <h1 className="home-screen__title">Frame</h1>
        <p className="home-screen__subtitle">
          Open an app below, or press <kbd>⌘K</kbd> to ask Frame anything.
        </p>
      </div>

      <div className="home-screen__grid">
        {APPS.map(({ type, label, hint, Icon, remoteEnvKey, defaultPort, defaultName }) => {
          const existing = instances.find(i => i.appType === type)
          const threadCount = existing?.threads.length ?? 0
          const lastActive = existing ? relativeTime(existing.lastActivity) : null

          return (
            <ClickableTile
              key={type}
              className="home-screen__tile"
              onClick={() => handleLaunch(type, remoteEnvKey, defaultPort, defaultName, existing)}
            >
              <div className="home-screen__tile-header">
                <Icon size={20} />
                <span className="home-screen__tile-app">{label}</span>
              </div>
              <p className="home-screen__tile-name">
                {existing ? existing.name : 'No session'}
              </p>
              <p className="home-screen__tile-meta">
                {existing
                  ? `${threadCount} thread${threadCount !== 1 ? 's' : ''} · ${lastActive}`
                  : hint}
              </p>
              <span className="home-screen__tile-cta">
                {existing ? 'Open →' : 'Launch →'}
              </span>
            </ClickableTile>
          )
        })}
      </div>
    </div>
  )
}
