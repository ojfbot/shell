import { BaseAgent, type AgentMessage } from '@ojfbot/agent-core'

export interface BlogEngineContext {
  instanceId?: string
  threadId?: string | null
}

export class BlogEngineDomainAgent extends BaseAgent {
  constructor(
    apiKey: string,
    private blogEngineApiUrl: string
  ) {
    super(apiKey, 'BlogEngineDomain')
  }

  protected getSystemPrompt(): string {
    return `You are the BlogEngine Domain Agent — the AI intelligence for blog creation and content management within the Frame OS.

You have full knowledge of the BlogEngine workflow:
- Blog post drafting: creating first drafts from topic prompts or outlines
- Content editing: improving clarity, structure, tone, SEO
- Publishing pipeline: drafting → review → Notion sync → publish
- Podcast content: generating show notes, episode summaries, episode scripts
- Product library management: tracking published content and drafts
- Notion integration: syncing content to and from Notion workspaces
- Content strategy: topic ideation, editorial calendar planning

## Response Format

Use structured markdown. Append a metadata block with next actions:

<metadata>
{"suggestions": [
  {"label": "New Draft", "tab": "generate", "action": "draft"},
  {"label": "View Posts", "tab": "publishing", "action": "list"},
  {"label": "Notion Sync", "tab": "notion", "action": "sync"}
]}
</metadata>

Available tabs: generate, publishing, notion, podcast, library, interactive.

Every response MUST include 2-4 badge suggestions in the metadata block.

## Tone

Creative, constructive, and efficient. You help writers ship content faster without sacrificing quality.`
  }

  async processMessage(
    message: string,
    history: AgentMessage[],
    _context: BlogEngineContext
  ): Promise<string> {
    this.setConversationHistory(history)
    return this.chat(message)
  }

  async streamMessage(
    message: string,
    history: AgentMessage[],
    _context: BlogEngineContext,
    onChunk: (text: string) => void
  ): Promise<string> {
    this.setConversationHistory(history)
    return this.streamChat(message, onChunk)
  }

  async fetchPosts(): Promise<unknown[]> {
    const res = await fetch(`${this.blogEngineApiUrl}/api/posts`)
    if (!res.ok) return []
    const data = await res.json() as { data?: unknown[] }
    return data.data ?? []
  }

  getTools() {
    return [
      { name: 'draft_post', description: 'Draft a new blog post from a topic or outline' },
      { name: 'edit_post', description: 'Edit and improve an existing draft' },
      { name: 'publish_post', description: 'Move a draft through the publishing pipeline' },
      { name: 'notion_sync', description: 'Sync content with Notion workspace' },
      { name: 'podcast_notes', description: 'Generate show notes and episode summary' },
      { name: 'content_strategy', description: 'Generate topic ideas and editorial calendar' },
    ]
  }
}
