import { BaseAgent, type AgentMessage } from '@ojfbot/agent-core'
import { ResumeBuilderDomainAgent } from './domain-agents/resume-builder-agent.js'
import { BlogEngineDomainAgent } from './domain-agents/blogengine-agent.js'
import { TripPlannerDomainAgent } from './domain-agents/tripplanner-agent.js'
import { PurefoyDomainAgent } from './domain-agents/purefoy-agent.js'
import { GasTownPilotDomainAgent } from './domain-agents/gastown-pilot-agent.js'
import { SehStudyDomainAgent } from './domain-agents/seh-study-agent.js'
import { DOMAIN_REGISTRY } from './domain-registry.js'

// 'meta' = MetaOrchestrator handles directly (capability queries, shell nav, unclassified)
export type DomainType = 'resume-builder' | 'blogengine' | 'tripplanner' | 'purefoy' | 'lean-canvas' | 'gastown-pilot' | 'seh-study' | 'cross-domain' | 'meta'

export interface SpawnInstanceAction {
  type: 'spawn_instance'
  appType: DomainType
  instanceName: string
}

export interface FocusInstanceAction {
  type: 'focus_instance'
  appType: DomainType
  instanceId: string
}

export type InstanceAction = SpawnInstanceAction | FocusInstanceAction

export interface SubAppUrls {
  resumeBuilderApi: string
  blogEngineApi: string
  tripPlannerApi: string
  purefoyApi: string
  gastownPilotApi: string
  sehStudyApi: string
}

/** Minimal instance summary passed from the shell for spawn-vs-focus matching. */
export interface InstanceSummary {
  id: string
  appType: string
  name: string
}

export interface RoutingContext {
  activeAppType?: DomainType
  instanceId?: string
  threadId?: string | null
  /** Current instance list — used by detectAction() to decide spawn vs. focus. */
  instances?: InstanceSummary[]
}

export interface FrameAgentResponse {
  content: string
  domain: DomainType
  handledBy: string
  conversationHistory: AgentMessage[]
  suggestions?: unknown[]
  action?: InstanceAction
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
  private readonly resumeBuilder: ResumeBuilderDomainAgent
  private readonly blogEngine: BlogEngineDomainAgent
  private readonly tripPlanner: TripPlannerDomainAgent
  private readonly purefoy: PurefoyDomainAgent
  private readonly gastownPilot: GasTownPilotDomainAgent
  private readonly sehStudy: SehStudyDomainAgent

  // R8: populated by init() — empty until first init() call
  private readonly domainStatus = new Map<string, DomainStatus>()
  // R8: cached after init() — classify() uses this instead of rebuilding each call
  private cachedClassifyPrompt: string | null = null

  private static readonly INIT_TIMEOUT_MS = 2000

  constructor(apiKey: string, subAppUrls: SubAppUrls) {
    super(apiKey, 'MetaOrchestrator')
    this.urls = subAppUrls
    this.resumeBuilder = new ResumeBuilderDomainAgent(apiKey, subAppUrls.resumeBuilderApi)
    this.blogEngine = new BlogEngineDomainAgent(apiKey, subAppUrls.blogEngineApi)
    this.tripPlanner = new TripPlannerDomainAgent(apiKey, subAppUrls.tripPlannerApi)
    this.purefoy = new PurefoyDomainAgent(apiKey, subAppUrls.purefoyApi)
    this.gastownPilot = new GasTownPilotDomainAgent(apiKey, subAppUrls.gastownPilotApi)
    this.sehStudy = new SehStudyDomainAgent(apiKey, subAppUrls.sehStudyApi)
  }

