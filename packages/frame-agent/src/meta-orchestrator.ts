import { BaseAgent, type AgentMessage } from '@ojfbot/agent-core'
import { CvBuilderDomainAgent } from './domain-agents/cv-builder-agent.js'
import { BlogEngineDomainAgent } from './domain-agents/blogengine-agent.js'
import { TripPlannerDomainAgent } from './domain-agents/tripplanner-agent.js'

export type DomainType = 'cv-builder' | 'blogengine' | 'tripplanner' | 'purefoy' | 'cross-domain'

export interface SubAppUrls {
  cvBuilderApi: string
  blogEngineApi: string
  tripPlannerApi: string
}

export interface RoutingContext {
  activeAppType?: DomainType
  instanceId?: string
  threadId?: string | null
}

export interface FrameAgentResponse {
  content: string
  domain: DomainType
  handledBy: string
  conversationHistory: AgentMessage[]
  suggestions?: unknown[]
}

export class MetaOrchestratorAgent extends BaseAgent {
  private cvBuilder: CvBuilderDomainAgent
  private blogEngine: BlogEngineDomainAgent
  private tripPlanner: TripPlannerDomainAgent

  constructor(apiKey: string, private subAppUrls: SubAppUrls) {
    super(apiKey, 'MetaOrchestrator')
    this.cvBuilder = new CvBuilderDomainAgent(apiKey, subAppUrls.cvBuilderApi)
    this.blogEngine = new BlogEngineDomainAgent(apiKey, subAppUrls.blogEngineApi)
    this.tripPlanner = new TripPlannerDomainAgent(apiKey, subAppUrls.tripPlannerApi)
  }

  protected getSystemPrompt(): string {
    return `You are the Frame Agent — the unified AI gateway for the ojfbot Frame OS.

The Frame OS is an AI application platform that composes multiple sub-applications into a single interface,
analogous to how a browser composes multiple web apps — but natively AI-first.

You coordinate four sub-applications:
- **cv-builder**: resume building, job applications, career development, tailoring resumes to job descriptions, skills gap analysis, cover letters, interview preparation
- **blogengine**: blog post drafting and editing, publishing pipeline, Notion integration, podcast content generation, content strategy
- **tripplanner**: trip itinerary planning, destination research, budget tracking, accommodation and transport booking, ChatGPT transcript import
- **purefoy**: Roger Deakins cinematography knowledge base, film lighting analysis, personal creative projects

## Classification Rules

You classify which domain should handle each message. Rules in priority order:

1. **User's active app context**: If the user has a specific app open (provided in context), default to routing there UNLESS the message clearly belongs elsewhere.
2. **Explicit domain keywords**:
   - "resume", "CV", "job", "interview", "tailor", "skills gap", "cover letter" → cv-builder
   - "blog", "post", "draft", "publish", "Notion", "podcast", "episode" → blogengine
   - "trip", "itinerary", "hotel", "flight", "destination", "travel", "book" → tripplanner
   - "Deakins", "cinematography", "lighting", "film", "Roger", "lens" → purefoy
3. **Cross-domain requests**: If a request clearly spans multiple domains (e.g., "find Tokyo jobs near my trip dates"), route as cross-domain and coordinate both agents.
4. **Ambiguous messages** ("help", "what can you do", no clear domain): Respond with a capability overview of all four apps.

## Your Role

You are NOT a domain expert yourself — you route to the right domain agent who handles the actual task.
For simple routing decisions, classify quickly and delegate. You only handle the response directly for:
- Capability queries
- Cross-domain coordination (you synthesize responses from multiple agents)
- Errors or unavailable services

## Tone

Confident, efficient, and context-aware. You are the control layer of a power user's AI workspace.`
  }

  async route(
    message: string,
    context: RoutingContext,
    history: AgentMessage[]
  ): Promise<FrameAgentResponse> {
    const domain = await this.classify(message, context.activeAppType)

    let content: string
    let handledBy: string

    switch (domain) {
      case 'cv-builder':
        content = await this.cvBuilder.processMessage(message, history, context)
        handledBy = 'CvBuilderDomainAgent'
        break
      case 'blogengine':
        content = await this.blogEngine.processMessage(message, history, context)
        handledBy = 'BlogEngineDomainAgent'
        break
      case 'tripplanner':
        content = await this.tripPlanner.processMessage(message, history, context)
        handledBy = 'TripPlannerDomainAgent'
        break
      case 'cross-domain':
        content = await this.handleCrossDomain(message, history, context)
        handledBy = 'MetaOrchestratorAgent'
        break
      default:
        // purefoy or unclassified — handle with meta orchestrator system prompt
        this.setConversationHistory(history)
        content = await this.chat(message)
        handledBy = 'MetaOrchestratorAgent'
    }

    const conversationHistory = domain === 'cv-builder'
      ? this.cvBuilder.getConversationHistory()
      : domain === 'blogengine'
      ? this.blogEngine.getConversationHistory()
      : domain === 'tripplanner'
      ? this.tripPlanner.getConversationHistory()
      : this.getConversationHistory()

    return { content, domain, handledBy, conversationHistory }
  }

