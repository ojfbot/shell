import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { errorHandler, notFoundHandler, getRateLimiter } from '@ojfbot/agent-core'
import { initializeFrameAgent, frameAgentManager } from './services/frame-agent-manager.js'
import chatRouter from './routes/chat.js'
import toolsRouter from './routes/tools.js'
import healthRouter from './routes/health.js'
import inspectRouter from './routes/inspect.js'
import resumptionRouter from './routes/resumption.js'
import approvalsRouter from './routes/approvals.js'

const app = express()
const PORT = parseInt(process.env.PORT ?? '4001', 10)

// Extension ID allowlist — comma-separated Chrome/Firefox extension IDs.
// Leave unset in dev to allow any extension origin (convenient for local testing).
// Set in production to lock down which extension IDs can reach the LLM gateway.
// Example: ALLOWED_EXTENSION_IDS=abcdefghijklmnopabcdefghijklmnop,mnopabcdefghijklmn
const allowedExtensionIds = (process.env.ALLOWED_EXTENSION_IDS ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

// Security
app.use(helmet())
app.use(cors({
  origin: (origin, callback) => {
    const allowed = (process.env.CORS_ORIGIN || 'http://localhost:4000').split(',').map(s => s.trim())
    if (!origin) {
      // No Origin header — service workers, curl, server-to-server
      callback(null, true)
    } else if (origin.startsWith('chrome-extension://') || origin.startsWith('moz-extension://')) {
      // MrPlug browser extension. In dev (no allowlist), accept any extension origin.
      // In production, restrict to known extension IDs via ALLOWED_EXTENSION_IDS.
      if (allowedExtensionIds.length === 0) {
        callback(null, true)
      } else {
        const id = origin.split('://')[1]
        allowedExtensionIds.includes(id)
          ? callback(null, true)
          : callback(new Error(`CORS: extension '${origin}' not in ALLOWED_EXTENSION_IDS`))
      }
    } else if (allowed.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error(`CORS: origin '${origin}' not allowed`))
    }
  },
  credentials: true,
}))

// Rate limiting on all /api routes
app.use('/api', getRateLimiter('standard'))

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Initialize frame-agent — loads API key + instantiates all domain agents
try {
  initializeFrameAgent()
  console.log('frame-agent initialized — meta-orchestrator + 4 domain agents ready')
} catch (err) {
  console.error('Failed to initialize frame-agent:', err)
  console.error('Check ANTHROPIC_API_KEY environment variable')
  // Server stays up so K8s readiness probe can report "not initialized"
}

// K8s readiness/liveness probe (no auth, no rate limit)
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'frame-agent',
    initialized: frameAgentManager.isInitialized(),
    timestamp: new Date().toISOString(),
  })
})

// API routes
app.use('/api/chat', chatRouter)
app.use('/api/tools', toolsRouter)
app.use('/api/health', healthRouter)
app.use('/api/inspect', inspectRouter)
app.use('/api/resumption', resumptionRouter)
app.use('/api/approvals', approvalsRouter)

// 404 + error handling
app.use(notFoundHandler)
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`frame-agent running on port ${PORT}`)
  console.log(`CORS origin: ${process.env.CORS_ORIGIN || 'http://localhost:4000'}`)
  console.log(`Sub-app APIs:`)
  console.log(`  resume-builder: ${process.env.RESUME_BUILDER_API_URL ?? 'http://localhost:3001'}`)
  console.log(`  blogengine:  ${process.env.BLOGENGINE_API_URL  ?? 'http://localhost:3006'}`)
  console.log(`  tripplanner: ${process.env.TRIPPLANNER_API_URL ?? 'http://localhost:3011'}`)
  console.log(`  purefoy:     ${process.env.PUREFOY_API_URL      ?? 'http://localhost:3021'}`)

  // ADR-0008: fetch GET /api/tools from each sub-app after bind so the server
  // is up for K8s health checks immediately. Falls back to static stubs on failure.
  if (frameAgentManager.isInitialized()) {
    frameAgentManager.get('metaOrchestrator').init().catch((err: unknown) => {
      console.warn('frame-agent: domain tool discovery failed:', err)
    })
  }
})

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down')
  process.exit(0)
})
process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down')
  process.exit(0)
})
