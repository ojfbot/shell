import type { Meta, StoryObj } from '@storybook/react'
import { DomainBadge } from './DomainBadge'

const meta: Meta<typeof DomainBadge> = {
  title: 'Components/DomainBadge',
  component: DomainBadge,
}

export default meta
type Story = StoryObj<typeof DomainBadge>

export const ResumeBuilder: Story = {
  args: { label: 'Resume Builder' },
}

export const TripPlanner: Story = {
  args: { label: 'TripPlanner' },
}

export const CrossDomain: Story = {
  args: { label: 'cross-domain' },
}

export const Null: Story = {
  args: { label: null },
  name: 'No domain (null)',
}
