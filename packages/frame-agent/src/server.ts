import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { errorHandler, notFoundHandler, getRateLimiter } from '@ojfbot/agent-core'
import { initializeFrameAgent, frameAgentManager } from './services/frame-agent-manager.js'
import chatRouter from './routes/chat.js'
import toolsRouter from './routes/tools.js'
import healthRouter from './routes/health.js'
import inspectRouter from './routes/inspect.js'

const app = express()
const PORT = parseInt(process.env.PORT ?? '4001', 10)

// Security
app.use(helmet())
app.use(cors({
  origin: (origin, callback) => {
    const allowed = (process.env.CORS_ORIGIN || 'http://localhost:4000').split(',').map(s => s.trim())
    // Allow MrPlug browser extension (any chrome-extension:// or moz-extension:// origin)
    // and requests with no Origin header (service workers)
    if (!origin || origin.startsWith('chrome-extension://') || origin.startsWith('moz-extension://') || allowed.includes(origin)) {
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

// 404 + error handling
app.use(notFoundHandler)
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`frame-agent running on port ${PORT}`)
  console.log(`CORS origin: ${process.env.CORS_ORIGIN || 'http://localhost:4000'}`)
  console.log(`Sub-app APIs:`)
  console.log(`  cv-builder:  ${process.env.CV_BUILDER_API_URL  ?? 'http://localhost:3001'}`)
  console.log(`  blogengine:  ${process.env.BLOGENGINE_API_URL  ?? 'http://localhost:3006'}`)
  console.log(`  tripplanner: ${process.env.TRIPPLANNER_API_URL ?? 'http://localhost:3011'}`)
  console.log(`  purefoy:     ${process.env.PUREFOY_API_URL      ?? 'http://localhost:3020'}`)

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
