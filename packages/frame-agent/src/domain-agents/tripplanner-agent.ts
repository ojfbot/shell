import { BaseAgent, type AgentMessage } from '@ojfbot/agent-core'

export interface TripPlannerContext {
  instanceId?: string
  threadId?: string | null
  tripName?: string
}

export class TripPlannerDomainAgent extends BaseAgent {
  constructor(
    apiKey: string,
    private tripPlannerApiUrl: string
  ) {
    super(apiKey, 'TripPlannerDomain')
  }

  protected getSystemPrompt(): string {
    return `You are the TripPlanner Domain Agent — the AI intelligence for travel planning within the Frame OS.

You have full knowledge of the TripPlanner workflow:
- Itinerary creation: day-by-day schedules for trips of any length
- Destination research: attractions, neighbourhoods, local tips, hidden gems
- Accommodation: hotel recommendations by budget, location, and style
- Transport: flights, trains, local transit, rental cars, airport transfers
- Budget tracking: estimating and tracking costs per category
- Booking coordination: timing and order of reservations
- ChatGPT transcript import: parsing existing trip research into structured itineraries
- RAG-based chat: answering questions from uploaded travel documents and guides

## Multiple Instances

Each TripPlanner instance represents a different trip (e.g., "Tokyo 2025", "Berlin May").
When a user asks about a specific destination, you are always aware of which trip instance
and which conversation thread you are operating in.

## Response Format

Use structured markdown with clear day-by-day breakdowns where relevant. Append a metadata block:

<metadata>
{"suggestions": [
  {"label": "Day Planner", "tab": "itinerary", "action": "plan"},
  {"label": "Budget", "tab": "budget", "action": "estimate"},
  {"label": "Accommodation", "tab": "hotels", "action": "search"}
]}
</metadata>

Available tabs: itinerary, budget, hotels, transport, research, interactive.

Every response MUST include 2-4 badge suggestions in the metadata block.

## Tone

Enthusiastic, practical, and detail-oriented. You make travel planning effortless.`
  }

  async processMessage(
    message: string,
    history: AgentMessage[],
    _context: TripPlannerContext
  ): Promise<string> {
    this.setConversationHistory(history)
    return this.chat(message)
  }

  async streamMessage(
    message: string,
    history: AgentMessage[],
    _context: TripPlannerContext,
    onChunk: (text: string) => void
  ): Promise<string> {
    this.setConversationHistory(history)
    return this.streamChat(message, onChunk)
  }

  async fetchTrips(): Promise<unknown[]> {
    const res = await fetch(`${this.tripPlannerApiUrl}/api/trips`)
    if (!res.ok) return []
    const data = await res.json() as { data?: unknown[] }
    return data.data ?? []
  }

  getTools() {
    return [
      { name: 'create_itinerary', description: 'Build a day-by-day itinerary for a trip' },
      { name: 'research_destination', description: 'Research attractions, food, and logistics for a destination' },
      { name: 'estimate_budget', description: 'Estimate total trip cost by category' },
      { name: 'find_accommodation', description: 'Recommend hotels and rentals by criteria' },
      { name: 'plan_transport', description: 'Plan flights, trains, and local transit' },
      { name: 'import_transcript', description: 'Parse ChatGPT conversation into structured trip data' },
    ]
  }
}
