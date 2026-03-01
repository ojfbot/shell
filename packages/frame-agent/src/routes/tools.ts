import { Router } from 'express'
import { frameAgentManager } from '../services/frame-agent-manager.js'

const router: Router = Router()

router.get('/', (_req, res) => {
  try {
    const orchestrator = frameAgentManager.get('metaOrchestrator')
    res.json({ success: true, data: orchestrator.getToolManifest() })
  } catch {
    res.status(503).json({ success: false, error: 'frame-agent not initialized' })
  }
})

export default router
