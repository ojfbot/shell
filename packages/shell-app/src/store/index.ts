import { configureStore } from '@reduxjs/toolkit'
import appRegistryReducer, { APP_CONFIG, DEFAULT_INSTANCES } from './slices/appRegistrySlice.js'
import chatReducer from './slices/chatSlice.js'
import themeReducer from './slices/themeSlice.js'
import settingsReducer from './slices/settingsSlice.js'

// ── Settings persistence ──────────────────────────────────────────────────────
//
// settingsSlice state is persisted to localStorage under 'ojfbot:settings'.
// Loaded on init so settings survive page reload without redux-persist.
//
// Sensitive values (API keys) are never stored here — sub-apps hold those
// in their own localStorage keys. Only non-sensitive preferences + connection
// URLs live in this slice.

const SETTINGS_STORAGE_KEY = 'ojfbot:settings'
const REGISTRY_STORAGE_KEY = 'ojfbot:appRegistry'

function loadPersistedSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    return raw ? JSON.parse(raw) : undefined
  } catch {
    return undefined
  }
}

function loadPersistedRegistry() {
  try {
    const raw = localStorage.getItem(REGISTRY_STORAGE_KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw)
    // Shape guard: if the stored value doesn't look like AppRegistryState,
    // discard it rather than letting stale / renamed fields silently corrupt
    // Redux state. This fires naturally after schema-breaking changes (e.g.
    // a new deploy adds a required field, or DEFAULT_APP_TYPES changes).
    if (!Array.isArray(parsed?.instances)) return undefined
    // Migration: inject any singleton instances that are missing from persisted
    // state. This covers users whose stored registry predates a singleton app
    // type being added to DEFAULT_APP_TYPES (e.g. purefoy / core-reader).
    for (const [appType, cfg] of Object.entries(APP_CONFIG)) {
      if (cfg.singleton && !parsed.instances.some((i: { appType: string }) => i.appType === appType)) {
        const def = DEFAULT_INSTANCES.find(i => i.appType === appType)
        if (def) parsed.instances.push(def)
      }
    }
    return parsed
  } catch {
    return undefined
  }
}

const persistedSettings = loadPersistedSettings()
const persistedRegistry = loadPersistedRegistry()

export const store = configureStore({
  reducer: {
    appRegistry: appRegistryReducer,
    chat: chatReducer,
    theme: themeReducer,
    settings: settingsReducer,
  },
  preloadedState: {
    ...(persistedSettings ? { settings: persistedSettings } : {}),
    ...(persistedRegistry ? { appRegistry: persistedRegistry } : {}),
  },
})

// Debounced save — writes settings + appRegistry to localStorage 300ms after the last dispatch.
// Avoids thrashing storage on rapid save-on-change form interactions.
let saveTimer: ReturnType<typeof setTimeout>
store.subscribe(() => {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      const state = store.getState()
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(state.settings))
      localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(state.appRegistry))
    } catch {
      // QuotaExceededError or SecurityError in sandboxed iframes — ignore silently.
    }
  }, 300)
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
