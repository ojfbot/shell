import type { Meta, StoryObj } from '@storybook/react'
import { AppSwitcher } from './AppSwitcher.js'
import type { AppType, AppInstance, AppDisplayConfig } from '../types.js'

const APP_CONFIG: Record<AppType, AppDisplayConfig> = {
  'cv-builder': { label: 'CV Builder' },
  'tripplanner': { label: 'TripPlanner' },
  'blogengine': { label: 'BlogEngine' },
  'purefoy': { label: 'Purefoy', singleton: true },
  'core-reader': { label: 'Core Reader', singleton: true },
}

const APP_TYPES: AppType[] = ['cv-builder', 'tripplanner', 'blogengine', 'purefoy', 'core-reader']

const BASE_INSTANCES: AppInstance[] = [
  { id: 'i1', appType: 'cv-builder', name: 'My CV', remoteUrl: '' },
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
      { id: 'i5', appType: 'cv-builder', name: 'Berlin CV', remoteUrl: '' },
      { id: 'i6', appType: 'cv-builder', name: 'Tokyo CV', remoteUrl: '' },
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
