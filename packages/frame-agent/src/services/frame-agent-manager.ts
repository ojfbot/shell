import { AgentManager } from '@ojfbot/agent-core'
import { MetaOrchestratorAgent } from '../meta-orchestrator.js'
import { InspectAgent } from '../domain-agents/inspect-agent.js'

interface FrameAgents {
  metaOrchestrator: MetaOrchestratorAgent
  inspectAgent: InspectAgent
}

const manager = AgentManager.getInstance<FrameAgents>('frame')

export function initializeFrameAgent(): void {
  manager.initialize((apiKey) => ({
    metaOrchestrator: new MetaOrchestratorAgent(apiKey, {
      resumeBuilderApi: process.env.RESUME_BUILDER_API_URL ?? 'http://localhost:3001',
      blogEngineApi: process.env.BLOGENGINE_API_URL  ?? 'http://localhost:3006',
      tripPlannerApi: process.env.TRIPPLANNER_API_URL ?? 'http://localhost:3011',
      purefoyApi:    process.env.PUREFOY_API_URL      ?? 'http://localhost:3020',
    }),
    inspectAgent: new InspectAgent(apiKey),
  }))
}

export const frameAgentManager = manager
