import { ClickableTile } from '@carbon/react'
import { type CarbonIconType, Document, AirlineManageGates, Blog, User } from '@carbon/icons-react'
import { useAppDispatch, useAppSelector } from '../store/hooks.js'
import { spawnInstance, activateInstance, type AppType } from '../store/slices/appRegistrySlice.js'

const APPS: {
  type: AppType
  label: string
  description: string
  Icon: CarbonIconType
  remoteEnvKey: string
  defaultPort: number
}[] = [
  {
    type: 'cv-builder',
    label: 'CV Builder',
    description: 'Craft and tailor your resume with AI. Generate cover letters, prep for interviews.',
    Icon: Document,
    remoteEnvKey: 'VITE_REMOTE_CV_BUILDER',
    defaultPort: 3000,
  },
  {
    type: 'tripplanner',
    label: 'Trip Planner',
    description: 'Plan itineraries, track budgets, and book travel with conversational AI.',
    Icon: AirlineManageGates,
    remoteEnvKey: 'VITE_REMOTE_TRIPPLANNER',
    defaultPort: 3010,
  },
  {
    type: 'blogengine',
    label: 'Blog Engine',
    description: 'Write, edit, and publish posts. AI-assisted drafts, Notion sync, podcast pipeline.',
    Icon: Blog,
    remoteEnvKey: 'VITE_REMOTE_BLOGENGINE',
    defaultPort: 3005,
  },
  {
    type: 'purefoy',
    label: 'Purefoy',
    description: 'Personal portfolio and life OS. Capture notes, goals, and reflections.',
    Icon: User,
    remoteEnvKey: 'VITE_REMOTE_PUREFOY',
    defaultPort: 3020,
  },
]

export function HomeScreen() {
  const dispatch = useAppDispatch()
  const { instances } = useAppSelector(s => s.appRegistry)

  function handleLaunch(appType: AppType, remoteEnvKey: string, defaultPort: number, label: string) {
    const existing = instances.find(i => i.appType === appType)
    if (existing) {
      dispatch(activateInstance(existing.id))
    } else {
      const remoteUrl = (import.meta.env[remoteEnvKey] as string | undefined) ?? `http://localhost:${defaultPort}`
      dispatch(spawnInstance({ appType, name: label, remoteUrl }))
    }
  }

  return (
    <div className="home-screen">
      <div className="home-screen__hero">
        <h1 className="home-screen__title">Frame</h1>
        <p className="home-screen__subtitle">
          Your AI App OS — pick an app to get started, or ask Frame anything using <kbd>⌘K</kbd>.
        </p>
      </div>

      <div className="home-screen__grid">
        {APPS.map(({ type, label, description, Icon, remoteEnvKey, defaultPort }) => (
          <ClickableTile
            key={type}
            className="home-screen__tile"
            onClick={() => handleLaunch(type, remoteEnvKey, defaultPort, label)}
          >
            <div className="home-screen__tile-icon">
              <Icon size={32} />
            </div>
            <p className="home-screen__tile-label">{label}</p>
            <p className="home-screen__tile-desc">{description}</p>
          </ClickableTile>
        ))}
      </div>
    </div>
  )
}