  async routeStream(
    message: string,
    context: RoutingContext,
    history: AgentMessage[],
    onChunk: (text: string) => void
  ): Promise<FrameAgentResponse> {
    const domain = await this.classify(message, context.activeAppType)

    let content: string
    let handledBy: string

    switch (domain) {
      case 'cv-builder':
        content = await this.cvBuilder.streamMessage(message, history, context, onChunk)
        handledBy = 'CvBuilderDomainAgent'
        break
      case 'blogengine':
        content = await this.blogEngine.streamMessage(message, history, context, onChunk)
        handledBy = 'BlogEngineDomainAgent'
        break
      case 'tripplanner':
        content = await this.tripPlanner.streamMessage(message, history, context, onChunk)
        handledBy = 'TripPlannerDomainAgent'
        break
      default:
        this.setConversationHistory(history)
        content = await this.streamChat(message, onChunk)
        handledBy = 'MetaOrchestratorAgent'
    }

    const conversationHistory = domain === 'cv-builder'
      ? this.cvBuilder.getConversationHistory()
      : domain === 'blogengine'
      ? this.blogEngine.getConversationHistory()
      : domain === 'tripplanner'
      ? this.tripPlanner.getConversationHistory()
      : this.getConversationHistory()

    return { content, domain, handledBy, conversationHistory }
  }

  // Lightweight classification — uses a separate Anthropic call so it doesn't pollute
  // the main conversation history of any domain agent
  private async classify(message: string, activeAppType?: DomainType): Promise<DomainType> {
    // Fast-path: if context says which app is active and message is short/ambiguous, stay there
    if (activeAppType && activeAppType !== 'cross-domain' && message.length < 200) {
      const lowerMsg = message.toLowerCase()
      // Only override context if there's a very strong signal to a different domain
      if (
        !this.hasCrossDomainSignal(lowerMsg) &&
        !this.hasStrongDomainSignal(lowerMsg, activeAppType)
      ) {
        return activeAppType
      }
    }

    // Use a lightweight Claude call for classification
    const classifyPrompt = `Classify which ojfbot Frame OS domain should handle this user message.
Domains: cv-builder, blogengine, tripplanner, purefoy, cross-domain
Active app context: ${activeAppType ?? 'none'}
User message: "${message}"
Respond with ONLY the domain name, nothing else.`

    const tempClient = new (await import('@anthropic-ai/sdk')).default({ apiKey: this.apiKey })
    const response = await tempClient.messages.create({
      model: this.model,
      max_tokens: 20,
      messages: [{ role: 'user', content: classifyPrompt }],
    })

    const classification = response.content
      .filter(b => b.type === 'text')
      .map(b => ('text' in b ? b.text.trim().toLowerCase() : ''))
      .join('')

    const validDomains: DomainType[] = ['cv-builder', 'blogengine', 'tripplanner', 'purefoy', 'cross-domain']
    return validDomains.find(d => classification.includes(d)) ?? (activeAppType ?? 'cv-builder')
  }

  private hasCrossDomainSignal(msg: string): boolean {
    const crossPatterns = ['and also', 'as well as', 'both', 'across', 'combine', 'together']
    return crossPatterns.some(p => msg.includes(p))
  }

  private hasStrongDomainSignal(msg: string, currentDomain: DomainType): boolean {
    const domainSignals: Record<DomainType, string[]> = {
      'cv-builder': ['resume', 'cv', 'job', 'interview', 'cover letter', 'skills gap'],
      'blogengine': ['blog', 'post', 'draft', 'publish', 'notion', 'podcast'],
      'tripplanner': ['trip', 'itinerary', 'hotel', 'flight', 'destination', 'travel'],
      'purefoy': ['deakins', 'cinematography', 'lighting', 'film'],
      'cross-domain': [],
    }
    // Returns true only if signals point to a DIFFERENT domain than current
    for (const [domain, signals] of Object.entries(domainSignals)) {
      if (domain !== currentDomain && signals.some(s => msg.includes(s))) {
        return true
      }
    }
    return false
  }

  private async handleCrossDomain(
    message: string,
    history: AgentMessage[],
    _context: RoutingContext
  ): Promise<string> {
    this.setConversationHistory(history)
    // For cross-domain, use the meta-orchestrator's own knowledge to synthesize
    const response = await this.chat(
      `[Cross-domain request] Coordinate a response that spans multiple Frame OS sub-apps. User message: "${message}"`
    )
    return response
  }

  getToolManifest() {
    return {
      service: 'frame-agent',
      version: '0.1.0',
      domains: {
        'cv-builder': this.cvBuilder.getTools(),
        blogengine: this.blogEngine.getTools(),
        tripplanner: this.tripPlanner.getTools(),
        purefoy: [
          { name: 'cinematography_query', description: 'Answer questions about Roger Deakins cinematography and film techniques' },
        ],
      },
    }
  }
}
