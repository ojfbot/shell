import { Router, type Request, type Response, type NextFunction } from 'express'
import { z } from 'zod'
import { validateBody } from '@ojfbot/agent-core'
import { appendFile, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const router: Router = Router()

// ── Zod schema ─────────────────────────────────────────────────────────────

const TechDebtIncidentSchema = z.object({
  /** Source: mrplug analysis, manual review, CI failure, etc. */
  source: z.enum(['mrplug', 'manual', 'ci', 'agent']).default('mrplug'),
  /** Trigger reason for categorization. */
  triggerReason: z.enum([
    'error', 'unexpected_response', 'capability_gap',
    'new_pattern', 'bad_outcome', 'manual_review',
  ]).default('manual_review'),
  /** Short title for the incident. */
  shortTitle: z.string().min(1),
  /** Full analysis or context summary. */
  contextSummary: z.string().min(1),
  /** Which repo this applies to (e.g. "shell", "cv-builder"). */
  repo: z.string().optional(),
  /** File path or DOM path where the issue was found. */
  filePath: z.string().optional(),
  /** Local filesystem path to the repo root. */
  localPath: z.string().optional(),
  /** Suggested actions from MrPlug AI analysis. */
  suggestedActions: z.array(z.object({
    type: z.string(),
    title: z.string(),
    description: z.string(),
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
  })).optional(),
  /** Whether the analysis indicates code changes are needed. */
  requiresCodeChange: z.boolean().optional(),
  /** AI confidence score (0-1). */
  confidence: z.number().min(0).max(1).optional(),
  /** Acceptance criteria from MrPlug UX analysis. */
  acceptanceCriteria: z.array(z.string()).optional(),
})

type TechDebtIncident = z.infer<typeof TechDebtIncidentSchema>

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatIncident(incident: TechDebtIncident): string {
  const now = new Date().toISOString()
  const priority = incident.suggestedActions?.[0]?.priority ?? 'medium'
  const lines = [
    `### ${incident.shortTitle}`,
    `- **Date:** ${now}`,
    `- **Source:** ${incident.source}`,
    `- **Trigger:** ${incident.triggerReason}`,
    `- **Priority:** ${priority}`,
  ]
  if (incident.repo) lines.push(`- **Repo:** ${incident.repo}`)
  if (incident.filePath) lines.push(`- **Path:** ${incident.filePath}`)
  if (incident.confidence != null) lines.push(`- **Confidence:** ${(incident.confidence * 100).toFixed(0)}%`)
  if (incident.requiresCodeChange) lines.push(`- **Requires code change:** yes`)
  lines.push('', incident.contextSummary)
  if (incident.acceptanceCriteria?.length) {
    lines.push('', '**Acceptance criteria:**')
    incident.acceptanceCriteria.forEach(c => lines.push(`- [ ] ${c}`))
  }
  if (incident.suggestedActions?.length) {
    lines.push('', '**Suggested actions:**')
    incident.suggestedActions.forEach(a => lines.push(`- [${a.priority}] ${a.title}: ${a.description}`))
  }
  lines.push('', '---', '')
  return lines.join('\n')
}

// Resolve TECHDEBT.md path — prefer the repo's own file, fall back to core
function resolveTechDebtPath(incident: TechDebtIncident): string {
  if (incident.localPath) {
    const repoPath = join(incident.localPath, 'TECHDEBT.md')
    return repoPath
  }
  // Default: core repo's TECHDEBT.md
  const coreRepo = process.env.CORE_REPO_PATH ?? join(process.env.HOME ?? '', 'ojfbot/core')
  return join(coreRepo, 'TECHDEBT.md')
}

// ── POST /api/techdebt ──────────────────────────────────────────────────────

router.post(
  '/',
  validateBody(TechDebtIncidentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const incident = req.body as TechDebtIncident
      const formatted = formatIncident(incident)
      const techdebtPath = resolveTechDebtPath(incident)

      // Ensure file exists with header
      if (!existsSync(techdebtPath)) {
        await writeFile(techdebtPath, '# Tech Debt Log\n\nIncidents logged by MrPlug, CI, and agent analysis.\n\n---\n\n')
      }

      await appendFile(techdebtPath, formatted)

      console.log(`frame-agent [techdebt]: logged "${incident.shortTitle}" → ${techdebtPath}`)

      res.json({
        success: true,
        data: {
          path: techdebtPath,
          shortTitle: incident.shortTitle,
          source: incident.source,
        },
      })
    } catch (err) {
      next(err)
    }
  }
)

// ── GET /api/techdebt — read current incidents ──────────────────────────────

router.get(
  '/',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const coreRepo = process.env.CORE_REPO_PATH ?? join(process.env.HOME ?? '', 'ojfbot/core')
      const techdebtPath = join(coreRepo, 'TECHDEBT.md')

      if (!existsSync(techdebtPath)) {
        res.json({ success: true, data: { incidents: [], path: techdebtPath } })
        return
      }

      const content = await readFile(techdebtPath, 'utf-8')
      res.json({ success: true, data: { content, path: techdebtPath } })
    } catch (err) {
      next(err)
    }
  }
)

export default router
