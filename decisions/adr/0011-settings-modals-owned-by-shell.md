# ADR-0011: Settings Modals Owned by the Shell

**Date:** 2026-03-01
**Status:** Accepted
**Supersedes:** per-app local settings modals (cv-builder, tripplanner, blogengine, purefoy)

---

## Context

Each client application previously owned its own settings modal — fragmented UX, no shared state, and settings unreachable when a pod was down. This creates four compounding problems:

1. **Fragmented UX** — users open a different modal inside each app, each with its own visual style.
2. **No shared state** — settings lived in per-app local state, making cross-app preferences impossible (e.g., language affecting both CV Builder export and BlogEngine author name).
3. **Pod coupling** — a settings change requires the sub-app pod to be running. If the pod is down, settings are unreachable.
4. **Duplication** — every sub-app repeated the same modal open/close state, Carbon imports, and form patterns.

Additionally, as the shell evolves into a multi-app orchestration layer (frame-agent routing, cross-domain queries), uncontrolled inter-app state access becomes a security and correctness concern. A sub-app that can freely read another sub-app's settings creates an implicit coupling surface that is hard to audit and impossible to revoke.

---

## Decision

**Settings for all sub-apps are migrated into the shell, with an explicit isolation model.**

### 1. `settingsSlice` — shell Redux slice

A `settingsSlice.ts` is added to `packages/shell-app/src/store/slices/`. It holds typed settings namespaces for each app type:

```
state.settings.apps
  'cv-builder':  { defaultTemplate, exportFormat, language }
  'tripplanner': { defaultCurrency, distanceUnit, defaultBudgetCategory }
  'blogengine':  { notionApiUrl, defaultAuthor, autoPublish }
  'purefoy':     { apiEndpoint, showDebugPanel }
```

Each namespace has a dedicated `update*Settings(Partial<T>)` reducer.

### 2. `SettingsModal` — shell-owned UI with tab bar and search

`SettingsModal.tsx` renders a `ComposedModal` with:

- **`ModalHeader`** containing:
  - "Settings" title
  - A `Search` input that filters visible app tabs by field labels and keywords
  - A custom tab bar (`role="tablist"`) — one button per app type, rendered inside the header region so it remains visible while panel content scrolls
- **`ModalBody`** containing only the currently active panel (MF lazy-loaded from the sub-app)

The settings button in `HeaderGlobalBar` is always visible — settings are a shell-level concern, not gated on which app is active.

### 3. Isolation model — the firewall

The shell is the single authority over settings state. Sub-apps have **no cross-namespace visibility** by default. Enforcement operates at three layers:

**Layer 1 — Scoped selector.** `selectAppSettings(state, appType)` returns only that app's namespace. Sub-app panels should use this selector exclusively, not `state.settings.apps` directly.

**Layer 2 — Typed action creators.** Each update action creator (`updateCvBuilderSettings`, `updateTripPlannerSettings`, etc.) is scoped to one namespace. A sub-app panel imports only its own action creator — it cannot accidentally dispatch another app's update.

**Layer 3 — `AppCapabilityManifest`.** The settings slice holds an explicit capability manifest declaring which cross-namespace reads are authorized:

```typescript
// Default: firewall-closed. No cross-reads.
capabilities: {}

// To authorize TripPlanner to read CV Builder's language preference:
dispatch(setCapabilities({ 'tripplanner': { canReadFrom: ['cv-builder'] } }))
```

Only shell (SettingsModal, frame-agent) can dispatch `setCapabilities`. Sub-app panels have no authority over the firewall manifest.

### 4. Shell process scope

The shell SettingsModal has full cross-namespace visibility (operator/admin role). This is intentional and explicit. Outside of SettingsModal, shell components operate with scoped selectors — they know only what they need to know for their current context.

The pattern generalizes: shell capabilities are always explicitly declared, never implicitly inherited. When frame-agent routes a cross-domain query, it holds a named scope of active context rather than global visibility.

### 5. Sub-app panel contract

Sub-apps expose a `./Settings` component via Module Federation:

```typescript
// Sub-app vite.config.ts — adds to existing federation exposes:
exposes: {
  './Dashboard': './src/components/Dashboard',
  './Settings':  './src/components/SettingsPanel',  // new
}
```

The panel component receives one prop: `onClose?: () => void`. It reads its own settings via the scoped selector and dispatches only its own update action. It does not receive cross-app settings as props and cannot import cross-app selectors from the shell.

Because `@reduxjs/toolkit` and `react-redux` are in the MF `shared` array, sub-app panels run against the shell's Redux singleton at runtime — no prop-drilling needed.

### 6. Search — shell owns the schema

`SETTINGS_META` in `settings-loaders.ts` is a static registry of searchable field metadata per app (labels + keywords). Shell uses this to power the search bar without inspecting the lazy-loaded MF panel components.

This reinforces the isolation model: shell knows the settings schema, sub-apps own the rendering.

---

## Alternatives Considered

**A. Keep settings in each sub-app, expose via `GET /api/settings`** — rejected. Requires every sub-app pod available to render the settings UI. Settings become unreachable when a pod is down.

**B. `localStorage` only, no Redux** — rejected. No type-safe selectors, no DevTools visibility, bypasses the capability manifest model.

**C. Single flat `settings` object (no per-app namespacing)** — rejected. No namespace = no isolation = any sub-app can read any setting. Collapses the firewall model entirely.

**D. Shell owns form fields (not MF panels)** — rejected. Hardcoding every sub-app's form fields in the shell creates tight coupling — every new field requires a shell change. MF panels let sub-apps own their rendering while shell owns state authority.

---

## Consequences

**Positive:**
- Single settings entry point regardless of which app is active or whether pods are running.
- Explicit isolation: sub-apps cannot read each other's settings without a declared capability.
- `setCapabilities()` provides a typed, auditable API for any future cross-app preference sharing.
- Shell's `SETTINGS_META` registry gives the search bar a stable schema surface without dynamic introspection.

**Negative / Trade-offs:**
- Sub-apps must expose `./Settings` via MF to appear in the modal. Until a sub-app does so, the modal shows "No settings panel available."
- `settingsSlice.ts` grows as new apps are added. Mitigated by the `APP_CONFIG` precedent — one file to edit, TypeScript enforces completeness.
- `SETTINGS_META` must be kept in sync with sub-app panel field additions manually. No compile-time enforcement across the MF boundary.

---

## Related

- `settingsSlice.ts` — implementation, isolation model, selectors
- `SettingsModal.tsx` — shell UI (ComposedModal + tab bar + search)
- `settings-loaders.ts` — MF lazy loaders + SETTINGS_META registry
- `App.tsx` — settings button in HeaderGlobalBar
- ADR-0010 — APP_CONFIG single source of truth (parallel principle applied to settings)
- ADR-0014 — deployment topology (shell as static Layer 1; settings modal works without backend)
