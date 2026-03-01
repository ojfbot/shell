# ADR-0010: APP_CONFIG as Single Source of Truth for Shell App Registry

**Date:** 2026-02-28
**Status:** Accepted
**Deciders:** Frame shell team

---

## Context

The shell maintains a registry of all sub-apps it can load via Module Federation. Before this ADR, app metadata (display labels, remote URLs, default instance names) was scattered across multiple files:

- `APP_LABELS` defined locally in both `App.tsx` and `AppSwitcher.tsx` (duplicate)
- `APP_REMOTE_DEFAULTS` defined locally in `AppSwitcher.tsx`
- `APP_TYPES` defined locally in `AppSwitcher.tsx` as a hand-maintained array
- `DEFAULT_INSTANCES` in `appRegistrySlice.ts` hardcoded remote URLs and names inline

Any new app type required edits in 4+ locations with no compile-time enforcement. A reviewer flagged this as a brittle pattern: a single name change required hunting and updating every site.

Additionally, the `domain-knowledge/` directory held individual file symlinks into `core/domain-knowledge/` rather than being a directory symlink, causing new files added to core to be invisible to the shell without manual relinking.

---

## Decision

### 1. APP_CONFIG is the single source of truth

A new `APP_CONFIG: Record<AppType, AppConfig>` constant is declared in `appRegistrySlice.ts`. It is the **only** place where app metadata is defined:

```typescript
export interface AppConfig {
  label: string                  // rendered in breadcrumb + sidebar
  remoteUrl: string              // MF remote URL (from env vars)
  defaultInstanceName: string   // name of the first auto-created instance
}

export const APP_CONFIG: Record<AppType, AppConfig> = { ... }
```

All other consumers **derive** from `APP_CONFIG`:

```typescript
export const APP_TYPES = Object.keys(APP_CONFIG) as AppType[]
export const APP_LABELS = Object.fromEntries(
  Object.entries(APP_CONFIG).map(([k, v]) => [k, v.label])
) as Record<AppType, string>
```

`DEFAULT_INSTANCES` is derived by mapping `APP_CONFIG` — no hardcoded URLs or names remain outside this one record.

**Adding a new app type requires editing exactly one location: `APP_CONFIG`.**

### 2. Shell is authoritative; sub-apps self-identify at runtime

The shell holds the static registry (`APP_CONFIG`). Sub-apps do not push their metadata into the shell at build time. Instead, at runtime sub-apps expose a capability manifest via `GET /api/tools` (see ADR-XXXX for tools endpoint spec). The shell *may* use this to validate or enrich the registry, but never replaces its own record with the sub-app's self-report.

Principle: **shell authoritative, sub-apps confirmatory**.

This avoids the failure mode where a misbehaving sub-app can alter what the shell displays or routes to.

### 3. domain-knowledge is a directory symlink

`shell/domain-knowledge` is now a single symlink to `../core/domain-knowledge/` rather than a directory holding individual file symlinks. This means any file added to core's `domain-knowledge/` is automatically visible in the shell without manual intervention. The path is already in `.gitignore` so no symlink target is committed.

---

## Alternatives Considered

**A. Keep per-file constants, enforce via lint rule** — rejected. Lint rules can be suppressed; compile errors from a missing `APP_CONFIG` entry cannot. Single source + derived exports is safer.

**B. Sub-apps register themselves into shell state at startup** — rejected. This would mean the shell's display is contingent on sub-app availability, causing blank labels if a pod is down. Static shell registry is resilient by default; dynamic enrichment is additive.

**C. Separate config file (JSON/YAML)** — rejected. The `AppType` union type and `import.meta.env` references need TypeScript; a JSON config would lose type safety and env resolution. Keeping config in the slice file means a single TS file owns the type definition and its values.

---

## Consequences

**Positive:**
- Adding a new app type: one edit in `appRegistrySlice.ts`, TypeScript enforces completeness via `Record<AppType, AppConfig>`
- Removing a dead app type: one edit, TypeScript flags all remaining call sites
- `domain-knowledge/` in shell always mirrors core without manual maintenance

**Negative / Trade-offs:**
- `appRegistrySlice.ts` becomes the "king" file — it must be reviewed carefully when changed
- `import.meta.env` in a Redux slice is slightly unusual; it is acceptable because this is build-time config, not runtime state

---

## Related

- `appRegistrySlice.ts` — implementation
- `AppSwitcher.tsx` — primary consumer
- `App.tsx` — breadcrumb consumer
- ADR-XXXX (pending) — `GET /api/tools` capability manifest contract
