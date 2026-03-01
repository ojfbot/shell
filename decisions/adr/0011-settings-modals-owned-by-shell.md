# ADR-0011: Settings Modals Owned by the Shell

**Date:** 2026-03-01
**Status:** Accepted
**Deciders:** Frame shell team

---

## Context

Each client application (cv-builder, tripplanner, blogengine, purefoy) previously owned its own settings modal. This created several problems:

- **Fragmented UX** — users had to open a different settings panel inside each app, each with its own visual style and interaction model.
- **No shared state** — settings lived in per-app local state or per-app Redux slices, making it impossible for cross-app features (e.g. language preference affecting the CV Builder's export and the BlogEngine's author name) to read a common value.
- **Duplicated plumbing** — every sub-app repeated the same modal open/close state, Carbon `Modal` import, and form-field patterns.
- **Pod coupling** — a settings change required the sub-app pod to be running; if the pod was down, settings were unreachable.

The shell already owns app-level concerns (theme, navigation, breadcrumb, chat). Settings are an app-level concern, not a feature-level concern.

---

## Decision

**Settings for all sub-apps are migrated into the shell.**

### 1. `settingsSlice` — shell Redux slice

A new `settingsSlice.ts` is added to `packages/shell-app/src/store/slices/`. It defines typed settings interfaces for each app type and an `initialState` that matches the defaults previously held inside each sub-app:

```
SettingsState
  cvBuilder:    { defaultTemplate, exportFormat, language }
  tripPlanner:  { defaultCurrency, distanceUnit, defaultBudgetCategory }
  blogEngine:   { notionApiUrl, defaultAuthor, autoPublish }
  purefoy:      { apiEndpoint, showDebugPanel }
```

Each app section has a dedicated `update*Settings` reducer that accepts a `Partial<T>` payload so callers only need to specify the fields they are changing.

### 2. `SettingsModal` — shell-owned UI

A new `SettingsModal.tsx` component renders a Carbon `Modal` (passiveModal — settings save on change, no explicit Save button needed) with a `Tabs`/`TabList`/`TabPanel` layout: one tab per app type.

The modal is opened from a Settings icon (`⚙`) added to the `HeaderGlobalBar` in `App.tsx`, consistent with the existing theme-toggle icon.

### 3. Sub-apps read from the shared Redux store

Because Module Federation's `shared` array in `vite.config.ts` includes `@reduxjs/toolkit` and `react-redux`, the shell and all sub-apps run against the **same Redux singleton at runtime**. Sub-apps can import `useAppSelector` and read `state.settings.*` directly — no prop-drilling or new inter-app API needed.

Sub-apps should remove their own settings modals and read from `state.settings` once they adopt this slice (tracked as a follow-on task per sub-app repo).

### 4. `APP_CONFIG` is not modified

Settings are user preferences, not app metadata. They belong in `settingsSlice`, not in `APP_CONFIG`. The single-source-of-truth principle from ADR-0010 is preserved; the two slices remain orthogonal.

---

## Alternatives Considered

**A. Keep settings in each sub-app, expose via `GET /api/settings`** — rejected. This requires every sub-app pod to be available to render the settings UI. The shell-level settings modal works even when a sub-app pod is down.

**B. Store settings in `localStorage` only (no Redux)** — rejected. Redux gives type-safe selectors, DevTools visibility, and compatibility with the future `localStorage` persistence roadmap item. `localStorage`-only would bypass all of that.

**C. Single flat `settings` object (no per-app namespacing)** — rejected. Namespacing by app type (`cvBuilder`, `tripPlanner`, …) makes it trivial to pass a sub-app's entire settings block as a prop or selector, and avoids key collisions as the app list grows.

---

## Consequences

**Positive:**
- Single settings entry point for the user regardless of which app is active.
- Settings are accessible even when a sub-app pod is not running.
- Sub-apps stop duplicating modal boilerplate; they become pure data consumers.
- Consistent Carbon design token application — one modal styled once.

**Negative / Trade-offs:**
- `settingsSlice.ts` grows as new app types are added; mitigated by the `APP_CONFIG` precedent (one file to edit, TypeScript enforces completeness).
- Sub-apps must be updated to remove their own settings modals and read from `state.settings` — this is a follow-on migration per sub-app repo, not a breaking change (both can coexist temporarily).

---

## Related

- `settingsSlice.ts` — implementation
- `SettingsModal.tsx` — shell UI component
- `App.tsx` — settings button in `HeaderGlobalBar`
- ADR-0010 — `APP_CONFIG` single source of truth (parallel principle applied to settings)
