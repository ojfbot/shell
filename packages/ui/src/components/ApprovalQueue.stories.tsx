import type { Meta, StoryObj } from '@storybook/react'
import { ApprovalQueue } from './ApprovalQueue'
import type { ApprovalItem } from './ApprovalQueue'

const meta: Meta<typeof ApprovalQueue> = {
  title: 'Components/ApprovalQueue',
  component: ApprovalQueue,
  argTypes: {
    onApprove: { action: 'approved' },
    onReject: { action: 'rejected' },
  },
}

export default meta
type Story = StoryObj<typeof ApprovalQueue>

const sampleItems: ApprovalItem[] = [
  { id: '1', title: 'Deploy Resume Builder v2.3', labels: { role: 'deploy-agent', hook: 'pre-deploy' } },
  { id: '2', title: 'Update TripPlanner itinerary schema', labels: { role: 'schema-agent', hook: 'migration' } },
  { id: '3', title: 'BlogEngine tone check override', labels: { role: 'content-agent' } },
]

export const Default: Story = {
  args: {
    items: sampleItems,
    loading: false,
  },
}

export const Loading: Story = {
  args: {
    items: sampleItems.slice(0, 1),
    loading: true,
  },
}

export const Empty: Story = {
  args: {
    items: [],
    loading: false,
  },
}

export const SingleItem: Story = {
  args: {
    items: [sampleItems[0]],
    loading: false,
  },
}
