import { Router, type Request, type Response, type Router as ExpressRouter } from 'express'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

const router: ExpressRouter = Router()
const BEADS_ROOT = process.env.BEADS_ROOT ?? path.join(os.homedir(), '.beads')

interface BeadLike {
  id: string
  type: string
  status: string
  [key: string]: unknown
}

async function readAllBeads(): Promise<BeadLike[]> {
  const beads: BeadLike[] = []
  let prefixes: string[]
  try {
    prefixes = await fs.readdir(BEADS_ROOT)
  } catch { return beads }

  for (const prefix of prefixes) {
    if (prefix === 'events') continue
    const prefixPath = path.join(BEADS_ROOT, prefix)
    let stat
    try { stat = await fs.stat(prefixPath) } catch { continue }
    if (!stat.isDirectory()) continue

    let files: string[]
    try { files = await fs.readdir(prefixPath) } catch { continue }

    for (const file of files.filter(f => f.endsWith('.json'))) {
      try {
        const raw = await fs.readFile(path.join(prefixPath, file), 'utf-8')
        const bead = JSON.parse(raw) as BeadLike
        if (bead.id && bead.type) beads.push(bead)
      } catch { /* skip corrupt */ }
    }
  }

  return beads.sort((a, b) => {
    const aDate = (a as { created_at?: string }).created_at ?? ''
    const bDate = (b as { created_at?: string }).created_at ?? ''
    return bDate.localeCompare(aDate)
  })
}

/**
 * GET /api/beads
 *
 * Aggregation endpoint — reads all beads from ~/.beads/ (FilesystemBeadStore).
 * This is the Mayor's primary data source for cross-app bead queries.
 *
 * Query params:
 *   type   — filter by bead type (e.g. "agent", "task", "adr")
 *   status — filter by bead status (e.g. "created", "live", "closed")
 *   prefix — filter by bead ID prefix (e.g. "core", "cv")
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    let beads = await readAllBeads()

    const typeParam = req.query.type as string | undefined
    if (typeParam) beads = beads.filter(b => b.type === typeParam)

    const statusParam = req.query.status as string | undefined
    if (statusParam) beads = beads.filter(b => b.status === statusParam)

    const prefixParam = req.query.prefix as string | undefined
    if (prefixParam) beads = beads.filter(b => b.id.startsWith(prefixParam + '-'))

    res.json({ beads, count: beads.length })
  } catch (error) {
    res.status(500).json({ error: 'Failed to read beads' })
  }
})

export default router
