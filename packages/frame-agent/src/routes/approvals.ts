import { Router, type Request, type Response, type Router as ExpressRouter } from 'express'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

const router: ExpressRouter = Router()
const BEADS_ROOT = process.env.BEADS_ROOT ?? path.join(os.homedir(), '.beads')

// Resolve all agent beads across all prefix dirs
async function readAllAgentBeads(): Promise<unknown[]> {
  const beads: unknown[] = []
  let prefixes: string[]
  try {
    prefixes = await fs.readdir(BEADS_ROOT)
  } catch { return beads }

  for (const prefix of prefixes) {
    const prefixPath = path.join(BEADS_ROOT, prefix)
    let files: string[]
    try {
      files = await fs.readdir(prefixPath)
    } catch { continue }

    for (const file of files.filter(f => f.endsWith('.json'))) {
      try {
        const raw = await fs.readFile(path.join(prefixPath, file), 'utf-8')
        const bead = JSON.parse(raw)
        if (bead.type === 'agent') beads.push(bead)
      } catch { /* skip corrupt */ }
    }
  }
  return beads
}

// GET /api/approvals — return all agent beads with hook_approval_status = 'pending'
router.get('/', async (_req: Request, res: Response) => {
  const all = await readAllAgentBeads()
  const pending = all.filter((b: unknown) => {
    const bead = b as Record<string, unknown>
    const labels = bead['labels'] as Record<string, string> | undefined
    return labels?.['hook_approval_status'] === 'pending'
  })
  res.json({ items: pending })
})

// POST /api/approvals/:agentId/approve
router.post('/:agentId/approve', async (req: Request, res: Response) => {
  const { agentId } = req.params
  const prefix = agentId.split('-')[0]
  const filePath = path.join(BEADS_ROOT, prefix, `${agentId}.json`)
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    const bead = JSON.parse(raw) as { labels: Record<string, string>; updated_at: string }
    bead.labels['hook_approval_status'] = 'approved'
    bead.updated_at = new Date().toISOString()
    await fs.writeFile(filePath, JSON.stringify(bead, null, 2), 'utf-8')
    res.json({ ok: true })
  } catch {
    res.status(404).json({ error: 'agent not found' })
  }
})

// POST /api/approvals/:agentId/reject
router.post('/:agentId/reject', async (req: Request, res: Response) => {
  const { agentId } = req.params
  const prefix = agentId.split('-')[0]
  const filePath = path.join(BEADS_ROOT, prefix, `${agentId}.json`)
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    const bead = JSON.parse(raw) as { labels: Record<string, string>; updated_at: string }
    bead.labels['hook_approval_status'] = 'rejected'
    bead.updated_at = new Date().toISOString()
    await fs.writeFile(filePath, JSON.stringify(bead, null, 2), 'utf-8')
    res.json({ ok: true })
  } catch {
    res.status(404).json({ error: 'agent not found' })
  }
})

export default router
