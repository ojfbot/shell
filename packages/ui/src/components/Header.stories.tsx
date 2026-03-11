import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Header } from './Header.js'
import type { ChatMessage } from './Header.js'

const noop = () => {}

const SAMPLE_MESSAGES: ChatMessage[] = [
  { role: 'user', content: 'What can I build with Frame OS?' },
  { role: 'assistant', content: 'Frame OS lets you compose micro-frontend apps into a unified shell. You can wire CV Builder, TripPlanner, BlogEngine, and more through a single agent-powered command bar.' },
]

const meta: Meta<typeof Header> = {
  title: 'Shell/Header',
  component: Header,
  parameters: { layout: 'fullscreen' },
  args: {
    activeAppType: 'cv-builder',
    activeInstanceId: 'i1',
    isStreaming: false,
    messages: [],
    error: null,
    lastDomain: null,
    frameAgentUrl: 'http://localhost:4001',
    onSendMessage: noop,
    onClearChat: noop,
  },
}

export default meta
type Story = StoryObj<typeof Header>

export const Default: Story = {}

export const WithActiveApp: Story = {
  args: {
    activeAppType: 'tripplanner',
    activeInstanceId: 'i2',
  },
}

export const NoActiveApp: Story = {
  args: {
    activeAppType: null,
    activeInstanceId: null,
  },
}

export const Streaming: Story = {
  args: {
    isStreaming: true,
    messages: [{ role: 'user', content: 'Tell me about Frame OS' }],
  },
}

export const WithMessages: Story = {
  args: {
    messages: SAMPLE_MESSAGES,
    lastDomain: 'frame-os',
  },
  render: (args) => {
    const [show] = useState(true)
    // Force showChat=true by pre-populating messages; user can interact
    return (
      <div style={{ background: 'var(--cds-layer-01, #f4f4f4)', padding: '1rem', minHeight: 400 }}>
        <Header {...args} />
        {show && <p style={{ marginTop: '1rem', fontSize: 12, color: '#666' }}>Focus the input then type to interact.</p>}
      </div>
    )
  },
}

export const WithError: Story = {
  args: {
    messages: [{ role: 'user', content: 'Are you there?' }],
    error: 'Failed to reach frame-agent',
    isStreaming: false,
  },
}

export const AgentOffline: Story = {
  args: {
    frameAgentUrl: '',
    activeAppType: null,
    activeInstanceId: null,
  },
}

export const WithDomainBadge: Story = {
  args: {
    lastDomain: 'cv-builder',
    messages: SAMPLE_MESSAGES,
  },
}
