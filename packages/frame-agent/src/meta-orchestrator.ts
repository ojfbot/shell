import { BaseAgent, type AgentMessage } from '@ojfbot/agent-core'
import { CvBuilderDomainAgent } from './domain-agents/cv-builder-agent.js'
import { BlogEngineDomainAgent } from './domain-agents/blogengine-agent.js'
import { TripPlannerDomainAgent } from './domain-agents/tripplanner-agent.js'
import { PurefoyDomainAgent } from './domain-agents/purefoy-agent.js'
import { DOMAIN_REGISTRY } from './domain-registry.js'

// 'meta' = MetaOrchestrator handles directly (capability queries, shell nav, unclassified)
export type DomainType = 'cv-builder' | 'blogengine' | 'tripplanner' | 'purefoy' | 'cross-domain' | 'meta'

export interface SubAppUrls {
  cvBuilderApi: string
  blogEngineApi: string
  tripPlannerApi: string
  purefoyApi: string
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

// Minimal tool shape — subset of ADR-0007 that classify() and the manifest need
interface DiscoveredTool {
  name: string
  description: string
}

interface DomainStatus {
  status: 'online' | 'offline'
  tools: DiscoveredTool[]
}

export class MetaOrchestratorAgent extends BaseAgent {
  private readonly urls: SubAppUrls
  private readonly cvBuilder: CvBuilderDomainAgent
  private readonly blogEngine: BlogEngineDomainAgent
  private readonly tripPlanner: TripPlannerDomainAgent
  private readonly purefoy: PurefoyDomainAgent

  // R8: populated by init() — empty until first init() call
  private readonly domainStatus = new Map<string, DomainStatus>()
  // R8: cached after init() — classify() uses this instead of rebuilding each call
  private cachedClassifyPrompt: string | null = null

  private static readonly INIT_TIMEOUT_MS = 2000

  constructor(apiKey: string, subAppUrls: SubAppUrls) {
    super(apiKey, 'MetaOrchestrator')
    this.urls = subAppUrls
    this.cvBuilder = new CvBuilderDomainAgent(apiKey, subAppUrls.cvBuilderApi)
    this.blogEngine = new BlogEngineDomainAgent(apiKey, subAppUrls.blogEngineApi)
    this.tripPlanner = new TripPlannerDomainAgent(apiKey, subAppUrls.tripPlannerApi)
    this.purefoy = new PurefoyDomainAgent(apiKey, subAppUrls.purefoyApi)
  }

  protected getSystemPrompt(): string {
    return `You are the Frame Agent — the unified AI gateway for the ojfbot Frame OS.

The Frame OS is an AI application platform that composes multiple sub-applications into a single interface,
analogous to how a browser composes multiple web apps — but natively AI-first.

You coordinate four sub-applications:
- **cv-builder**: resume building, job applications, career development, tailoring resumes to job descriptions, skills gap analysis, cover letters, interview preparation
- **blogengine**: blog post drafting and editing, publishing pipeline, Notion integration, podcast content generation, content strategy
- **tripplanner**: trip itinerary planning, destination research, budget tracking, accommodation and transport booking, ChatGPT transcript import
- **purefoy**: creative and knowledge projects (purefoy domain)

## Classification Rules

You classify which domain should handle each message. Rules in priority order:

1. **User's active app context**: If the user has a specific app open (provided in context), default to routing there UNLESS the message clearly belongs elsewhere.
2. **Explicit domain keywords**: route to the matching domain.
3. **Cross-domain requests**: If a request clearly spans multiple domains (e.g., "find Tokyo jobs near my trip dates"), route as cross-domain and coordinate both agents.
4. **Ambiguous or navigational messages** ("help", "what can you do", shell UI questions): Respond with a capability overview of all four apps.

## Your Role

You are NOT a domain expert yourself — you route to the right domain agent who handles the actual task.
You only handle the response directly for:
- Capability queries and shell navigation questions
- Cross-domain coordination (you synthesize responses from multiple agents)
- Errors or unavailable services

## Tone

Confident, efficient, and context-aware. You are the control layer of a power user's AI workspace.`
  }

