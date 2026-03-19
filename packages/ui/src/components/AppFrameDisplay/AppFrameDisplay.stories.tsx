import type { Meta, StoryObj } from '@storybook/react'
import { AppFrameDisplay } from './AppFrameDisplay.js'

const meta: Meta<typeof AppFrameDisplay> = {
  title: 'Shell/AppFrameDisplay',
  component: AppFrameDisplay,
  parameters: { layout: 'fullscreen' },
}

export default meta
type Story = StoryObj<typeof AppFrameDisplay>

export const Loading: Story = {
  args: { state: 'loading', appName: 'Resume Builder' },
}

export const Error: Story = {
  args: {
    state: 'error',
    appName: 'TripPlanner',
    errorMessage: 'Failed to fetch remoteEntry.js',
  },
}

export const ErrorNoDetail: Story = {
  args: { state: 'error', appName: 'BlogEngine' },
}
