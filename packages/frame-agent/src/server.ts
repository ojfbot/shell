import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { errorHandler, notFoundHandler, getRateLimiter } from '@ojfbot/agent-core'
import { initializeFrameAgent, frameAgentManager } from './services/frame-agent-manager.js'
import chatRouter from './routes/chat.js'
import toolsRouter from './routes/tools.js'
import healthRouter from './routes/health.js'

const app = express()
const PORT = parseInt(process.env.PORT ?? '4001', 10)

// Security
app.use(helmet())
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:4000',
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
  console.log('frame-agent initialized — meta-orchestrator + 3 domain agents ready')
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
})

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down')
  process.exit(0)
})
process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down')
  process.exit(0)
})
