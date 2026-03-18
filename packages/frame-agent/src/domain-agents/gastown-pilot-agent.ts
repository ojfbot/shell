import { BaseAgent, type AgentMessage } from '@ojfbot/agent-core'

export interface GasTownPilotContext {
  instanceId?: string
  threadId?: string | null
}

export class GasTownPilotDomainAgent extends BaseAgent {
  constructor(
    apiKey: string,
    private gastownApiUrl: string
  ) {
    super(apiKey, 'GasTownPilotDomain')
  }

  protected getSystemPrompt(): string {
    return `You are the Gas Town Domain Agent within the Frame OS.

You are the AI interface for Gas Town — the multi-agent coordination and observability layer.
Gas Town manages agents, rigs, convoys, beads, formulas, and the Wasteland federation.

You can help users:
- View agent status, health, and tree hierarchy across rigs
- Track convoy progress and bead lifecycle
- Explore formula definitions and molecule DAGs
- Execute gt CLI commands (sling, nudge, handoff, convoy create)
- Access Wasteland wanted board, character sheets, stamps, and leaderboard

Frame vocabulary: worker (not polecat), witness (not department head), mayor (not CEO).

Data is accessed via gastown-pilot-api (${this.gastownApiUrl}).
Mutations go through the gt CLI adapter. Reads go through Dolt SQL. Real-time via SSE relay.
When the API is unavailable, say so clearly rather than guessing.`
  }

  async processMessage(
    message: string,
    history: AgentMessage[],
    _context: GasTownPilotContext
  ): Promise<string> {
    this.setConversationHistory(history)
    return this.chat(message)
  }

  async streamMessage(
    message: string,
    history: AgentMessage[],
    _context: GasTownPilotContext,
    onChunk: (text: string) => void
  ): Promise<string> {
    this.setConversationHistory(history)
    return this.streamChat(message, onChunk)
  }

  getTools() {
    return [
      { name: 'agent_status', description: 'View agent tree, status, and health across rigs' },
      { name: 'convoy_tracker', description: 'Track convoy progress, create new convoys' },
      { name: 'bead_explorer', description: 'Browse and filter beads by type, status, and owner' },
      { name: 'formula_library', description: 'Explore formula definitions and molecule DAGs' },
      { name: 'gt_command', description: 'Execute gt CLI commands: sling, nudge, handoff, convoy create' },
      { name: 'wasteland_board', description: 'Access Wasteland wanted board, character sheets, stamps' },
      { name: 'sse_events', description: 'Subscribe to real-time agent and convoy events via SSE relay' },
    ]
  }
}
