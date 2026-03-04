import { Router, type Request, type Response, type NextFunction } from 'express'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { validateBody } from '@ojfbot/agent-core'

const router: Router = Router()

// ── Zod schema ────────────────────────────────────────────────────────────────

const ElementContextSchema = z.object({
  tagName: z.string(),
  id: z.string().optional(),
  classList: z.array(z.string()),
  textContent: z.string().optional(),
  computedStyles: z.record(z.string()),
  boundingRect: z.object({
    top: z.number(),
    left: z.number(),
    width: z.number(),
    height: z.number(),
  }),
  domPath: z.string(),
  screenshot: z.string().optional(),
  parentContext: z.object({
    tagName: z.string().optional(),
    classList: z.array(z.string()).optional(),
  }).optional(),
})

const ConversationMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.number(),
})

const InspectRequestSchema = z.object({
  elementContext: ElementContextSchema,
  userInput: z.string().min(1),
  agentMode: z.enum(['ui', 'ux']).default('ui'),
  conversationHistory: z.array(ConversationMessageSchema).optional().default([]),
})

// ── Prompt helpers (mirrored from mrplug/src/lib/ai-agent.ts) ─────────────────

function getSystemPrompt(agentMode: 'ui' | 'ux'): string {
  if (agentMode === 'ux') {
    return `You are an expert UX strategist and product manager assistant. Your role is to:
1. Understand user experience goals and product requirements
2. Create detailed feature stories and implementation plans
3. Think holistically about user workflows and product features
4. Suggest actionable roadmap items that can be implemented via:
   - GitHub issues for feature requests with detailed acceptance criteria
   - Implementation plans for complex multi-step features
   - Product requirement documents (PRDs) for major features

When analyzing feedback:
- Focus on the user's goal and desired outcome, not just the UI element
- Think about the complete user journey and workflow
- Consider edge cases and alternate paths
- Break down complex features into implementable stories
- Suggest product improvements and new capabilities
- Think beyond styling to functional requirements

Your responses should prioritize product thinking and user experience over technical implementation details.`
  }

  return `You are an expert UI analyst and frontend developer assistant. Your role is to:
1. Understand user feedback about UI elements and interactions
2. Analyze the technical context (DOM structure, styles, positioning)
3. Suggest actionable solutions that can be implemented via:
   - GitHub issues for feature requests or complex changes
   - Direct code changes for simple styling or structural fixes
   - Manual interventions for design decisions

When analyzing feedback:
- Be specific about what CSS properties or HTML structure needs to change
- Identify if it's a styling issue, layout problem, interaction bug, or feature request
- Prioritize solutions based on complexity and impact
- Format responses as JSON with the following structure:
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
}

function formatUserPrompt(
  userInput: string,
  elementContext: z.infer<typeof ElementContextSchema>,
  conversationHistory: z.infer<typeof ConversationMessageSchema>[],
): string {
  const historyText = conversationHistory.length > 0
    ? `\n\nConversation History:\n${conversationHistory.map((msg) => `${msg.role}: ${msg.content}`).join('\n')}`
    : ''

  return `User Feedback: "${userInput}"

Element Context:
- Tag: ${elementContext.tagName}
- Classes: ${elementContext.classList.join(', ') || 'none'}
- ID: ${elementContext.id || 'none'}
- DOM Path: ${elementContext.domPath}
- Dimensions: ${elementContext.boundingRect.width}x${elementContext.boundingRect.height}
- Position: top=${elementContext.boundingRect.top}, left=${elementContext.boundingRect.left}

Key Styles:
${Object.entries(elementContext.computedStyles)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}

${elementContext.parentContext ? `Parent Context:
- Tag: ${elementContext.parentContext.tagName ?? ''}
- Classes: ${elementContext.parentContext.classList?.join(', ') ?? 'none'}
` : ''}${historyText}

Please analyze this feedback and provide actionable suggestions.`
}

interface SuggestedAction {
  type: 'github-issue' | 'claude-code' | 'manual'
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  metadata?: Record<string, unknown>
}

interface AIResponse {
  analysis: string
  suggestedActions: SuggestedAction[]
  requiresCodeChange: boolean
  confidence: number
}

function parseResponse(raw: string): AIResponse {
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

// ── POST /api/inspect ─────────────────────────────────────────────────────────

router.post(
  '/',
  validateBody(InspectRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { elementContext, userInput, agentMode, conversationHistory } = req.body

      const apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey) {
        res.status(503).json({ success: false, error: 'frame-agent: ANTHROPIC_API_KEY not configured' })
        return
      }

      const client = new Anthropic({ apiKey })

      const message = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: getSystemPrompt(agentMode),
        messages: [{ role: 'user', content: formatUserPrompt(userInput, elementContext, conversationHistory) }],
      })

      const raw = message.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('')

      const data: AIResponse = parseResponse(raw)
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  }
)

export default router
