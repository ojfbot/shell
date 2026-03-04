import { Router, type Request, type Response, type NextFunction } from 'express'
import { z } from 'zod'
import { validateBody } from '@ojfbot/agent-core'
import { frameAgentManager } from '../services/frame-agent-manager.js'

const router: Router = Router()

// ── Zod schema ─────────────────────────────────────────────────────────────

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
  // TODO: pass to model once vision support is wired end-to-end
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
  conversationHistory: z.array(ConversationMessageSchema).default([]),
})

// ── POST /api/inspect ───────────────────────────────────────────────────────

router.post(
  '/',
  validateBody(InspectRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!frameAgentManager.isInitialized()) {
        res.status(503).json({ success: false, error: 'frame-agent: ANTHROPIC_API_KEY not configured' })
        return
      }

      const { elementContext, userInput, agentMode, conversationHistory } = req.body

      const data = await frameAgentManager.get('inspectAgent').analyze(
        userInput,
        elementContext,
        conversationHistory,
        agentMode,
      )

      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  }
)

export default router
