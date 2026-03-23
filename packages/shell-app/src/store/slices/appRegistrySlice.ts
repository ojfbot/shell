/**
 * App → Instance → Thread hierarchy.
 *
 * AppType      — the kind of application (resume-builder, tripplanner, etc.)
 * AppInstance  — a named running instance of an AppType
 *                e.g. two TripPlanner instances: "Tokyo Trip" and "Berlin Trip"
 * AppThread    — a named conversation within an instance
 *                e.g. "Flights", "Hotels", "Itinerary" inside "Tokyo Trip"
 *
 * This mirrors how a browser thinks about apps:
 *   App type  ≈ website
 *   Instance  ≈ window / tab group
 *   Thread    ≈ tab
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

// ── Types ────────────────────────────────────────────────────────────────────

export type AppType = 'resume-builder' | 'tripplanner' | 'blogengine' | 'purefoy' | 'core-reader' | 'lean-canvas' | 'gastown-pilot'

/**
 * Static metadata the shell holds for each registered app type.
 * This is the single source of truth for all app-level display names, remote
 * URLs, and default instance names.  Do NOT duplicate these values anywhere
 * else in the shell — derive APP_LABELS, APP_TYPES, and DEFAULT_INSTANCES
 * from this record instead.
 *
 * Sub-apps self-identify at runtime via GET /api/tools (see ADR-0010).
 * Shell remains authoritative; client apps confirm, not define.
 */
export interface AppConfig {
  /** Human-readable label used in breadcrumb + sidebar. */
  label: string
  /** Module Federation remote URL, resolved from env at build time. */
  remoteUrl: string
  /** Name given to the first instance created for this app type. */
  defaultInstanceName: string
  /**
   * When true, exactly one instance is always maintained.
   * `spawnInstance` is a no-op for singleton types; the `+ New` button is
   * hidden in the sidebar. The single instance is bootstrapped in
   * DEFAULT_INSTANCES and persisted state is patched on load if it's missing.
   */
  singleton?: boolean
}

export const APP_CONFIG: Record<AppType, AppConfig> = {
  'resume-builder': {
    label: 'Resume Builder',
    remoteUrl: import.meta.env.VITE_REMOTE_RESUME_BUILDER ?? 'http://localhost:3000',
    defaultInstanceName: 'Start Fresh',
    singleton: true,
  },
  'tripplanner': {
    label: 'TripPlanner',
    remoteUrl: import.meta.env.VITE_REMOTE_TRIPPLANNER ?? 'http://localhost:3010',
    defaultInstanceName: 'My Trips',
  },
  'blogengine': {
    label: 'BlogEngine',
    remoteUrl: import.meta.env.VITE_REMOTE_BLOGENGINE ?? 'http://localhost:3005',
    defaultInstanceName: 'Blog',
  },
  'purefoy': {
    label: 'Purefoy',
    remoteUrl: import.meta.env.VITE_REMOTE_PUREFOY ?? 'http://localhost:3020',
    defaultInstanceName: 'Purefoy',
    singleton: true,
  },
  'core-reader': {
    label: 'CoreReader',
    remoteUrl: import.meta.env.VITE_REMOTE_CORE_READER ?? 'http://localhost:3015',
    defaultInstanceName: 'CoreReader',
    singleton: true,
  },
  'lean-canvas': {
    label: 'Lean Canvas',
    remoteUrl: import.meta.env.VITE_REMOTE_LEAN_CANVAS ?? 'http://localhost:3025',
    defaultInstanceName: 'My Canvas',
    singleton: false,
  },
  'gastown-pilot': {
    label: 'Gas Town',
    remoteUrl: import.meta.env.VITE_REMOTE_GASTOWN_PILOT ?? 'http://localhost:3017',
    defaultInstanceName: 'Gas Town',
    singleton: false,
  },
}

/** Derived — do NOT add entries here; update APP_CONFIG above instead. */
export const APP_TYPES = Object.keys(APP_CONFIG) as AppType[]

/** Derived — do NOT add entries here; update APP_CONFIG above instead. */
export const APP_LABELS: Record<AppType, string> = Object.fromEntries(
  Object.entries(APP_CONFIG).map(([k, v]) => [k, v.label])
) as Record<AppType, string>

export interface AppThread {
  id: string
  name: string           // "Flights", "Hotel search", "Itinerary v2"
  createdAt: string
  lastActivity: string
  messageCount: number
}

export interface AppInstance {
  id: string
  appType: AppType
  name: string           // "Tokyo Trip", "Berlin Trip", "My CV"
  remoteUrl: string      // resolved at spawn time from env/registry
  threads: AppThread[]
  activeThreadId: string | null
  createdAt: string
  lastActivity: string
}

interface AppRegistryState {
  instances: AppInstance[]
  activeInstanceId: string | null
  // Convenience: which appType is currently foregrounded (for ShellAgent routing)
  activeAppType: AppType | null
  /** Set when spawnInstance creates a new instance; cleared after animation completes. */
  lastSpawnedInstanceId: string | null
}

// ── Default instances (one per app type on first load) ────────────────────────
// Derived from APP_CONFIG — do NOT hardcode URLs or names here.

// All app types that get a bootstrapped instance on first load.
// NOTE: tripplanner GET /api/tools is Phase 1B (not done) — AppFrame handles
// remote-load failures gracefully. Remove if first-visit errors are disruptive.
// purefoy and core-reader are singletons — always present, no + New button.
export const DEFAULT_APP_TYPES: AppType[] = ['resume-builder', 'blogengine', 'tripplanner', 'purefoy', 'core-reader', 'lean-canvas', 'gastown-pilot']

