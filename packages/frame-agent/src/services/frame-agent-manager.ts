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
      // SCAFFOLD: port 3021 = purefoy-api (Express). 3020 = purefoy browser-app (MF remote).
      purefoyApi:    process.env.PUREFOY_API_URL      ?? 'http://localhost:3021',
      gastownPilotApi: process.env.GASTOWN_PILOT_API_URL ?? 'http://localhost:3018',
      sehStudyApi: process.env.SEH_STUDY_API_URL ?? 'http://localhost:3031',
    }),
    inspectAgent: new InspectAgent(apiKey),
  }))
}

export const frameAgentManager = manager
