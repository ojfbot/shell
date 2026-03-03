import { configureStore } from '@reduxjs/toolkit'
import appRegistryReducer from './slices/appRegistrySlice.js'
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

function loadPersistedSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    return raw ? JSON.parse(raw) : undefined
  } catch {
    return undefined
  }
}

const persistedSettings = loadPersistedSettings()

export const store = configureStore({
  reducer: {
    appRegistry: appRegistryReducer,
    chat: chatReducer,
    theme: themeReducer,
    settings: settingsReducer,
  },
  preloadedState: persistedSettings ? { settings: persistedSettings } : undefined,
})

// Debounced save — writes settings to localStorage 300ms after the last dispatch.
// Avoids thrashing storage on rapid save-on-change form interactions.
let saveTimer: ReturnType<typeof setTimeout>
store.subscribe(() => {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(store.getState().settings))
    } catch {
      // QuotaExceededError or SecurityError in sandboxed iframes — ignore silently.
    }
  }, 300)
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