  protected getSystemPrompt(): string {
    return `You are the Frame Agent — the unified AI gateway for the ojfbot Frame OS.

The Frame OS is an AI application platform that composes multiple sub-applications into a single interface,
analogous to how a browser composes multiple web apps — but natively AI-first.

You coordinate four sub-applications:
- **resume-builder**: resume building, job applications, career development, tailoring resumes to job descriptions, skills gap analysis, cover letters, interview preparation
- **blogengine**: blog post drafting and editing, publishing pipeline, Notion integration, podcast content generation, content strategy
- **tripplanner**: trip itinerary planning, destination research, budget tracking, accommodation and transport booking, ChatGPT transcript import
- **purefoy**: creative and knowledge projects (purefoy domain)
- **gastown-pilot**: multi-agent coordination, observability, rigs, convoys, beads, formulas, wasteland federation
- **seh-study**: NASA Systems Engineering Handbook flashcards, quizzes, spaced repetition, glossary terms

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
      { id: 'resume-builder', url: this.urls.resumeBuilderApi },
      { id: 'blogengine',     url: this.urls.blogEngineApi },
      { id: 'tripplanner',    url: this.urls.tripPlannerApi },
      { id: 'purefoy',        url: this.urls.purefoyApi },
      { id: 'gastown-pilot',  url: this.urls.gastownPilotApi },
      { id: 'seh-study',      url: this.urls.sehStudyApi },
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
    // Detect instance action in parallel with classify — no extra latency on the happy path
    const [domain, action] = await Promise.all([
      this.classify(message, context.activeAppType),
      this.detectAction(message, context.instances),
    ])

    let content: string
    let handledBy: string

    switch (domain) {
      case 'resume-builder':
        content = await this.resumeBuilder.processMessage(message, history, context)
        handledBy = 'ResumeBuilderDomainAgent'
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
      case 'gastown-pilot':
        content = await this.gastownPilot.processMessage(message, history, context)
        handledBy = 'GasTownPilotDomainAgent'
        break
      case 'seh-study':
        content = await this.sehStudy.processMessage(message, history, context)
        handledBy = 'SehStudyDomainAgent'
        break
      case 'cross-domain':
        content = await this.handleCrossDomain(message, history, context)
        handledBy = 'MetaOrchestratorAgent'
        return {
          content, domain, handledBy,
          conversationHistory: [...history, { role: 'user', content: message }, { role: 'assistant', content }],
          ...(action ? { action } : {}),
        }
      default:
        this.setConversationHistory(history)
        content = await this.chat(message)
        handledBy = 'MetaOrchestratorAgent'
    }

    return {
      content, domain, handledBy,
      conversationHistory: this.historyFor(domain),
      ...(action ? { action } : {}),
    }
  }

  async routeStream(
    message: string,
    context: RoutingContext,
    history: AgentMessage[],
    onChunk: (text: string) => void
  ): Promise<FrameAgentResponse> {
    const [domain, action] = await Promise.all([
      this.classify(message, context.activeAppType),
      this.detectAction(message, context.instances),
    ])

    let content: string
    let handledBy: string

    switch (domain) {
      case 'resume-builder':
        content = await this.resumeBuilder.streamMessage(message, history, context, onChunk)
        handledBy = 'ResumeBuilderDomainAgent'
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
      case 'gastown-pilot':
        content = await this.gastownPilot.streamMessage(message, history, context, onChunk)
        handledBy = 'GasTownPilotDomainAgent'
        break
      case 'seh-study':
        content = await this.sehStudy.streamMessage(message, history, context, onChunk)
        handledBy = 'SehStudyDomainAgent'
        break
      case 'cross-domain':
        content = await this.handleCrossDomainStream(message, history, context, onChunk)
        handledBy = 'MetaOrchestratorAgent'
        return {
          content, domain, handledBy,
          conversationHistory: [...history, { role: 'user', content: message }, { role: 'assistant', content }],
          ...(action ? { action } : {}),
        }
      default:
        this.setConversationHistory(history)
        content = await this.streamChat(message, onChunk)
        handledBy = 'MetaOrchestratorAgent'
    }

    return {
      content, domain, handledBy,
      conversationHistory: this.historyFor(domain),
      ...(action ? { action } : {}),
    }
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

    // Cross-domain fast-path: keyword co-presence across 2+ domains → bypass active-app bias
    // Must run before active-app fast-path so hero-demo queries are never mis-routed.
    if (this.hasCrossDomainSignal(lowerMsg)) return 'cross-domain'

    // Fast-path: active app context + short message → stay in domain unless strong override signal
    if (activeAppType && activeAppType !== 'cross-domain' && activeAppType !== 'meta' && message.length < 200) {
      if (!this.hasStrongDomainSignal(lowerMsg, activeAppType)) {
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

    const validDomains: DomainType[] = ['resume-builder', 'blogengine', 'tripplanner', 'purefoy', 'gastown-pilot', 'seh-study', 'cross-domain', 'meta']
    return validDomains.find(d => classification.includes(d)) ?? (activeAppType ?? 'meta')
  }

  private hasCrossDomainSignal(msg: string): boolean {
    // Explicit connective phrases are a strong signal
    const connectives = ['and also', 'as well as', 'both', 'across', 'combine', 'together']
    if (connectives.some(p => msg.includes(p))) return true
    // Keyword co-presence across 2+ distinct domains is an implicit cross-domain signal.
    // Catches queries like "trip plans and resume" without connective phrases.
    const matchedDomains = DOMAIN_REGISTRY.filter(config => config.keywords.some(k => msg.includes(k)))
    return matchedDomains.length >= 2
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
      case 'resume-builder': return this.resumeBuilder.getTools()
      case 'blogengine': return this.blogEngine.getTools()
      case 'tripplanner': return this.tripPlanner.getTools()
      case 'purefoy': return this.purefoy.getTools()
      case 'gastown-pilot': return this.gastownPilot.getTools()
      case 'seh-study': return this.sehStudy.getTools()
      default: return []
    }
  }

  // R4+R8: build the tool context string for the classify prompt
  private buildClassifyToolContext(): string {
    const domainOrder: DomainType[] = ['resume-builder', 'blogengine', 'tripplanner', 'purefoy', 'gastown-pilot', 'seh-study']
    const lines = domainOrder.map(id => {
      const tools = this.domainStatus.get(id)?.tools ?? this.getDomainStubs(id)
      return `${id} — ${tools.map(t => t.name).join(', ')}`
    })
    lines.push('cross-domain — request clearly spans two or more of the above')
    lines.push('meta — shell navigation, capability questions, or cannot determine domain')
    return lines.join('\n')
  }

  /**
   * Detects whether the message implies an app instance action (spawn or focus).
   *
   * Fast-path: returns null immediately if no action keywords are present.
   * When keywords are detected, checks existing instances for a match before
   * asking the LLM to extract appType + instanceName.
   *
   * Instance matching: substring match on instance names (case-insensitive).
   * If a match is found → focus_instance. Otherwise → spawn_instance.
   *
   * Runs in parallel with classify() — adds zero latency on non-action messages.
   */
  private async detectAction(
    message: string,
    instances: InstanceSummary[] = []
  ): Promise<InstanceAction | null> {
    const lower = message.toLowerCase()

    const actionKeywords = [
      // Spawn signals
      'new trip', 'start a trip', 'plan a trip', 'add a trip',
      'new blog', 'start a blog', 'new post', 'draft a post',
      'new resume', 'start a resume', 'new cv',
      'new canvas', 'start a canvas', 'new lean canvas',
      'open a new', 'create a new', 'start a new', 'launch a new', 'add a new',
      'new instance',
      // Focus signals
      'show my', 'open my', 'switch to', 'go to', 'back to',
    ]
    if (!actionKeywords.some(k => lower.includes(k))) return null

    const validAppTypes: DomainType[] = ['resume-builder', 'blogengine', 'tripplanner', 'purefoy', 'lean-canvas', 'gastown-pilot', 'seh-study']
    const appTypeDescriptions = [
      'resume-builder — resume and job applications',
      'blogengine — blog posts and publishing',
      'tripplanner — trip itineraries and travel',
      'purefoy — cinematography knowledge',
      'lean-canvas — business model canvas',
      'gastown-pilot — multi-agent coordination, rigs, convoys, beads, wasteland',
      'seh-study — NASA systems engineering handbook, flashcards, quizzes, spaced repetition',
    ].join('\n')

    const instanceList = instances.length > 0
      ? `\n\nExisting instances:\n${instances.map(i => `- "${i.name}" (${i.appType}, id: ${i.id})`).join('\n')}`
      : ''

    const prompt = `The user wants to interact with an application instance.
Determine: (1) which app type, (2) a short name for a new instance, and (3) whether an existing instance matches.

App types:
${appTypeDescriptions}
${instanceList}

User message: "${message}"

Respond with JSON only:
- If the user wants a NEW instance: { "action": "spawn", "appType": "<id>", "instanceName": "<2-4 words>" }
- If an existing instance matches: { "action": "focus", "appType": "<id>", "instanceId": "<id from list>" }
- If you cannot determine: { "action": null }`

    try {
      const tempClient = new (await import('@anthropic-ai/sdk')).default({ apiKey: this.apiKey })
      const response = await tempClient.messages.create({
        model: this.model,
        max_tokens: 80,
        messages: [{ role: 'user', content: prompt }],
      })
      const raw = response.content
        .filter(b => b.type === 'text')
        .map(b => ('text' in b ? b.text.trim() : ''))
        .join('')
      const parsed = JSON.parse(raw) as {
        action?: string | null
        appType?: string
        instanceName?: string
        instanceId?: string
      }

      if (!parsed.action || !parsed.appType) return null
      if (!validAppTypes.includes(parsed.appType as DomainType)) return null

      if (parsed.action === 'focus' && parsed.instanceId) {
        // Validate the instanceId actually exists in the provided list
        const exists = instances.some(i => i.id === parsed.instanceId)
        if (exists) {
          return { type: 'focus_instance', appType: parsed.appType as DomainType, instanceId: parsed.instanceId }
        }
        // LLM hallucinated an ID — fall through to spawn
      }

      if (parsed.action === 'spawn' && parsed.instanceName) {
        // Before spawning, do a quick substring match against existing instances
        // to prevent duplicates (e.g. "New trip to Berlin" when "Berlin Interviews" exists)
        const matchingInstance = instances.find(i =>
          i.appType === parsed.appType &&
          (i.name.toLowerCase().includes(lower.replace(/^(new|start|plan|open|create|add|launch)\s+(a\s+)?(new\s+)?/i, '').split(/\s+/)[0]) ||
           lower.includes(i.name.toLowerCase().split(/\s+/)[0]))
        )
        if (matchingInstance) {
          return { type: 'focus_instance', appType: parsed.appType as DomainType, instanceId: matchingInstance.id }
        }

        return { type: 'spawn_instance', appType: parsed.appType as DomainType, instanceName: parsed.instanceName }
      }

      return null
    } catch {
      return null
    }
  }

  private historyFor(domain: DomainType): AgentMessage[] {
    switch (domain) {
      case 'resume-builder': return this.resumeBuilder.getConversationHistory()
      case 'blogengine': return this.blogEngine.getConversationHistory()
      case 'tripplanner': return this.tripPlanner.getConversationHistory()
      case 'purefoy': return this.purefoy.getConversationHistory()
      case 'gastown-pilot': return this.gastownPilot.getConversationHistory()
      case 'seh-study': return this.sehStudy.getConversationHistory()
      default: return this.getConversationHistory()
    }
  }

  // R3: fan out to all involved domain agents in parallel
  private async fanOut(
    involved: DomainType[],
    message: string,
    _history: AgentMessage[],
    context: RoutingContext
  ): Promise<Array<{ domain: DomainType; response: string }>> {
    return Promise.all(involved.map(async domain => {
      // Use each domain agent's own isolated history — not the shared MetaOrchestrator history.
      // This enforces the ADR-0019 invariant: no domain agent receives another domain's context.
      const domainHistory = this.historyFor(domain)
      let response = ''
      switch (domain) {
        case 'resume-builder': response = await this.resumeBuilder.processMessage(message, domainHistory, context); break
        case 'blogengine': response = await this.blogEngine.processMessage(message, domainHistory, context); break
        case 'tripplanner': response = await this.tripPlanner.processMessage(message, domainHistory, context); break
        case 'purefoy': response = await this.purefoy.processMessage(message, domainHistory, context); break
        case 'gastown-pilot': response = await this.gastownPilot.processMessage(message, domainHistory, context); break
        case 'seh-study': response = await this.sehStudy.processMessage(message, domainHistory, context); break
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

  // R3: real cross-domain fan-out (non-streaming).
  // The synthesis call uses a raw Anthropic client (no history mutation) — same
  // isolation pattern as classify() so fan-out never pollutes conversation history.
  private async handleCrossDomain(
    message: string,
    history: AgentMessage[],
    context: RoutingContext
  ): Promise<string> {
    const involved = this.detectInvolvedDomains(message)
    if (involved.length < 2) {
      // Fallback: cross-domain signal fired but only one domain detected — answer directly
      // Uses tempClient so MetaOrchestrator history is never mutated (same isolation as synthesize())
      const tempClient = new (await import('@anthropic-ai/sdk')).default({ apiKey: this.apiKey })
      const response = await tempClient.messages.create({
        model: this.model,
        max_tokens: 1024,
        system: this.getSystemPrompt(),
        messages: [{ role: 'user', content: `[Cross-domain request] ${message}` }],
      })
      return response.content.filter(b => b.type === 'text').map(b => ('text' in b ? b.text : '')).join('')
    }
    const results = await this.fanOut(involved, message, history, context)
    return this.synthesize(message, results)
  }

  // R2+R3: real cross-domain fan-out (streaming — domains non-streaming, synthesis streamed).
  // Same isolation guarantee: synthesis call does not mutate MetaOrchestrator history.
  private async handleCrossDomainStream(
    message: string,
    history: AgentMessage[],
    context: RoutingContext,
    onChunk: (text: string) => void
  ): Promise<string> {
    const involved = this.detectInvolvedDomains(message)
    if (involved.length < 2) {
      // Fallback: cross-domain signal fired but only one domain detected — stream directly
      // Uses tempClient so MetaOrchestrator history is never mutated (same isolation as synthesizeStream())
      const tempClient = new (await import('@anthropic-ai/sdk')).default({ apiKey: this.apiKey })
      const stream = await tempClient.messages.create({
        model: this.model,
        max_tokens: 1024,
        system: this.getSystemPrompt(),
        messages: [{ role: 'user', content: `[Cross-domain request] ${message}` }],
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
      return fullResponse
    }
    const results = await this.fanOut(involved, message, history, context)
    return this.synthesizeStream(message, results, onChunk)
  }

  // R3: ephemeral synthesis call — raw Anthropic client, no history mutation.
  // Mirrors the isolation pattern of classify().
  private async synthesize(
    message: string,
    results: Array<{ domain: DomainType; response: string }>
  ): Promise<string> {
    const systemPrompt =
      'You are synthesizing responses from specialized domain agents. ' +
      'Produce a single coherent answer that integrates both perspectives naturally. ' +
      'Do not reference agent names or domains explicitly — just answer the question.'
    const userContent = this.buildSynthesisPrompt(message, results)
    const tempClient = new (await import('@anthropic-ai/sdk')).default({ apiKey: this.apiKey })
    const response = await tempClient.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    })
    return response.content
      .filter(b => b.type === 'text')
      .map(b => ('text' in b ? b.text : ''))
      .join('')
  }

  // R3: ephemeral synthesis call — streaming variant, same isolation guarantee.
  private async synthesizeStream(
    message: string,
    results: Array<{ domain: DomainType; response: string }>,
    onChunk: (text: string) => void
  ): Promise<string> {
    const systemPrompt =
      'You are synthesizing responses from specialized domain agents. ' +
      'Produce a single coherent answer that integrates both perspectives naturally. ' +
      'Do not reference agent names or domains explicitly — just answer the question.'
    const userContent = this.buildSynthesisPrompt(message, results)
    const tempClient = new (await import('@anthropic-ai/sdk')).default({ apiKey: this.apiKey })
    const stream = await tempClient.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
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
    return fullResponse
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
        'resume-builder': domainEntry('resume-builder'),
        blogengine: domainEntry('blogengine'),
        tripplanner: domainEntry('tripplanner'),
        purefoy: domainEntry('purefoy'),
        'gastown-pilot': domainEntry('gastown-pilot'),
        'seh-study': domainEntry('seh-study'),
      },
    }
  }
}
