import { ClickableTile } from '@carbon/react'
import { type CarbonIconType, Document, AirlineManageGates, Blog } from '@carbon/icons-react'
import type { AppInstance, AppType } from '../types.js'

// ── Helper ────────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ── Types ─────────────────────────────────────────────────────────────────────

/** Extended AppInstance with thread/activity metadata needed by HomeScreen. */
export interface HomeScreenInstance extends AppInstance {
  /** Number of conversation threads tracked for this instance. */
  threads: unknown[]
  /** ISO timestamp of last activity — used for the relative-time badge. */
  lastActivity: string
}

/** Static display config for one row in the home-screen grid. */
export interface AppRowConfig {
  type: AppType
  label: string
  Icon: CarbonIconType
}

export interface HomeScreenProps {
  /**
   * All live instances across every app type.
   * HomeScreen filters by `row.type` to build each section.
   */
  instances: HomeScreenInstance[]
  /**
   * Ordered list of app rows to display. Determines which app types appear
   * and in what order — pass only the rows the host app should show.
   */
  rows: AppRowConfig[]
  /** Called when the user clicks an instance tile. */
  onActivate: (instanceId: string) => void
}

// ── Default row config (matches shell-app's current hard-coded list) ──────────

/** Default row config for the full Frame OS app suite. */
export const DEFAULT_ROWS: AppRowConfig[] = [
  { type: 'resume-builder',  label: 'Resume Builder', Icon: Document },
  { type: 'tripplanner', label: 'Trip Planner',   Icon: AirlineManageGates },
  { type: 'blogengine',  label: 'Blog Engine',    Icon: Blog },
]

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Landing screen shown when no instance is active.
 * Renders a hero blurb and a grid of ClickableTiles, one per existing instance.
 *
 * Pure component — no Redux imports. Wire via a connected wrapper in shell-app.
 */
export function HomeScreen({ instances, rows, onActivate }: HomeScreenProps) {
  return (
    <div className="home-screen">
      <div className="home-screen__hero">
        <h1 className="home-screen__title">Frame</h1>
        <p className="home-screen__subtitle">
          Open an app below, or press <kbd>⌘K</kbd> to ask Frame anything.
        </p>
      </div>

      <div className="home-screen__sections">
        {rows.map(({ type, label, Icon }) => {
          const appInstances = instances.filter(i => i.appType === type)

          return (
            <div key={type} className="home-screen__section">
              <div className="home-screen__section-label">
                <Icon size={16} />
                <span>{label}</span>
              </div>

              <div className="home-screen__grid">
                {appInstances.length === 0 ? (
                  <p className="home-screen__empty">
                    No instances — use the sidebar to create one.
                  </p>
                ) : (
                  appInstances.map(inst => {
                    const threadCount = inst.threads.length
                    return (
                      <ClickableTile
                        key={inst.id}
                        className="home-screen__tile"
                        onClick={() => onActivate(inst.id)}
                      >
                        <p className="home-screen__tile-name">{inst.name}</p>
                        <p className="home-screen__tile-meta">
                          {threadCount} thread{threadCount !== 1 ? 's' : ''} ·{' '}
                          {relativeTime(inst.lastActivity)}
                        </p>
                        <span className="home-screen__tile-cta">Open →</span>
                      </ClickableTile>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
