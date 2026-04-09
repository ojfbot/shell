import type { Meta, StoryObj } from '@storybook/react'
import { HeaderInput } from './HeaderInput'

const meta: Meta<typeof HeaderInput> = {
  title: 'Components/HeaderInput',
  component: HeaderInput,
  argTypes: {
    onChange: { action: 'changed' },
    onSubmit: { action: 'submitted' },
    onEscape: { action: 'escaped' },
    onFocus: { action: 'focused' },
    onBlur: { action: 'blurred' },
  },
}

export default meta
type Story = StoryObj<typeof HeaderInput>

export const Default: Story = {
  args: {
    value: '',
    placeholder: 'Ask anything (⌘K)',
    disabled: false,
    isStreaming: false,
  },
}

export const WithContent: Story = {
  args: {
    ...Default.args,
    value: 'Build me a trip itinerary for Berlin',
  },
}

export const Streaming: Story = {
  args: {
    ...Default.args,
    value: 'What resume template should I use?',
    isStreaming: true,
  },
}

export const Disabled: Story = {
  args: {
    ...Default.args,
    placeholder: 'Agent offline — demo mode',
    disabled: true,
  },
}
