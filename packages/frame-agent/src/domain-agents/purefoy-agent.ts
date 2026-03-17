import { BaseAgent, type AgentMessage } from '@ojfbot/agent-core'

export interface PurefoyContext {
  instanceId?: string
  threadId?: string | null
}

// SCAFFOLD: ToolsManifest shape from purefoy-api GET /api/tools
interface PurefoyToolsManifest {
  name: string
  version: string
  description: string
  capabilities: string[]
  endpoints: Record<string, string>
}

export class PurefoyDomainAgent extends BaseAgent {
  private manifestCache: PurefoyToolsManifest | null = null

  constructor(
    apiKey: string,
    // SCAFFOLD: needs real value — set PUREFOY_API_URL=http://localhost:3021 in frame-agent .env
    private purefoyApiUrl: string
  ) {
    super(apiKey, 'PurefoyDomain')
  }

  // TODO: implement — fetch from GET /api/tools at agent startup (Phase 2 ADR-0007)
  async loadManifest(): Promise<void> {
    try {
      const res = await fetch(`${this.purefoyApiUrl}/api/tools`)
      if (res.ok) {
        this.manifestCache = await res.json() as PurefoyToolsManifest
      }
    } catch {
      // API not running — agent falls back to static system prompt
    }
  }

  protected getSystemPrompt(): string {
    const caps = this.manifestCache?.capabilities.join(', ') ?? 'episode_browse, episode_transcript, forum_browse, forum_search'
    return `You are the Purefoy Domain Agent within the Frame OS.

You are the AI interface for the Team Deakins cinematography knowledge base — a corpus of
347 podcast episodes (290 fully transcribed, ~7.3M words) and Roger Deakins forum posts.

Available capabilities: ${caps}

You can help users:
- Find podcast episodes by topic, guest, or film discussed
- Browse episode chapters and transcript segments
- Search forum posts using full-text search (FTS5)
- Answer questions about cinematography techniques, equipment, and films discussed

Data is accessed via purefoy-api (${this.purefoyApiUrl}).
When the API is unavailable, say so clearly rather than guessing.`
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
    // TODO: Phase 2 — derive dynamically from manifestCache.capabilities
    return [
      { name: 'episode_browse', description: 'List and filter Team Deakins podcast episodes by topic, film, or season' },
      { name: 'episode_transcript', description: 'Read transcript segments for a specific podcast episode' },
      { name: 'forum_search', description: 'Full-text search across Roger Deakins forum posts' },
      { name: 'forum_browse', description: 'Browse forum topics by category' },
    ]
  }
}
