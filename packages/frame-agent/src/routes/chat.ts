import { Router, type Request, type Response, type NextFunction } from 'express'
import { z } from 'zod'
import { validateBody, getRateLimiter } from '@ojfbot/agent-core'
import { frameAgentManager } from '../services/frame-agent-manager.js'

const router: Router = Router()

const ChatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  context: z.object({
    activeAppType: z.enum(['resume-builder', 'blogengine', 'tripplanner', 'purefoy', 'cross-domain', 'meta']).optional(),
    instanceId: z.string().optional(),
    threadId: z.string().nullable().optional(),
  }).optional(),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional(),
})

// POST /api/chat — non-streaming
router.post(
  '/',
  validateBody(ChatRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { message, context = {}, conversationHistory = [] } = req.body

      const orchestrator = frameAgentManager.get('metaOrchestrator')
      const result = await orchestrator.route(message, context, conversationHistory)

      res.json({ success: true, data: result })
    } catch (err) {
      next(err)
    }
  }
)

// POST /api/chat/stream — SSE streaming
router.post(
  '/stream',
  getRateLimiter('stream'),
  validateBody(ChatRequestSchema),
  async (req: Request, res: Response) => {
    try {
      const { message, context = {}, conversationHistory = [] } = req.body

      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')

      const orchestrator = frameAgentManager.get('metaOrchestrator')

      const result = await orchestrator.routeStream(
        message,
        context,
        conversationHistory,
        (chunk: string) => {
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`)
        }
      )

      res.write(`data: ${JSON.stringify({
        type: 'done',
        domain: result.domain,
        handledBy: result.handledBy,
        conversationHistory: result.conversationHistory,
        ...(result.action ? { action: result.action } : {}),
      })}\n\n`)

      res.end()
    } catch (err) {
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
      })}\n\n`)
      res.end()
    }
  }
)

export default router