  // R8: fetch GET /api/tools from each sub-app; populate domainStatus; cache classify prompt.
  // Falls back to static stubs on timeout or HTTP error — server never fails to start.
  async init(): Promise<void> {
    const targets: Array<{ id: DomainType; url: string }> = [
      { id: 'cv-builder',  url: this.urls.cvBuilderApi },
      { id: 'blogengine',  url: this.urls.blogEngineApi },
      { id: 'tripplanner', url: this.urls.tripPlannerApi },
      { id: 'purefoy',     url: this.urls.purefoyApi },
    ]

    await Promise.all(targets.map(async ({ id, url }) => {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), MetaOrchestratorAgent.INIT_TIMEOUT_MS)
      try {
        const res = await fetch(`${url}/api/tools`, { signal: controller.signal })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const manifest = await res.json() as { tools?: DiscoveredTool[] }
        const tools = manifest.tools ?? this.getDomainStubs(id)
        this.domainStatus.set(id, { status: 'online', tools })
        console.log(`frame-agent [init]: ${id} — ${tools.length} tools discovered`)
      } catch (err) {
        const stubs = this.getDomainStubs(id)
        this.domainStatus.set(id, { status: 'offline', tools: stubs })
        const reason = err instanceof Error ? err.message : String(err)
        console.warn(`frame-agent [init]: ${id} unreachable (${reason}) — using ${stubs.length} stubs`)
      } finally {
        clearTimeout(timeout)
      }
    }))

