import { Router } from 'express'
import { frameAgentManager } from '../services/frame-agent-manager.js'

const router = Router()

router.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'frame-agent',
    initialized: frameAgentManager.isInitialized(),
    timestamp: new Date().toISOString(),
  })
})

export default router
