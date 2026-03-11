import { ClickableTile } from '@carbon/react'
import { type CarbonIconType, Document, AirlineManageGates, Blog } from '@carbon/icons-react'
import { useAppDispatch, useAppSelector } from '../store/hooks.js'
import {
  activateInstance,
  type AppType,
} from '../store/slices/appRegistrySlice.js'

const APPS: {
  type: AppType
  label: string
  Icon: CarbonIconType
}[] = [
  { type: 'cv-builder', label: 'Resume Builder', Icon: Document },
  { type: 'tripplanner', label: 'Trip Planner', Icon: AirlineManageGates },
  { type: 'blogengine', label: 'Blog Engine', Icon: Blog },
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

  return (
    <div className="home-screen">
      <div className="home-screen__hero">
        <h1 className="home-screen__title">Frame</h1>
        <p className="home-screen__subtitle">
          Open an app below, or press <kbd>⌘K</kbd> to ask Frame anything.
        </p>
      </div>

      <div className="home-screen__sections">
        {APPS.map(({ type, label, Icon }) => {
          const appInstances = instances.filter(i => i.appType === type)

          return (
            <div key={type} className="home-screen__section">
              <div className="home-screen__section-label">
                <Icon size={16} />
                <span>{label}</span>
              </div>

              <div className="home-screen__grid">
                {appInstances.length === 0 ? (
                  <p className="home-screen__empty">No instances — use the sidebar to create one.</p>
                ) : appInstances.map(inst => {
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
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
