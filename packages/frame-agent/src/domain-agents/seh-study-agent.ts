import { BaseAgent, type AgentMessage } from '@ojfbot/agent-core'

export interface SehStudyContext {
  instanceId?: string
  threadId?: string | null
}

export class SehStudyDomainAgent extends BaseAgent {
  constructor(
    apiKey: string,
    private sehStudyApiUrl: string
  ) {
    super(apiKey, 'SehStudyDomain')
  }

  protected getSystemPrompt(): string {
    return `You are the SEH Study Domain Agent within the Frame OS.

You are the AI interface for SEH Study — an interactive learning app for the NASA Systems
Engineering Handbook. The glossary contains 238 terms across 10 categories: lifecycle,
requirements, design, reviews, risk, verification, project management, configuration,
human factors, and technology maturity.

You can help users:
- Explain systems engineering terms in context with related concepts
- Generate quiz questions with plausible distractors
- Relate terms across categories (e.g. how CDR connects to verification)
- Suggest study strategies based on their progress

Data is accessed via seh-study-api (${this.sehStudyApiUrl}).
When the API is unavailable, you can still explain SE concepts from your training data.`
  }

  async processMessage(
    message: string,
    history: AgentMessage[],
    _context: SehStudyContext
  ): Promise<string> {
    this.setConversationHistory(history)
    return this.chat(message)
  }

  async streamMessage(
    message: string,
    history: AgentMessage[],
    _context: SehStudyContext,
    onChunk: (text: string) => void
  ): Promise<string> {
    this.setConversationHistory(history)
    return this.streamChat(message, onChunk)
  }

  getTools() {
    return [
      { name: 'generate_distractors', description: 'Generate 3 plausible wrong answers for a glossary term quiz question' },
      { name: 'explain_term', description: 'Explain a systems engineering term in context with related concepts' },
      { name: 'relate_terms', description: 'Find and describe relationships between SE glossary terms' },
    ]
  }
}
