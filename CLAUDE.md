# CLAUDE.md — ojfbot/shell

## What this repo is

`shell` is the Frame host application — the AI App OS that composes all ojfbot applications into a single interface.

**Architecture: Module Federation (Vite) + K8s pod cluster + frame-agent LLM gateway**

Each sub-app (cv-builder, BlogEngine, TripPlanner, purefoy) runs as an independent pod exposing its `Dashboard` component as a Vite Module Federation remote. The shell is the host that loads those remotes dynamically — no iframes, no page reloads, shared React/Redux singleton.

The K8s topology maps directly to the "browser as OS" metaphor:
- Each sub-app pod ≈ a browser process (isolated, independently deployable)
- The shell pod ≈ the browser chrome (persistent, composes the others)
- The ingress ≈ the browser's URL bar / routing layer
- `frame-agent` ≈ the browser's AI layer — single LLM gateway for the entire cluster

## Packages

| Package | Port | Purpose |
|---|---|---|
| `packages/shell-app` | 4000 | Vite Module Federation host. Header + AppSwitcher + AppFrame. |
| `packages/frame-agent` | 4001 | Meta-orchestrator + LLM gateway. Single Anthropic API key for all sub-apps. |
| `packages/agent-core` | — | Shared npm package: BaseAgent, AgentManager, middleware (no port). |

## frame-agent architecture

`frame-agent` is the single AI backend for the entire Frame cluster:

```
shell-app (UI)
  └── frame-agent (port 4001) — ONE Anthropic API key
        ├── MetaOrchestratorAgent — classifies + routes NL to domain
        ├── CvBuilderDomainAgent  — resume, jobs, tailoring, interview
        ├── BlogEngineDomainAgent — posts, drafts, Notion, podcast
        └── TripPlannerDomainAgent — trips, itineraries, budget, transport

  ↓ delegates CRUD/data to:
  cv-builder-api (port 3001)  — domain data service
  blogengine-api (port 3006)  — domain data service
  tripplanner-api (port 3011) — domain data service
```

Sub-app APIs expose `GET /api/tools` returning their capability manifest.
Domain agents in frame-agent call sub-app APIs for data only — no direct Anthropic calls in sub-apps (Phase 2 migration).

## @ojfbot/agent-core

Shared package with:
- `BaseAgent` — Anthropic client, streaming, history management
- `AgentManager<T>` — typed singleton factory
- Middleware: `validateBody`, `validateQuery`, `getRateLimiter`, `errorHandler`, `notFoundHandler`

Each sub-app imports this instead of duplicating the pattern.

## Data model

App → Instance → Thread (see `appRegistrySlice.ts`):
- **App** (type): cv-builder, tripplanner, blogengine, purefoy
- **Instance**: a named running context of an app type ("Tokyo Trip", "Berlin Trip")
- **Thread**: a named conversation within an instance ("Flights", "Hotels")

Multiple instances of the same app type are supported.

`activeAppType` from the Redux store is passed to frame-agent as context with every chat message, enabling domain routing.

## Theming

Carbon is a style layer. `src/themes/tokens.css` defines CSS custom property overrides for Carbon's token system.

**Dark / light mode** is controlled by the Redux `themeSlice` (`isDark: boolean`). The `<Theme>` component from `@carbon/react` reads that state and adds `.cds--g100` (dark) or `.cds--white` (light) to its wrapper div. `tokens.css` targets `.cds--g100` to apply the ojfbot dark-purple overrides — same selector specificity, later load order wins.

**Accent skin switcher** (`ojfbot` / `material` / `arc`) is the next layer, gated behind a `data-theme` attribute on `<html>`. Skin blocks are stubbed in `tokens.css` as comments — only `--ojf-*` brand tokens need overriding per skin, Carbon tokens derive from them automatically.

## Dev commands

```bash
pnpm install

# Start shell + frame-agent (sub-apps expected at their localhost ports)
pnpm dev:all
# or individually:
pnpm --filter @ojfbot/shell-app dev    # http://localhost:4000
pnpm --filter @ojfbot/frame-agent dev  # http://localhost:4001

# Full local cluster
docker compose up

# Type check all packages
pnpm type-check
```

Environment variables for frame-agent dev:
```bash
export ANTHROPIC_API_KEY=sk-ant-...
export CV_BUILDER_API_URL=http://localhost:3001
export BLOGENGINE_API_URL=http://localhost:3006
export TRIPPLANNER_API_URL=http://localhost:3011
```

## Sub-app Module Federation setup

Each sub-app needs `@originjs/vite-plugin-federation` added to its `vite.config.ts`:

```typescript
federation({
  name: 'cv_builder',          // matches shell's remotes key
  filename: 'remoteEntry.js',
  exposes: {
    './Dashboard': './src/components/Dashboard',
  },
  shared: ['react', 'react-dom', '@reduxjs/toolkit', 'react-redux'],
})
```

## K8s deployment

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/shell/
kubectl apply -f k8s/apps/
kubectl apply -f k8s/ingress/

# Create secrets (ONE key for the entire cluster — held by frame-agent)
kubectl create secret generic ojfbot-secrets \
  --namespace=frame \
  --from-literal=anthropic-api-key=$ANTHROPIC_API_KEY
```

Ingress routes:
- `app.jim.software` → shell (port 4000)
- `app.jim.software/frame-api` → frame-agent (port 4001)
- `cv.jim.software` → cv-builder (port 3000) + API (port 3001)
- `blog.jim.software` → BlogEngine
- `trips.jim.software` → TripPlanner
- `api.jim.software` → unified API routing

## Visual regression CI

The visual regression pipeline lives in cv-builder. The shell itself is not yet covered. This is tracked as a known gap.

## Roadmap

- [x] frame-agent: MetaOrchestratorAgent + 3 domain agents
- [x] @ojfbot/agent-core: shared BaseAgent + middleware
- [x] ShellHeader with chat input → frame-agent
- [x] chatSlice + store/hooks wired
- [x] Dark/light mode toggle (themeSlice in Redux, `<Theme>` class-based)
- [x] CI pipeline (type-check + build on PR and main push)
- [ ] `spawnInstance` wired to frame-agent NL command ("new trip to Berlin") — Phase 4
- [ ] Persist AppRegistry to localStorage
- [ ] Sub-app API migration: remove direct Anthropic calls, delegate to frame-agent — Phase 2
- [ ] Shell visual regression tests
