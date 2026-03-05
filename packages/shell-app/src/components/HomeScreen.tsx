import { ClickableTile } from '@carbon/react'
import { type CarbonIconType, Document, AirlineManageGates, Blog, Add } from '@carbon/icons-react'
import { useAppDispatch, useAppSelector } from '../store/hooks.js'
import {
  spawnInstance,
  activateInstance,
  APP_CONFIG,
  type AppType,
} from '../store/slices/appRegistrySlice.js'

const APPS: {
  type: AppType
  label: string
  hint: string
  Icon: CarbonIconType
}[] = [
  {
    type: 'cv-builder',
    label: 'CV Builder',
    hint: 'Resume · cover letters · interview prep',
    Icon: Document,
  },
  {
    type: 'tripplanner',
    label: 'Trip Planner',
    hint: 'Itineraries · budgets · bookings',
    Icon: AirlineManageGates,
  },
  {
    type: 'blogengine',
    label: 'Blog Engine',
    hint: 'Posts · drafts · Notion sync',
    Icon: Blog,
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

  function handleNewSession(type: AppType, existingCount: number) {
    const base = APP_CONFIG[type].defaultInstanceName
    const name = existingCount === 0 ? base : `${base} ${existingCount + 1}`
    dispatch(spawnInstance({
      appType: type,
      name,
      remoteUrl: APP_CONFIG[type].remoteUrl,
    }))
  }

  return (
    <div className="home-screen">
      <div className="home-screen__hero">
        <h1 className="home-screen__title">Frame</h1>
        <p className="home-screen__subtitle">
          Open an app below, or press <kbd>⌘K</kbd> to ask Frame anything.
        </p>
      </div>

      <div className="home-screen__sections">
        {APPS.map(({ type, label, hint, Icon }) => {
          const appInstances = instances.filter(i => i.appType === type)

          return (
            <div key={type} className="home-screen__section">
              <div className="home-screen__section-label">
                <Icon size={16} />
                <span>{label}</span>
              </div>

              <div className="home-screen__grid">
                {appInstances.map(inst => {
                  const threadCount = inst.threads.length
                  return (
                    <ClickableTile
                      key={inst.id}
                      className="home-screen__tile"
                      onClick={() => dispatch(activateInstance(inst.id))}
                    >
                      <p className="home-screen__tile-name">{inst.name}</p>
                      <p className="home-screen__tile-meta">
                        {threadCount} thread{threadCount !== 1 ? 's' : ''} · {relativeTime(inst.lastActivity)}
                      </p>
                      <span className="home-screen__tile-cta">Open →</span>
                    </ClickableTile>
                  )
                })}

                <ClickableTile
                  className="home-screen__tile home-screen__tile--new"
                  onClick={() => handleNewSession(type, appInstances.length)}
                >
                  <div className="home-screen__tile-new-icon">
                    <Add size={20} />
                  </div>
                  <p className="home-screen__tile-name">New session</p>
                  <p className="home-screen__tile-meta">{hint}</p>
                  <span className="home-screen__tile-cta">Launch →</span>
                </ClickableTile>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
