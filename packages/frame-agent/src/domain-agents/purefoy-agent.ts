import { BaseAgent, type AgentMessage } from '@ojfbot/agent-core'

export interface PurefoyContext {
  instanceId?: string
  threadId?: string | null
}

export class PurefoyDomainAgent extends BaseAgent {
  constructor(
    apiKey: string,
    private purefoyApiUrl: string
  ) {
    super(apiKey, 'PurefoyDomain')
  }

  protected getSystemPrompt(): string {
    return `You are the Purefoy Domain Agent within the Frame OS.

You handle queries directed to the Purefoy sub-application. Respond based on available knowledge.

When asked questions you cannot fully answer without live data from the Purefoy service,
acknowledge the limitation clearly and describe what would be available once the service responds.`
  }

  async processMessage(
    message: string,
    history: AgentMessage[],
    _context: PurefoyContext
  ): Promise<string> {
    this.setConversationHistory(history)
    return this.chat(message)
  }

  async streamMessage(
    message: string,
    history: AgentMessage[],
    _context: PurefoyContext,
    onChunk: (text: string) => void
  ): Promise<string> {
    this.setConversationHistory(history)
    return this.streamChat(message, onChunk)
  }

  getTools() {
    return [
      { name: 'cinematography_query', description: 'Answer questions within the Purefoy domain' },
    ]
  }
}
