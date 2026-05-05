# Frame OS Shell

> The AI-native application OS — a Module Federation host that composes Claude-powered apps into a unified interface.

Frame OS treats the browser like an operating system. Each application runs as an independent Module Federation remote (no iframes, no page reloads) while sharing a single React/Redux runtime. A central LLM gateway (`frame-agent`) routes natural-language intent to domain-specific agents, so every app in the ecosystem gets AI capabilities through one API key.

**Why Module Federation:** Each sub-app is a true React remote — shared singletons for Redux and Carbon tokens, independent deployment per app, and the shell provides the window chrome. This is the same compositional pattern that powers Figma plugins, Shopify extensions, and browser-based OS environments. The alternative (iframes) means duplicated runtimes, broken accessibility trees, and no shared state.

- **Module Federation host** — sub-apps load as true React remotes with shared singletons
- **frame-agent LLM gateway** — single Anthropic API key powers all domain agents
- **Natural-language routing** — ShellAgent classifies intent and delegates to the right domain
- **Multi-instance apps** — run multiple instances of the same app type ("Tokyo Trip", "Berlin Trip")
- **Cross-domain coordination** — fan-out queries across domain agents with approval queue for high-impact actions
- **Dark/light theming** — Carbon Design System tokens with accent skin switcher
- **K8s-native topology** — each sub-app is an independent pod; the shell is the browser chrome
- **AgentBead bridge** — maps Claude Code lifecycle to Gas Town bead emissions (ADR-0043)
- **Fleet-wide `/api/beads`** — Dolt-first aggregation with filesystem fallback
- **Visual regression CI** — browser-automation package with screenshot baselines
## Architecture

```
shell-app (port 4000)
  └── frame-agent (port 4001) — single Anthropic API key
        ├── ShellAgent         — classifies + routes NL, spawns instances, approval queue
        ├── CvBuilderDomainAgent
        ├── BlogEngineDomainAgent
        ├── TripPlannerDomainAgent
        ├── GastownPilotDomainAgent
         └── (cross-domain fan-out — ADR-0013 scoped history per domain)

        ↓ delegates CRUD to:
        cv-builder-api (:3001)  blogengine-api (:3006)  tripplanner-api (:3011)
```

Sub-app APIs expose `GET /api/tools` returning their capability manifest. Domain agents in frame-agent call sub-app APIs for data — no direct Anthropic calls in sub-apps.

## Packages

| Package | Port | Role |
|---------|------|------|
| `packages/shell-app` | 4000 | Vite Module Federation host — header, app switcher, app frame |
| `packages/frame-agent` | 4001 | Meta-orchestrator + LLM gateway for the entire cluster |
| `packages/agent-core` | — | Shared npm package: BaseAgent, AgentManager, middleware |
| `@ojfbot/frame-ui-components` | — | Shared component library (Carbon DS tokens, published to npm) |

## Registered Apps

| App | Frontend | API | Status |
|-----|----------|-----|--------|
| cv-builder | :3000 | :3001 | Live |
| blogengine | :3005 | :3006 | Live |
| TripPlanner | :3010 | :3011 | Live |
| core-reader | :3015 | :3016 | Live |
| lean-canvas | :3025 | :3026 | Scaffolded |
| gastown-pilot | :3017 | :3018 | Scaffolded |
| seh-study | :3030 | :3031 | Scaffolded |
| asset-foundry | :3035 | — | Registered (pending port-collision resolution) |
| purefoy | — | — | Singleton (no API) |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Build | Vite 5, Module Federation (`@originjs/vite-plugin-federation`) |
| UI | React 18, Carbon Design System |
| State | Redux Toolkit (shared singleton across host + remotes) |
| AI | Express (frame-agent), Anthropic SDK, LangGraph |
| Infra | Docker Compose, Kubernetes, Vercel |
| Language | TypeScript |

## Getting Started

**Prerequisites:** Node >= 24 (via `fnm use`), pnpm 9

```bash
pnpm install

# Set environment variables
export ANTHROPIC_API_KEY=sk-ant-...
export CV_BUILDER_API_URL=http://localhost:3001
export BLOGENGINE_API_URL=http://localhost:3006
export TRIPPLANNER_API_URL=http://localhost:3011

# Start shell + frame-agent
pnpm dev:all

# Or individually
pnpm --filter @ojfbot/shell-app dev    # http://localhost:4000
pnpm --filter @ojfbot/frame-agent dev  # http://localhost:4001
```

