import { AgentManager } from '@ojfbot/agent-core'
import { MetaOrchestratorAgent } from '../meta-orchestrator.js'

interface FrameAgents {
  metaOrchestrator: MetaOrchestratorAgent
}

const manager = AgentManager.getInstance<FrameAgents>('frame')

export function initializeFrameAgent(): void {
  manager.initialize((apiKey) => ({
    metaOrchestrator: new MetaOrchestratorAgent(apiKey, {
      cvBuilderApi:  process.env.CV_BUILDER_API_URL  ?? 'http://localhost:3001',
      blogEngineApi: process.env.BLOGENGINE_API_URL  ?? 'http://localhost:3006',
      tripPlannerApi: process.env.TRIPPLANNER_API_URL ?? 'http://localhost:3011',
      purefoyApi:    process.env.PUREFOY_API_URL      ?? 'http://localhost:3020',
    }),
  }))
}

export const frameAgentManager = manager