// Exported so store/index.ts can patch missing singleton instances into old
// persisted state without duplicating the instance construction logic.
export const DEFAULT_INSTANCES: AppInstance[] = DEFAULT_APP_TYPES.map(appType => ({
  id: `default-${appType}`,
  appType,
  name: APP_CONFIG[appType].defaultInstanceName,
  remoteUrl: APP_CONFIG[appType].remoteUrl,
  threads: [{ id: 'default', name: 'Main', createdAt: new Date().toISOString(), lastActivity: new Date().toISOString(), messageCount: 0 }],
  activeThreadId: 'default',
  createdAt: new Date().toISOString(),
  lastActivity: new Date().toISOString(),
}))

const initialState: AppRegistryState = {
  instances: DEFAULT_INSTANCES,
  activeInstanceId: null,  // HomeScreen shown until user picks an app
  activeAppType: null,
  lastSpawnedInstanceId: null,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function now() { return new Date().toISOString() }
function uid() { return crypto.randomUUID() }

// ── Slice ─────────────────────────────────────────────────────────────────────

export const appRegistrySlice = createSlice({
  name: 'appRegistry',
  initialState,
  reducers: {
    // Activate an existing instance (foreground it)
    activateInstance(state, action: PayloadAction<string>) {
      const inst = state.instances.find(i => i.id === action.payload)
      if (inst) {
        state.activeInstanceId = inst.id
        state.activeAppType = inst.appType
        inst.lastActivity = now()
      }
    },

    // Spawn a new named instance of an app type
    spawnInstance(state, action: PayloadAction<{
      appType: AppType
      name: string
      remoteUrl: string
    }>) {
      const { appType, name, remoteUrl } = action.payload
      // Singletons may never have more than one instance
      if (APP_CONFIG[appType].singleton && state.instances.some(i => i.appType === appType)) return
      const instance: AppInstance = {
        id: uid(),
        appType,
        name,
        remoteUrl,
        threads: [{ id: uid(), name: 'Main', createdAt: now(), lastActivity: now(), messageCount: 0 }],
        activeThreadId: null,
        createdAt: now(),
        lastActivity: now(),
      }
      instance.activeThreadId = instance.threads[0].id
      state.instances.push(instance)
      state.activeInstanceId = instance.id
      state.activeAppType = appType
      state.lastSpawnedInstanceId = instance.id
    },

    // Close an instance (cannot close the last instance of an app type)
    closeInstance(state, action: PayloadAction<string>) {
      const idx = state.instances.findIndex(i => i.id === action.payload)
      if (idx === -1) return
      const { appType } = state.instances[idx]
      const remaining = state.instances.filter(i => i.appType === appType)
      if (remaining.length <= 1) return  // never close the last one
      state.instances.splice(idx, 1)
      if (state.activeInstanceId === action.payload) {
        const fallback = state.instances.findLast(i => i.appType === appType)
        state.activeInstanceId = fallback?.id ?? state.instances[0]?.id ?? null
        state.activeAppType = fallback?.appType ?? state.instances[0]?.appType ?? null
      }
    },

    // ── Thread management within an instance ──────────────────────────────────

    addThread(state, action: PayloadAction<{ instanceId: string; name: string }>) {
      const inst = state.instances.find(i => i.id === action.payload.instanceId)
      if (!inst) return
      const thread: AppThread = {
        id: uid(),
        name: action.payload.name,
        createdAt: now(),
        lastActivity: now(),
        messageCount: 0,
      }
      inst.threads.push(thread)
      inst.activeThreadId = thread.id
      inst.lastActivity = now()
    },

    activateThread(state, action: PayloadAction<{ instanceId: string; threadId: string }>) {
      const inst = state.instances.find(i => i.id === action.payload.instanceId)
      if (inst) {
        inst.activeThreadId = action.payload.threadId
        inst.lastActivity = now()
      }
    },

    renameThread(state, action: PayloadAction<{ instanceId: string; threadId: string; name: string }>) {
      const inst = state.instances.find(i => i.id === action.payload.instanceId)
      const thread = inst?.threads.find(t => t.id === action.payload.threadId)
      if (thread) thread.name = action.payload.name
    },

    removeThread(state, action: PayloadAction<{ instanceId: string; threadId: string }>) {
      const inst = state.instances.find(i => i.id === action.payload.instanceId)
      if (!inst || inst.threads.length <= 1) return
      inst.threads = inst.threads.filter(t => t.id !== action.payload.threadId)
      if (inst.activeThreadId === action.payload.threadId) {
        inst.activeThreadId = inst.threads[inst.threads.length - 1].id
      }
    },

    bumpThreadActivity(state, action: PayloadAction<{ instanceId: string; threadId: string }>) {
      const inst = state.instances.find(i => i.id === action.payload.instanceId)
      const thread = inst?.threads.find(t => t.id === action.payload.threadId)
      if (thread) {
        thread.lastActivity = now()
        thread.messageCount += 1
      }
      if (inst) inst.lastActivity = now()
    },

    // Clear the spawn animation flag after animation completes
    clearLastSpawned(state) {
      state.lastSpawnedInstanceId = null
    },

    // Return to HomeScreen — clears the active instance without closing it
    goHome(state) {
      state.activeInstanceId = null
      state.activeAppType = null
    },
  },
})

export const {
  activateInstance,
  spawnInstance,
  closeInstance,
  addThread,
  activateThread,
  renameThread,
  removeThread,
  bumpThreadActivity,
  clearLastSpawned,
  goHome,
} = appRegistrySlice.actions

export default appRegistrySlice.reducer
