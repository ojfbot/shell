import { Router, type Request, type Response, type NextFunction } from 'express'
import { z } from 'zod'
import { validateBody, getRateLimiter } from '@ojfbot/agent-core'
import { frameAgentManager } from '../services/frame-agent-manager.js'
import { synthesizeResumption } from '../thread-resumption.js'

// API key is always available in the environment at this point — frame-agent refuses to
// initialize without it (see frame-agent-manager.ts → AgentManager.initialize).
function requireApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set')
  return key
}

const router: Router = Router()

/**
 * POST /api/resumption
 *
 * Synthesizes a contextual thread-resumption opener from prior conversation history.
 * Called by the shell when it loads an existing thread (on tab switch or session restore).
 * Returns null when there is insufficient history to synthesize from.
 *
 * This endpoint does NOT mutate any domain agent's conversation history.
 *
 * Request body:
 *   conversationHistory  — prior messages for this thread
 *   activeAppType        — which Frame OS domain is active (e.g. "cv-builder")
 *
 * Response:
 *   { success: true, data: { resumption: string | null } }
 */

const ResumptionRequestSchema = z.object({
  conversationHistory: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().max(4000),
    })
  ).min(2, 'conversationHistory must contain at least two messages'),
  activeAppType: z.string().default('meta'),
})

router.post(
  '/',
  getRateLimiter('standard'),
  validateBody(ResumptionRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!frameAgentManager.isInitialized()) {
        res.status(503).json({
          success: false,
          error: 'frame-agent: ANTHROPIC_API_KEY not configured',
        })
        return
      }

      const { conversationHistory, activeAppType } = req.body

      const result = await synthesizeResumption(requireApiKey(), conversationHistory, activeAppType)

      res.json({
        success: true,
        data: {
          resumption: result?.summary ?? null,
          suggestions: result?.suggestions ?? [],
        },
      })
    } catch (err) {
      next(err)
    }
  }
)

export default router
