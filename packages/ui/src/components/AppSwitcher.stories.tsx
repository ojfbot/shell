import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { AppSwitcher } from './AppSwitcher.js'
import type { AppType, AppInstance, AppDisplayConfig } from '../types.js'

const APP_CONFIG: Record<AppType, AppDisplayConfig> = {
  'resume-builder': { label: 'Resume Builder' },
  'tripplanner': { label: 'TripPlanner' },
  'blogengine': { label: 'BlogEngine' },
  'purefoy': { label: 'Purefoy', singleton: true },
  'core-reader': { label: 'Core Reader', singleton: true },
}

const APP_TYPES: AppType[] = ['resume-builder', 'tripplanner', 'blogengine', 'purefoy', 'core-reader']

const BASE_INSTANCES: AppInstance[] = [
  { id: 'i1', appType: 'resume-builder', name: 'My Resume', remoteUrl: '' },
  { id: 'i2', appType: 'tripplanner', name: 'Tokyo Trip', remoteUrl: '' },
  { id: 'i3', appType: 'tripplanner', name: 'Berlin Trip', remoteUrl: '' },
  { id: 'i4', appType: 'purefoy', name: 'Purefoy', remoteUrl: '', singleton: true },
]

const noop = () => {}

const meta: Meta<typeof AppSwitcher> = {
  title: 'Shell/AppSwitcher',
  component: AppSwitcher,
  parameters: { layout: 'padded' },
  args: {
    appConfig: APP_CONFIG,
    appTypes: APP_TYPES,
    onActivate: noop,
    onClose: noop,
    onSpawnNew: noop,
    onGoHome: noop,
  },
}

export default meta
type Story = StoryObj<typeof AppSwitcher>

export const Default: Story = {
  args: {
    instances: BASE_INSTANCES,
    activeInstanceId: 'i1',
  },
}

export const MultiInstance: Story = {
  args: {
    instances: [
      ...BASE_INSTANCES,
      { id: 'i5', appType: 'resume-builder', name: 'Berlin Resume', remoteUrl: '' },
      { id: 'i6', appType: 'resume-builder', name: 'Tokyo Resume', remoteUrl: '' },
    ],
    activeInstanceId: 'i5',
  },
}

export const NoActiveInstance: Story = {
  args: {
    instances: BASE_INSTANCES,
    activeInstanceId: null,
  },
}

export const Empty: Story = {
  args: {
    instances: [],
    activeInstanceId: null,
  },
}

/** Shows the sidebar slide-in/out animation — click the toggle button. */
export const WithToggle: Story = {
  render: (args) => {
    const [open, setOpen] = useState(true)
    return (
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', minHeight: 360 }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            padding: '0.5rem 1rem',
            background: 'var(--ojf-accent, #5b4de0)',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            alignSelf: 'flex-start',
          }}
        >
          {open ? 'Collapse' : 'Expand'}
        </button>
        <div
          style={{
            width: open ? 256 : 0,
            overflow: 'hidden',
            transition: 'width 0.11s cubic-bezier(0.2, 0, 1, 0.9)',
            background: 'var(--cds-layer-01, #f4f4f4)',
            borderRight: '1px solid var(--cds-border-subtle-01, #e0e0e0)',
            borderRadius: 4,
          }}
        >
          <div style={{ width: 256, minWidth: 256 }}>
            <AppSwitcher {...args} />
          </div>
        </div>
      </div>
    )
  },
  args: {
    instances: BASE_INSTANCES,
    activeInstanceId: 'i1',
  },
}
