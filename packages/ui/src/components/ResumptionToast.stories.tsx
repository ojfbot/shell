import type { Meta, StoryObj } from '@storybook/react'
import { ResumptionToast } from './ResumptionToast'

const meta: Meta<typeof ResumptionToast> = {
  title: 'Components/ResumptionToast',
  component: ResumptionToast,
  argTypes: {
    onSuggestionClick: { action: 'suggestion clicked' },
    onDismiss: { action: 'dismissed' },
  },
}

export default meta
type Story = StoryObj<typeof ResumptionToast>

export const Default: Story = {
  args: {
    summary: 'Last time you were working on your Berlin trip itinerary — you had flights booked and were comparing hotel options near Alexanderplatz.',
    suggestions: [
      'Show me the hotel comparison',
      'Update my flight details',
      'Continue planning',
    ],
  },
}

export const NoSuggestions: Story = {
  args: {
    summary: 'You were reviewing resume feedback from the agent.',
    suggestions: [],
  },
}

export const SingleSuggestion: Story = {
  args: {
    summary: 'Your blog post draft was at 80% — the agent suggested adding a conclusion.',
    suggestions: ['Continue writing'],
  },
}
