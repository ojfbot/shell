export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface FrameAgentChatRequest {
  message: string
  context?: {
    activeAppType?: string
    instanceId?: string
    threadId?: string | null
  }
  conversationHistory?: ChatMessage[]
}

export interface SpawnInstanceAction {
  type: 'spawn_instance'
  appType: string
  instanceName: string
}

export interface FrameAgentChatResponse {
  success: boolean
  data: {
    content: string
    domain: string
    handledBy: string
    conversationHistory: ChatMessage[]
    action?: SpawnInstanceAction
  }
}

const BASE_URL = import.meta.env.VITE_FRAME_AGENT_URL ?? 'http://localhost:4001'

export const frameAgentClient = {
  async chat(req: FrameAgentChatRequest): Promise<FrameAgentChatResponse> {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    })
    if (!res.ok) throw new Error(`frame-agent error ${res.status}: ${res.statusText}`)
    return res.json() as Promise<FrameAgentChatResponse>
  },

  // Streaming via fetch + ReadableStream (EventSource only supports GET)
  async streamChat(
    req: FrameAgentChatRequest,
    onChunk: (text: string) => void,
    onDone: (meta: { domain: string; conversationHistory: ChatMessage[]; action?: SpawnInstanceAction }) => void,
    onError: (err: string) => void
  ): Promise<void> {
    const res = await fetch(`${BASE_URL}/api/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    })

    if (!res.ok || !res.body) {
      onError(`frame-agent stream error ${res.status}`)
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6).trim()
        if (!raw) continue

        try {
          const event = JSON.parse(raw) as Record<string, unknown>
          if ('chunk' in event) {
            onChunk(event.chunk as string)
          } else if (event.type === 'done') {
            onDone({
              domain: event.domain as string,
              conversationHistory: event.conversationHistory as ChatMessage[],
              action: event.action as SpawnInstanceAction | undefined,
            })
          } else if (event.type === 'error') {
            onError(event.error as string)
          }
        } catch {
          // Ignore malformed SSE lines
        }
      }
    }
  },

  async getTools(): Promise<unknown> {
    const res = await fetch(`${BASE_URL}/api/tools`)
    if (!res.ok) throw new Error(`frame-agent tools error ${res.status}`)
    return res.json()
  },
}
