import type { Meta, StoryObj } from '@storybook/react'
import { ChatHistoryOverlay } from './ChatHistoryOverlay'

const meta: Meta<typeof ChatHistoryOverlay> = {
  title: 'Components/ChatHistoryOverlay',
  component: ChatHistoryOverlay,
  argTypes: {
    onClearChat: { action: 'clear-chat' },
    onClose: { action: 'close' },
  },
}

export default meta
type Story = StoryObj<typeof ChatHistoryOverlay>

export const Default: Story = {
  args: {
    messages: [
      { role: 'user', content: 'Plan a trip to Berlin' },
      { role: 'assistant', content: 'I\'ll help you plan a trip to Berlin. Let me check available dates and create an itinerary.' },
    ],
    isStreaming: false,
    error: null,
  },
}

export const Streaming: Story = {
  args: {
    messages: [
      { role: 'user', content: 'What resume template fits a senior engineer?' },
    ],
    isStreaming: true,
    error: null,
  },
}

export const WithError: Story = {
  args: {
    messages: [
      { role: 'user', content: 'Generate a blog post' },
    ],
    isStreaming: false,
    error: 'Failed to connect to frame-agent',
  },
}

export const LongConversation: Story = {
  args: {
    messages: [
      { role: 'user', content: 'Help me with my resume' },
      { role: 'assistant', content: 'I\'d be happy to help. What role are you targeting?' },
      { role: 'user', content: 'Software Engineer at a developer tools company' },
      { role: 'assistant', content: 'Great choice. Let me review your current resume and suggest improvements for dev tools roles.' },
      { role: 'user', content: 'Focus on my CLI and extension work' },
      { role: 'assistant', content: 'I\'ve highlighted your CLI tooling experience and VS Code extension development. The updated resume emphasizes developer productivity impact.' },
    ],
    isStreaming: false,
    error: null,
  },
}
