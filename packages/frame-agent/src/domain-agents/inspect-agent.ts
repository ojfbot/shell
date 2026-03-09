import { BaseAgent, type AgentMessage } from '@ojfbot/agent-core'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InspectElementContext {
  tagName: string
  id?: string
  classList: string[]
  textContent?: string
  computedStyles: Record<string, string>
  boundingRect: { top: number; left: number; width: number; height: number }
  domPath: string
  // TODO: pass to model once vision support is wired end-to-end
  screenshot?: string
  parentContext?: { tagName?: string; classList?: string[] }
}

export interface InspectConversationMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

export interface SuggestedAction {
  type: 'github-issue' | 'claude-code' | 'manual'
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  metadata?: Record<string, unknown>
}

export interface InspectResponse {
  analysis: string
  suggestedActions: SuggestedAction[]
  requiresCodeChange: boolean
  confidence: number
}

// ── System prompts ────────────────────────────────────────────────────────────

const JSON_SCHEMA_INSTRUCTION = `
Format your response as JSON with the following structure:
{
  "analysis": "Your detailed analysis of the issue",
  "suggestedActions": [
    {
      "type": "github-issue" | "claude-code" | "manual",
      "title": "Action title",
      "description": "Detailed description",
      "priority": "low" | "medium" | "high",
      "metadata": {}
    }
  ],
  "requiresCodeChange": true | false,
  "confidence": 0.0-1.0
}`

const UI_SYSTEM_PROMPT = `You are an expert UI analyst and frontend developer assistant. Your role is to:
1. Understand user feedback about UI elements and interactions
2. Analyse the technical context (DOM structure, styles, positioning)
3. Suggest actionable solutions that can be implemented via:
   - GitHub issues for feature requests or complex changes
   - Direct code changes for simple styling or structural fixes
   - Manual interventions for design decisions

When analysing feedback:
- Be specific about what CSS properties or HTML structure needs to change
- Identify if it's a styling issue, layout problem, interaction bug, or feature request
- Prioritise solutions based on complexity and impact
${JSON_SCHEMA_INSTRUCTION}`

const UX_SYSTEM_PROMPT = `You are an expert UX strategist and product manager assistant. Your role is to:
1. Understand user experience goals and product requirements
2. Create detailed feature stories and implementation plans
3. Think holistically about user workflows and product features
4. Suggest actionable roadmap items that can be implemented via:
   - GitHub issues for feature requests with detailed acceptance criteria
   - Implementation plans for complex multi-step features
   - Product requirement documents (PRDs) for major features

When analysing feedback:
- Focus on the user's goal and desired outcome, not just the UI element
- Think about the complete user journey and workflow
- Consider edge cases and alternate paths
- Break down complex features into implementable stories
- Suggest product improvements and new capabilities
- Think beyond styling to functional requirements
${JSON_SCHEMA_INSTRUCTION}`

// ── Prompt helpers ────────────────────────────────────────────────────────────

/**
 * Format element context for the model.
 * XML delimiters wrap user-supplied content (userInput, textContent, domPath)
 * so the model can clearly distinguish instruction from data — reducing prompt
 * injection risk from crafted page content.
 */
function formatUserPrompt(userInput: string, ctx: InspectElementContext): string {
  const keyStyles = Object.entries(ctx.computedStyles)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n')

  const parentLine = ctx.parentContext
    ? `Parent: <${ctx.parentContext.tagName ?? 'unknown'}> [${ctx.parentContext.classList?.join(', ') ?? ''}]\n`
    : ''

  const textLine = ctx.textContent
    ? `Text content: <text_content>${ctx.textContent.slice(0, 200)}</text_content>\n`
    : ''

  return `<user_input>
${userInput}
</user_input>

<element_context>
Element: <${ctx.tagName}${ctx.id ? ` id="${ctx.id}"` : ''}> [${ctx.classList.join(', ') || 'no classes'}]
DOM path: <dom_path>${ctx.domPath}</dom_path>
Dimensions: ${ctx.boundingRect.width}×${ctx.boundingRect.height} at (${ctx.boundingRect.left}, ${ctx.boundingRect.top})
${textLine}${parentLine}Key styles:
${keyStyles || '  (none)'}
</element_context>

Analyse the feedback and provide actionable suggestions.`
}

function parseResponse(raw: string): InspectResponse {
  try {
    const jsonMatch = raw.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/)
    const jsonString = jsonMatch ? jsonMatch[1] : raw
    const parsed = JSON.parse(jsonString)
    return {
      analysis: parsed.analysis || 'No analysis provided',
      suggestedActions: parsed.suggestedActions || [],
      requiresCodeChange: parsed.requiresCodeChange || false,
      confidence: parsed.confidence || 0.5,
    }
  } catch {
    return {
      analysis: raw,
      suggestedActions: [{
        type: 'manual',
        title: 'Manual Review Required',
        description: raw,
        priority: 'medium',
      }],
      requiresCodeChange: false,
      confidence: 0.3,
    }
  }
}

// ── InspectAgent ──────────────────────────────────────────────────────────────

/**
 * Singleton managed by AgentManager — do not instantiate directly.
 *
 * Concurrency note: this is a shared singleton and is NOT safe for concurrent
 * requests. Two overlapping calls will race on both `_mode` and
 * `conversationHistory`:
 *   - `_mode` is set as instance state before `chat()`, so request B can
 *     overwrite request A's mode before A's `getSystemPrompt()` is called.
 *   - `setConversationHistory` + `chat` is not atomic — B can clobber A's
 *     history between the set and the Anthropic API call.
 * Acceptable for the current single-developer dev-tool use case (MrPlug
 * serialises requests per element inspection). Revisit if multi-user or if
 * callers become concurrent.
 */
export class InspectAgent extends BaseAgent {
  private _mode: 'ui' | 'ux' = 'ui'

  constructor(apiKey: string) {
    super(apiKey, 'InspectAgent')
  }

  protected getSystemPrompt(): string {
    return this._mode === 'ux' ? UX_SYSTEM_PROMPT : UI_SYSTEM_PROMPT
  }

  async analyze(
    userInput: string,
    elementContext: InspectElementContext,
    conversationHistory: InspectConversationMessage[],
    agentMode: 'ui' | 'ux',
  ): Promise<InspectResponse> {
    // _mode must be set before chat() — getSystemPrompt() reads it.
    // Not concurrency-safe: see class-level note above.
    this._mode = agentMode

    // Convert MrPlug ConversationMessage[] to BaseAgent AgentMessage[].
    // System messages are dropped — the system prompt is already injected by
    // BaseAgent.chat() via getSystemPrompt(). Proper message turns give the
    // model native multi-turn context rather than embedding history as text.
    // Not atomic with the chat() call below — see class-level concurrency note.
    const agentHistory: AgentMessage[] = conversationHistory
      .filter((m): m is typeof m & { role: 'user' | 'assistant' } =>
        m.role === 'user' || m.role === 'assistant'
      )
      .map(m => ({ role: m.role, content: m.content }))

    this.setConversationHistory(agentHistory)

    const raw = await this.chat(
      formatUserPrompt(userInput, elementContext),
      { maxTokens: 2048 },
    )

    return parseResponse(raw)
  }
}
