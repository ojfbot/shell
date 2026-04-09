import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { SettingsErrorBoundary } from './SettingsErrorBoundary'

function ThrowingChild(): React.ReactNode {
  throw new Error('Simulated settings panel crash')
}

const meta: Meta<typeof SettingsErrorBoundary> = {
  title: 'Components/SettingsErrorBoundary',
  component: SettingsErrorBoundary,
}

export default meta
type Story = StoryObj<typeof SettingsErrorBoundary>

export const HappyPath: Story = {
  args: {
    children: <p>Settings panel content loaded successfully</p>,
  },
}

export const ErrorState: Story = {
  args: {
    children: <ThrowingChild />,
  },
}
