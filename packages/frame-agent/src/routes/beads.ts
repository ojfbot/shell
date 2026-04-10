import { Router, type Request, type Response, type Router as ExpressRouter } from 'express'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import mysql from 'mysql2/promise'

const router: ExpressRouter = Router()
const BEADS_ROOT = process.env.BEADS_ROOT ?? path.join(os.homedir(), '.beads')
const DOLT_PORT = parseInt(process.env.DOLT_PORT ?? '3307', 10)

interface BeadLike {
  id: string
  type: string
  status: string
  [key: string]: unknown
}

// ── Dolt reader (primary) ───────────────────────────────────────────────────

let doltPool: mysql.Pool | null = null

function getDoltPool(): mysql.Pool {
  if (!doltPool) {
    doltPool = mysql.createPool({
      host: '127.0.0.1',
      port: DOLT_PORT,
      user: 'root',
      database: '.beads-dolt',
      waitForConnections: true,
      connectionLimit: 3,
      connectTimeout: 1000,
    })
  }
  return doltPool
}

async function queryDoltBeads(filter: {
  type?: string
  status?: string
  prefix?: string
}): Promise<BeadLike[]> {
  const conditions: string[] = []
  const params: string[] = []

  if (filter.type) { conditions.push('type = ?'); params.push(filter.type) }
  if (filter.status) { conditions.push('status = ?'); params.push(filter.status) }
  if (filter.prefix) { conditions.push('id LIKE ?'); params.push(filter.prefix + '-%') }

  let sql = 'SELECT * FROM beads'
  if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ')
  sql += ' ORDER BY created_at DESC LIMIT 500'

  const pool = getDoltPool()
  const [rows] = await pool.execute(sql, params)
  return (rows as BeadLike[]).map(r => ({
    ...r,
    labels: typeof r.labels === 'string' ? JSON.parse(r.labels as string) : r.labels ?? {},
    refs: typeof r.refs === 'string' ? JSON.parse(r.refs as string) : r.refs ?? [],
    created_at: r.created_at instanceof Date ? (r.created_at as Date).toISOString() : r.created_at,
    updated_at: r.updated_at instanceof Date ? (r.updated_at as Date).toISOString() : r.updated_at,
    closed_at: r.closed_at instanceof Date ? (r.closed_at as Date).toISOString() : r.closed_at,
  }))
}

// ── Filesystem reader (fallback) ────────────────────────────────────────────

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
 * Aggregation endpoint — tries Dolt first, falls back to filesystem.
 * This is the Mayor's primary data source for cross-app bead queries.
 *
 * Query params:
 *   type   — filter by bead type (e.g. "agent", "task", "adr")
 *   status — filter by bead status (e.g. "created", "live", "closed")
 *   prefix — filter by bead ID prefix (e.g. "core", "cv")
 *
 * Response includes `source: 'dolt' | 'filesystem'` to indicate backend.
 */
router.get('/', async (req: Request, res: Response) => {
  const filter = {
    type: req.query.type as string | undefined,
    status: req.query.status as string | undefined,
    prefix: req.query.prefix as string | undefined,
  }

  // Try Dolt first
  try {
    const beads = await queryDoltBeads(filter)
    res.json({ beads, count: beads.length, source: 'dolt' })
    return
  } catch {
    // Dolt unavailable — fall through to filesystem
  }

  // Filesystem fallback
  try {
    let beads = await readAllBeads()

    if (filter.type) beads = beads.filter(b => b.type === filter.type)
    if (filter.status) beads = beads.filter(b => b.status === filter.status)
    if (filter.prefix) beads = beads.filter(b => b.id.startsWith(filter.prefix + '-'))

    res.json({ beads, count: beads.length, source: 'filesystem' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to read beads' })
  }
})

export default router