Sub-apps run independently at their assigned ports. The shell loads their `remoteEntry.js` at runtime.

## Deployment

**Vercel (CDN layer):** Production at `frame.jim.software`. Static shell-app assets served from edge.

**Kubernetes (full cluster):**

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/shell/
kubectl apply -f k8s/apps/
kubectl apply -f k8s/ingress/
```

Ingress routes: `app.jim.software` (shell), `cv.jim.software` (cv-builder), `blog.jim.software` (blogengine), `trips.jim.software` (TripPlanner).

## Roadmap

- [ ] Sub-app API migration: remove direct Anthropic calls, delegate to frame-agent
- [x] Visual regression baselines (browser-automation + Playwright fleet-wide)

<details>
<summary>Completed milestones</summary>

- [x] frame-agent: MetaOrchestratorAgent + domain agents
- [x] @ojfbot/agent-core: shared BaseAgent + middleware
- [x] ShellHeader with chat input routed to frame-agent
- [x] Dark/light mode toggle (Carbon token-based theming)
- [x] Module Federation remotes: cv-builder, BlogEngine, TripPlanner, core-reader connected
- [x] SettingsModal: multi-panel, per-app settings, search, localStorage persistence
- [x] Vercel production deployment (frame.jim.software)
- [x] Natural-language instance spawning ("new trip to Berlin")
- [x] G3 Approval Queue for high-impact cross-app actions
- [x] Multi-instance UI with session persistence and singleton enforcement
- [x] Storybook stories + CI build gates
- [x] FrameBus typed pub/sub (ADR-0013 + BroadcastChannel/CustomEvent fallback)
- [x] Playwright smoke tests (deep-link, HomeScreen, invalid app)
- [x] Header decomposition (HeaderInput, ChatHistoryOverlay, DomainBadge)
- [x] SettingsModal decomposition (SettingsErrorBoundary, SettingsTabBar, sub-components)
- [x] Cross-repo Storybook composition
- [x] @ojfbot/frame-ui-components published to npm (fleet-wide migration from file: paths)
- [x] AgentBead bridge — Claude Code lifecycle → Gas Town bead emissions (ADR-0043)
- [x] GET /api/beads fleet-wide aggregation (Dolt-first + filesystem fallback)
- [x] browser-automation visual regression CI (fleet-wide)
- [x] Container-presenter decomposition (StudyPanel, ChangesTab, TranscriptViewer)

</details>

## License

MIT

## Frame OS Ecosystem

Part of [Frame OS](https://github.com/ojfbot/shell) — an AI-native application OS.

| Repo | Description |
|------|-------------|
| **shell** | **Module Federation host + frame-agent LLM gateway (this repo)** |
| [core](https://github.com/ojfbot/core) | Workflow framework — 30+ slash commands + TypeScript engine |
| [cv-builder](https://github.com/ojfbot/cv-builder) | AI-powered resume builder with LangGraph agents |
| [blogengine](https://github.com/ojfbot/BlogEngine) | AI blog content creation platform |
| [TripPlanner](https://github.com/ojfbot/TripPlanner) | AI trip planner with 11-phase pipeline |
| [core-reader](https://github.com/ojfbot/core-reader) | Documentation viewer for the core framework |
| [lean-canvas](https://github.com/ojfbot/lean-canvas) | AI-powered lean canvas business model tool |
| [gastown-pilot](https://github.com/ojfbot/gastown-pilot) | Multi-agent coordination dashboard |
| [seh-study](https://github.com/ojfbot/seh-study) | NASA SEH spaced repetition study tool |
| [asset-foundry](https://github.com/ojfbot/asset-foundry) | 3D asset pipeline with dual Blender transports |
| [beaverGame](https://github.com/ojfbot/beaverGame) | Babylon.js dodge gameplay |
| [github-actions](https://github.com/ojfbot/github-actions) | Shared composite CI actions (skill-audit, etc.) |
| [daily-logger](https://github.com/ojfbot/daily-logger) | Automated daily dev blog pipeline |
| [purefoy](https://github.com/ojfbot/purefoy) | Roger Deakins cinematography knowledge base |
| [MrPlug](https://github.com/ojfbot/MrPlug) | Chrome extension for AI UI feedback |
| [frame-ui-components](https://github.com/ojfbot/frame-ui-components) | Shared component library (Carbon DS) |
