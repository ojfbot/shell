import type { Meta, StoryObj } from '@storybook/react'
import { SettingsTabBar } from './SettingsTabBar'
import type { AppType } from '../types'

const meta: Meta<typeof SettingsTabBar> = {
  title: 'Components/SettingsTabBar',
  component: SettingsTabBar,
  argTypes: {
    onTabChange: { action: 'tab-changed' },
  },
}

export default meta
type Story = StoryObj<typeof SettingsTabBar>

const APP_LABELS: Record<string, string> = {
  'resume-builder': 'Resume Builder',
  'tripplanner': 'TripPlanner',
  'blogengine': 'BlogEngine',
}

export const Default: Story = {
  args: {
    visibleApps: ['resume-builder', 'tripplanner', 'blogengine'] as AppType[],
    appLabels: APP_LABELS,
    activeTab: 0,
  },
}

export const SecondTabActive: Story = {
  args: {
    ...Default.args,
    activeTab: 1,
  },
}

export const SingleTab: Story = {
  args: {
    visibleApps: ['resume-builder'] as AppType[],
    appLabels: { 'resume-builder': 'Resume Builder' },
    activeTab: 0,
  },
}

export const Empty: Story = {
  args: {
    visibleApps: [] as AppType[],
    appLabels: {},
    activeTab: 0,
  },
}
