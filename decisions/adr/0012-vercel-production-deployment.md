# ADR-0012: Vercel as Production Host for Shell (Phase 1)

**Date:** 2026-03-03
**Status:** Accepted
**Supersedes:** GitHub Pages deploy workflow (placeholder)
**See also:** core ADR-0013 (safe demo deployment), ADR-0014 (layered deployment architecture)

---

## Context

The shell repo previously had a `deploy.yml` targeting GitHub Pages as a scaffolding placeholder.
GitHub Pages does not support:
- Custom SPA routing (`/some/path` → `index.html`)
- Per-path response headers (required for MF `remoteEntry.js` CORS + Cache-Control)
- Preview deployments on PRs

The demo requirement (core ADR-0013) is UI-only — no APIs or LLM calls needed for Phase 1.
Vercel's free tier handles all requirements.

---

## Decision

**Shell is deployed to Vercel at `frame.jim.software`.**

### `vercel.json` (shell-specific)

```json
{
  "buildCommand": "pnpm --filter @ojfbot/shell-app build",
  "outputDirectory": "packages/shell-app/dist",
  "installCommand": "pnpm install",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

SPA rewrites route all paths to `index.html` — required for React Router.

### CI/CD

`.github/workflows/deploy.yml`:
- `push` to `main` → `vercel deploy --prod` → frame.jim.software
- `pull_request` → `vercel deploy` (preview) + PR comment with preview URL

Required GitHub secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

### VITE_REMOTE_* env vars

Sub-app remotes are injected at build time via Vercel project environment variables:

| Variable | Value |
|----------|-------|
| `VITE_REMOTE_CV_BUILDER` | `https://cv.jim.software` |
| `VITE_REMOTE_BLOGENGINE` | `https://blog.jim.software` |
| `VITE_REMOTE_TRIPPLANNER` | `https://trips.jim.software` |

`VITE_FRAME_AGENT_URL` is intentionally empty in Phase 1 (no backend deployed — ADR-0013).

---

## Consequences

- Shell deploys in ~30s on every push to main
- PR previews enable visual review before merge
- K8s manifests (`k8s/`) remain in the repo and will activate when Layer 2 services are containerised (Phase 6, core ADR-0014)
