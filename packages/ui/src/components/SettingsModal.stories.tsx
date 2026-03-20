import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import { SettingsModal } from './SettingsModal'
import type { SettingsFieldMeta } from './SettingsModal'
import type { AppType } from '../types'

const APP_TYPES: AppType[] = ['resume-builder', 'tripplanner', 'blogengine']

const APP_LABELS: Record<string, string> = {
  'resume-builder': 'Resume Builder',
  'tripplanner': 'TripPlanner',
  'blogengine': 'BlogEngine',
}

const SETTINGS_META: Record<string, SettingsFieldMeta[]> = {
  'resume-builder': [
    { label: 'API base URL', keywords: ['api', 'url', 'endpoint'] },
    { label: 'Default template', keywords: ['template', 'layout'] },
  ],
  'tripplanner': [
    { label: 'API base URL', keywords: ['api', 'url', 'endpoint'] },
    { label: 'Default currency', keywords: ['currency', 'usd', 'eur'] },
  ],
  'blogengine': [
    { label: 'API base URL', keywords: ['api', 'url', 'endpoint'] },
    { label: 'Default author', keywords: ['author', 'name'] },
  ],
}

function StubPanel({ onClose }: { onClose?: () => void }) {
  return (
    <div style={{ padding: '1rem' }}>
      <p>Stub settings panel content</p>
      <button onClick={onClose}>Close</button>
    </div>
  )
}

const LazyStub = React.lazy(() => Promise.resolve({ default: StubPanel }))

const SETTINGS_LOADERS: Record<string, React.LazyExoticComponent<React.ComponentType<{ onClose?: () => void }>> | undefined> = {
  'resume-builder': LazyStub,
  'tripplanner': LazyStub,
  'blogengine': undefined,
}

const meta: Meta<typeof SettingsModal> = {
  title: 'Components/SettingsModal',
  component: SettingsModal,
  argTypes: {
    onClose: { action: 'closed' },
  },
}

export default meta
type Story = StoryObj<typeof SettingsModal>

export const Default: Story = {
  args: {
    open: true,
    contextAppType: null,
    appTypes: APP_TYPES,
    appLabels: APP_LABELS,
    settingsMeta: SETTINGS_META,
    settingsLoaders: SETTINGS_LOADERS,
  },
}

export const WithContextApp: Story = {
  args: {
    ...Default.args,
    contextAppType: 'tripplanner',
  },
}

export const SingleApp: Story = {
  args: {
    ...Default.args,
    appTypes: ['resume-builder'],
    appLabels: { 'resume-builder': 'Resume Builder' },
    settingsMeta: { 'resume-builder': SETTINGS_META['resume-builder'] },
    settingsLoaders: { 'resume-builder': LazyStub },
  },
}

export const NoPanel: Story = {
  args: {
    ...Default.args,
    contextAppType: 'blogengine',
  },
  name: 'App without settings panel',
}

export const Closed: Story = {
  args: {
    ...Default.args,
    open: false,
  },
}