    this.cachedClassifyPrompt = this.buildClassifyToolContext()
    console.log('frame-agent [init]: dynamic tool discovery complete')
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
      case 'purefoy':
        content = await this.purefoy.processMessage(message, history, context)
        handledBy = 'PurefoyDomainAgent'
        break
      case 'cross-domain':
        content = await this.handleCrossDomain(message, history, context)
        handledBy = 'MetaOrchestratorAgent'
        break
      default:
        // 'meta' — capability queries, shell navigation, unclassified
        this.setConversationHistory(history)
        content = await this.chat(message)
        handledBy = 'MetaOrchestratorAgent'
    }

    return { content, domain, handledBy, conversationHistory: this.historyFor(domain) }
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
      case 'purefoy':
        content = await this.purefoy.streamMessage(message, history, context, onChunk)
        handledBy = 'PurefoyDomainAgent'
        break
      case 'cross-domain':
        content = await this.handleCrossDomainStream(message, history, context, onChunk)
        handledBy = 'MetaOrchestratorAgent'
        break
      default:
        // 'meta' — capability queries, shell navigation, unclassified
        this.setConversationHistory(history)
        content = await this.streamChat(message, onChunk)
        handledBy = 'MetaOrchestratorAgent'
    }

    return { content, domain, handledBy, conversationHistory: this.historyFor(domain) }
  }

  // Lightweight classification — separate Anthropic call; never pollutes domain agent history
  private async classify(message: string, activeAppType?: DomainType): Promise<DomainType> {
    const lowerMsg = message.toLowerCase().trim()

    // R5: empty message → capability overview
    if (!lowerMsg) return 'meta'

    // R6: shell UI navigation questions
    const shellPatterns = ['how do i', 'how to open', 'new instance', 'switch to', 'how does frame', 'what is frame', 'open a new']
    if (shellPatterns.some(p => lowerMsg.includes(p))) return 'meta'

    // R5: generic capability queries
    if (/^(help|hi|hello|hey|what can you do|what are you|capabilities?)\??$/.test(lowerMsg)) return 'meta'

    // Fast-path: active app context + short message → stay in domain unless strong override signal
    if (activeAppType && activeAppType !== 'cross-domain' && activeAppType !== 'meta' && message.length < 200) {
      if (!this.hasCrossDomainSignal(lowerMsg) && !this.hasStrongDomainSignal(lowerMsg, activeAppType)) {
        return activeAppType
      }
    }

    // R4+R8: use cached post-init prompt if available, else build from static stubs
    const toolContext = this.cachedClassifyPrompt ?? this.buildClassifyToolContext()

    const classifyPrompt = `Classify which ojfbot Frame OS domain should handle this user message.
Domains and their tools:
${toolContext}

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

    const validDomains: DomainType[] = ['cv-builder', 'blogengine', 'tripplanner', 'purefoy', 'cross-domain', 'meta']
    return validDomains.find(d => classification.includes(d)) ?? (activeAppType ?? 'meta')
  }

  private hasCrossDomainSignal(msg: string): boolean {
    const crossPatterns = ['and also', 'as well as', 'both', 'across', 'combine', 'together']
    return crossPatterns.some(p => msg.includes(p))
  }

  // R7+R8: uses DOMAIN_REGISTRY — single source of truth for fast-path signals
  private hasStrongDomainSignal(msg: string, currentDomain: DomainType): boolean {
    for (const config of DOMAIN_REGISTRY) {
      if (config.id !== currentDomain && config.keywords.some(s => msg.includes(s))) {
        return true
      }
    }
    return false
  }

  // R3+R8: detect which specific domains are signalled for cross-domain fan-out
  private detectInvolvedDomains(message: string): DomainType[] {
    const lowerMsg = message.toLowerCase()
    return DOMAIN_REGISTRY
      .filter(config => config.keywords.some(s => lowerMsg.includes(s)))
      .map(config => config.id as DomainType)
  }

  // R8: tool lists from discovered data (post-init) or static stubs (pre-init / offline)
  private getDomainStubs(id: DomainType): DiscoveredTool[] {
    switch (id) {
      case 'cv-builder': return this.cvBuilder.getTools()
      case 'blogengine': return this.blogEngine.getTools()
      case 'tripplanner': return this.tripPlanner.getTools()
      case 'purefoy': return this.purefoy.getTools()
      default: return []
    }
  }

  // R4+R8: build the tool context string for the classify prompt
  private buildClassifyToolContext(): string {
    const domainOrder: DomainType[] = ['cv-builder', 'blogengine', 'tripplanner', 'purefoy']
    const lines = domainOrder.map(id => {
      const tools = this.domainStatus.get(id)?.tools ?? this.getDomainStubs(id)
      return `${id} — ${tools.map(t => t.name).join(', ')}`
    })
    lines.push('cross-domain — request clearly spans two or more of the above')
    lines.push('meta — shell navigation, capability questions, or cannot determine domain')
    return lines.join('\n')
  }

  private historyFor(domain: DomainType): AgentMessage[] {
    switch (domain) {
      case 'cv-builder': return this.cvBuilder.getConversationHistory()
      case 'blogengine': return this.blogEngine.getConversationHistory()
      case 'tripplanner': return this.tripPlanner.getConversationHistory()
      case 'purefoy': return this.purefoy.getConversationHistory()
      default: return this.getConversationHistory()
    }
  }

  // R3: fan out to all involved domain agents in parallel
  private async fanOut(
    involved: DomainType[],
    message: string,
    history: AgentMessage[],
    context: RoutingContext
  ): Promise<Array<{ domain: DomainType; response: string }>> {
    return Promise.all(involved.map(async domain => {
      let response = ''
      switch (domain) {
        case 'cv-builder': response = await this.cvBuilder.processMessage(message, history, context); break
        case 'blogengine': response = await this.blogEngine.processMessage(message, history, context); break
        case 'tripplanner': response = await this.tripPlanner.processMessage(message, history, context); break
        case 'purefoy': response = await this.purefoy.processMessage(message, history, context); break
      }
      return { domain, response }
    }))
  }

  private buildSynthesisPrompt(message: string, results: Array<{ domain: DomainType; response: string }>): string {
    const domainResponses = results.map(r => `**${r.domain}**:\n${r.response}`).join('\n\n---\n\n')
    return (
      `Synthesize these domain expert responses into one coherent, integrated answer. ` +
      `Do not list them separately — weave the insights together.\n\n` +
      `User asked: "${message}"\n\n${domainResponses}`
    )
  }

  // R3: real cross-domain fan-out (non-streaming)
  private async handleCrossDomain(
    message: string,
    history: AgentMessage[],
    context: RoutingContext
  ): Promise<string> {
    const involved = this.detectInvolvedDomains(message)
    if (involved.length < 2) {
      this.setConversationHistory(history)
      return this.chat(`[Cross-domain request] ${message}`)
    }
    const results = await this.fanOut(involved, message, history, context)
    this.setConversationHistory(history)
    return this.chat(this.buildSynthesisPrompt(message, results))
  }

  // R2+R3: real cross-domain fan-out (streaming — domains non-streaming, synthesis streamed)
  private async handleCrossDomainStream(
    message: string,
    history: AgentMessage[],
    context: RoutingContext,
    onChunk: (text: string) => void
  ): Promise<string> {
    const involved = this.detectInvolvedDomains(message)
    if (involved.length < 2) {
      this.setConversationHistory(history)
      return this.streamChat(`[Cross-domain request] ${message}`, onChunk)
    }
    const results = await this.fanOut(involved, message, history, context)
    this.setConversationHistory(history)
    return this.streamChat(this.buildSynthesisPrompt(message, results), onChunk)
  }

  // R9: per-domain online/offline status populated by init()
  getToolManifest() {
    const domainEntry = (id: DomainType) => {
      const status = this.domainStatus.get(id)
      return {
        status: status ? status.status : 'pending discovery',
        tools: status?.tools ?? this.getDomainStubs(id),
      }
    }
    return {
      service: 'frame-agent',
      version: '0.1.0',
      domains: {
        'cv-builder': domainEntry('cv-builder'),
        blogengine: domainEntry('blogengine'),
        tripplanner: domainEntry('tripplanner'),
        purefoy: domainEntry('purefoy'),
      },
    }
  }
}
