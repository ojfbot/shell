import type { Meta, StoryObj } from '@storybook/react'
import { HomeScreen, DEFAULT_ROWS } from './HomeScreen.js'
import type { HomeScreenInstance } from './HomeScreen.js'

// ── Fixture data ──────────────────────────────────────────────────────────────

const now = new Date().toISOString()
const minsAgo = (n: number) => new Date(Date.now() - n * 60000).toISOString()
const hoursAgo = (n: number) => new Date(Date.now() - n * 3600000).toISOString()
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString()

const BASE_INSTANCES: HomeScreenInstance[] = [
  {
    id: 'i1',
    appType: 'cv-builder',
    name: 'Jim Green — Senior Engineer',
    remoteUrl: '',
    threads: [1, 2, 3],
    lastActivity: minsAgo(3),
  },
  {
    id: 'i2',
    appType: 'tripplanner',
    name: 'Tokyo Trip',
    remoteUrl: '',
    threads: [1],
    lastActivity: hoursAgo(2),
  },
  {
    id: 'i3',
    appType: 'tripplanner',
    name: 'Berlin Weekend',
    remoteUrl: '',
    threads: [1, 2],
    lastActivity: daysAgo(1),
  },
  {
    id: 'i4',
    appType: 'blogengine',
    name: 'Frame OS Blog',
    remoteUrl: '',
    threads: [],
    lastActivity: daysAgo(3),
  },
]

const noop = () => {}

// ── Meta ──────────────────────────────────────────────────────────────────────

const meta: Meta<typeof HomeScreen> = {
  title: 'Shell/HomeScreen',
  component: HomeScreen,
  parameters: { layout: 'padded' },
  args: {
    rows: DEFAULT_ROWS,
    onActivate: noop,
  },
}

export default meta
type Story = StoryObj<typeof HomeScreen>

// ── Stories ───────────────────────────────────────────────────────────────────

/** Default state: a mix of instances across app types. */
export const Default: Story = {
  args: {
    instances: BASE_INSTANCES,
  },
}

/** All sections empty — shows the "use sidebar" placeholder in each row. */
export const AllEmpty: Story = {
  args: {
    instances: [],
  },
}

/** Single app type with many instances. */
export const ManyResumes: Story = {
  args: {
    instances: [
      { id: 'r1', appType: 'cv-builder', name: 'Jim Green — Senior Engineer', remoteUrl: '', threads: [1, 2, 3], lastActivity: minsAgo(1) },
      { id: 'r2', appType: 'cv-builder', name: 'Jim Green — Engineering Manager', remoteUrl: '', threads: [1], lastActivity: hoursAgo(5) },
      { id: 'r3', appType: 'cv-builder', name: 'Jim Green — Staff Engineer', remoteUrl: '', threads: [1, 2], lastActivity: daysAgo(2) },
    ],
  },
}

/** Only the CV Builder row is shown — host can pass a subset of rows. */
export const SingleRowConfig: Story = {
  args: {
    instances: BASE_INSTANCES,
    rows: [{ type: 'cv-builder', label: 'Resume Builder', Icon: DEFAULT_ROWS[0].Icon }],
  },
}

/** Relative time edge cases: just now, minutes, hours, days. */
export const RelativeTimeBadges: Story = {
  args: {
    instances: [
      { id: 't1', appType: 'cv-builder', name: 'Just opened', remoteUrl: '', threads: [], lastActivity: now },
      { id: 't2', appType: 'tripplanner', name: '45 minutes ago', remoteUrl: '', threads: [1], lastActivity: minsAgo(45) },
      { id: 't3', appType: 'blogengine', name: '6 hours ago', remoteUrl: '', threads: [1, 2, 3], lastActivity: hoursAgo(6) },
    ],
  },
}
