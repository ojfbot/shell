import Anthropic from '@anthropic-ai/sdk'

export interface AgentMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AgentMetadata {
  agent: string
  timestamp: string
  tokens?: number
}

export abstract class BaseAgent {
  protected client: Anthropic
  protected conversationHistory: AgentMessage[] = []

  constructor(
    protected apiKey: string,
    protected agentName: string,
    protected model: string = 'claude-sonnet-4-20250514'
  ) {
    // Agents run server-side only — API keys are never exposed to the browser
    this.client = new Anthropic({ apiKey })
  }

  protected abstract getSystemPrompt(): string

  protected async chat(
    userMessage: string,
    options?: {
      stream?: boolean
      maxTokens?: number
    }
  ): Promise<string> {
    this.conversationHistory.push({ role: 'user', content: userMessage })

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: options?.maxTokens || 4096,
      system: this.getSystemPrompt(),
      messages: this.conversationHistory,
      stream: options?.stream || false,
    })

    if ('content' in response) {
      const assistantMessage = response.content
        .filter((block) => block.type === 'text')
        .map((block) => ('text' in block ? block.text : ''))
        .join('')

      this.conversationHistory.push({ role: 'assistant', content: assistantMessage })
      return assistantMessage
    }

    throw new Error('Unexpected response format')
  }

  protected async streamChat(
    userMessage: string,
    onChunk: (text: string) => void
  ): Promise<string> {
    this.conversationHistory.push({ role: 'user', content: userMessage })

    const stream = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: this.getSystemPrompt(),
      messages: this.conversationHistory,
      stream: true,
    })

    let fullResponse = ''

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const text = event.delta.text
        fullResponse += text
        onChunk(text)
      }
    }

    this.conversationHistory.push({ role: 'assistant', content: fullResponse })
    return fullResponse
  }

  clearHistory(): void {
    this.conversationHistory = []
  }

  getHistory(): AgentMessage[] {
    return [...this.conversationHistory]
  }

  setHistory(history: AgentMessage[]): void {
    this.conversationHistory = [...history]
  }

  getConversationHistory(): AgentMessage[] {
    return this.getHistory()
  }

  setConversationHistory(history: AgentMessage[]): void {
    this.setHistory(history)
  }
}
