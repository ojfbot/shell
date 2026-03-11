import type { Meta, StoryObj } from '@storybook/react'
import { Header } from './Header.js'
import type { ChatMessage } from './Header.js'

const SAMPLE_MESSAGES: ChatMessage[] = [
  { role: 'user', content: 'What can I build with Frame OS?' },
  { role: 'assistant', content: 'Frame OS lets you compose micro-frontend apps into a unified shell. You can wire Resume Builder, TripPlanner, BlogEngine, and more through a single agent-powered command bar.' },
]

const noop = () => {}

const meta: Meta<typeof Header> = {
  title: 'Shell/Header',
  component: Header,
  parameters: { layout: 'padded' },
  args: {
    agentAvailable: true,
    isStreaming: false,
    messages: [],
    error: null,
    lastDomainLabel: null,
    onSubmit: noop,
    onClearChat: noop,
  },
}

export default meta
type Story = StoryObj<typeof Header>

export const Default: Story = {
  args: {
    activeAppLabel: null,
  },
}

export const WithActiveApp: Story = {
  args: {
    activeAppLabel: 'CV Builder',
  },
}

export const AgentOffline: Story = {
  args: {
    activeAppLabel: null,
    agentAvailable: false,
  },
}

export const Streaming: Story = {
  args: {
    activeAppLabel: 'TripPlanner',
    isStreaming: true,
    messages: SAMPLE_MESSAGES,
  },
}

export const WithChatHistory: Story = {
  args: {
    activeAppLabel: 'CV Builder',
    messages: SAMPLE_MESSAGES,
    lastDomainLabel: 'CV Builder',
  },
}

export const WithError: Story = {
  args: {
    activeAppLabel: 'BlogEngine',
    messages: [
      ...SAMPLE_MESSAGES,
    ],
    error: 'Frame agent timed out after 30s',
    lastDomainLabel: 'BlogEngine',
  },
}
