/**
 * Settings for all sub-apps, owned by the shell.
 *
 * Previously each client app held its own settings modal and local state.
 * ADR-0011 migrates that ownership here so settings are:
 *   - available from a single shell-level UI (SettingsModal)
 *   - reachable even when a sub-app pod is down
 *   - readable by sub-apps via the shared Redux singleton (MF shared packages)
 *
 * Each app section maps to one tab in SettingsModal.
 * Add new fields inside the relevant interface; TypeScript will enforce
 * that initialState is updated at the same time.
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

// ── Per-app settings interfaces ───────────────────────────────────────────────

export interface CvBuilderSettings {
  defaultTemplate: 'modern' | 'classic' | 'minimal'
  exportFormat: 'pdf' | 'docx'
  language: 'en' | 'fr' | 'de' | 'es'
}

export interface TripPlannerSettings {
  defaultCurrency: 'USD' | 'EUR' | 'GBP' | 'JPY'
  distanceUnit: 'km' | 'miles'
  defaultBudgetCategory: 'budget' | 'mid-range' | 'luxury'
}

export interface BlogEngineSettings {
  notionApiUrl: string
  defaultAuthor: string
  autoPublish: boolean
}

export interface PurefoySettings {
  apiEndpoint: string
  showDebugPanel: boolean
}

export interface SettingsState {
  cvBuilder: CvBuilderSettings
  tripPlanner: TripPlannerSettings
  blogEngine: BlogEngineSettings
  purefoy: PurefoySettings
}

// ── Initial state (mirrors the defaults previously inside each sub-app) ───────

const initialState: SettingsState = {
  cvBuilder: {
    defaultTemplate: 'modern',
    exportFormat: 'pdf',
    language: 'en',
  },
  tripPlanner: {
    defaultCurrency: 'USD',
    distanceUnit: 'km',
    defaultBudgetCategory: 'mid-range',
  },
  blogEngine: {
    notionApiUrl: '',
    defaultAuthor: '',
    autoPublish: false,
  },
  purefoy: {
    apiEndpoint: '',
    showDebugPanel: false,
  },
}

// ── Slice ─────────────────────────────────────────────────────────────────────

export const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    updateCvBuilderSettings(state, action: PayloadAction<Partial<CvBuilderSettings>>) {
      Object.assign(state.cvBuilder, action.payload)
    },
    updateTripPlannerSettings(state, action: PayloadAction<Partial<TripPlannerSettings>>) {
      Object.assign(state.tripPlanner, action.payload)
    },
    updateBlogEngineSettings(state, action: PayloadAction<Partial<BlogEngineSettings>>) {
      Object.assign(state.blogEngine, action.payload)
    },
    updatePurefoySettings(state, action: PayloadAction<Partial<PurefoySettings>>) {
      Object.assign(state.purefoy, action.payload)
    },
  },
})

export const {
  updateCvBuilderSettings,
  updateTripPlannerSettings,
  updateBlogEngineSettings,
  updatePurefoySettings,
} = settingsSlice.actions

export default settingsSlice.reducer
