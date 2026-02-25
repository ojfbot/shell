# CLAUDE.md — ojfbot/shell

## What this repo is

`shell` is the Frame host application — the AI App OS that composes all ojfbot applications into a single interface.

**Architecture: Module Federation (Vite) + K8s pod cluster**

Each sub-app (cv-builder, BlogEngine, TripPlanner, purefoy) runs as an independent pod exposing its `Dashboard` component as a Vite Module Federation remote. The shell is the host that loads those remotes dynamically — no iframes, no page reloads, shared React/Redux singleton.

The K8s topology maps directly to the "browser as OS" metaphor:
- Each sub-app pod ≈ a browser process (isolated, independently deployable)
- The shell pod ≈ the browser chrome (persistent, composes the others)
- The ingress ≈ the browser's URL bar / routing layer
- The ShellAgent API ≈ the browser's AI layer

## Packages

| Package | Port | Purpose |
|---|---|---|
| `packages/shell-app` | 4000 | Vite Module Federation host. Header + AppSwitcher + AppFrame. |
| `packages/shell-agent` | 4001 | ShellAgent Express API. Routes natural language commands to active app's API. |

## Data model

App → Instance → Thread (see `appRegistrySlice.ts`):
- **App** (type): cv-builder, tripplanner, blogengine, purefoy
- **Instance**: a named running context of an app type ("Tokyo Trip", "Berlin Trip")
- **Thread**: a named conversation within an instance ("Flights", "Hotels")

Multiple instances of the same app type are supported.

## Theming

Carbon is a style layer. `src/themes/tokens.css` defines CSS custom property overrides for Carbon's token system. Switching `data-theme` on `<html>` toggles between:
- `ojfbot` — default dark, purple accent
- `material` — Material Design 3 inspired
- `arc` — Arc/TBC inspired

## Dev commands

```bash
pnpm install

# Start shell only (sub-apps expected at their localhost ports)
pnpm --filter @ojfbot/shell-app dev   # http://localhost:4000
pnpm --filter @ojfbot/shell-agent dev # http://localhost:4001

# Full local cluster
docker compose up

# Type check
pnpm type-check
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

See `k8s/README.md` for full setup instructions per app.

## K8s deployment

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/shell/
kubectl apply -f k8s/apps/
kubectl apply -f k8s/ingress/

# Create secrets
kubectl create secret generic ojfbot-secrets \
  --namespace=frame \
  --from-literal=anthropic-api-key=$ANTHROPIC_API_KEY
```

Ingress routes:
- `app.ojfbot.dev` → shell (port 4000)
- `cv.ojfbot.dev`  → cv-builder (port 3000) + API (port 3001)
- `blog.ojfbot.dev` → BlogEngine
- `trips.ojfbot.dev` → TripPlanner

## Visual regression CI

The visual regression pipeline lives in cv-builder. The shell itself is not yet covered. This is tracked as a known gap.

## Roadmap

- [ ] ShellAgent streaming chat (header command bar → active app orchestrator)
- [ ] ThemeSwitcher component (toggle ojfbot/material/arc in UI)
- [ ] `spawnInstance` wired to ShellAgent NL command ("new trip to Berlin")
- [ ] Persist AppRegistry to localStorage
- [ ] Shell visual regression tests
- [ ] CI pipeline (build + type-check on PR)
