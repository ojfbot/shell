/**
 * settingsSlice — shell-owned settings state for all sub-apps.
 *
 * ── Isolation model (ADR-0011 §Isolation) ─────────────────────────────────────
 *
 * Shell is the single authority over settings state. Sub-apps read their
 * own namespace via the shared Redux singleton (MF shared packages) but
 * are NOT authorized to read other apps' namespaces. Enforcement layers:
 *
 *   1. Scoped selector: `selectAppSettings(state, appType)` returns only
 *      that app's namespace. Sub-apps should use ONLY this selector.
 *   2. Typed update actions per app: each update action creator is scoped
 *      to one namespace. A sub-app panel can import only its own action.
 *   3. AppCapabilityManifest: shell declares any explicitly-authorized
 *      cross-reads. Default: empty = firewall-closed. No cross-reads.
 *
 * Shell's SettingsModal is the only consumer with full cross-app visibility
 * (operator/admin role). It reads `state.settings.apps` directly.
 *
 * ── Sub-app consumption pattern ───────────────────────────────────────────────
 *
 *   // In a sub-app Settings panel component:
 *   import { useAppSelector } from 'shell/store/hooks'  // or via MF shared
 *   import { selectAppSettings } from 'shell/store/slices/settingsSlice'
 *
 *   const settings = useAppSelector(s => selectAppSettings(s, 'cv-builder'))
 *   // Only 'cv-builder' namespace visible — firewall enforced by selector.
 *
 * ── Cross-app read authorization (future) ─────────────────────────────────────
 *
 *   // To authorize TripPlanner to read CV Builder's language preference:
 *   dispatch(setCapabilities({ 'tripplanner': { canReadFrom: ['cv-builder'] } }))
 *   // Then check: canReadCrossApp(state, 'tripplanner', 'cv-builder') === true
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AppType } from './appRegistrySlice.js'

// ── Per-app settings interfaces ───────────────────────────────────────────────

export interface CvBuilderSettings {
  // ── Connection ──────────────────────────────────────────────────────────────
  /** Runtime API base URL override. Empty string = use VITE_API_URL env default. */
  apiBaseUrl: string
  // ── Preferences ─────────────────────────────────────────────────────────────
  defaultTemplate: 'modern' | 'classic' | 'minimal'
  exportFormat: 'pdf' | 'docx'
  language: 'en' | 'fr' | 'de' | 'es'
}

export interface TripPlannerSettings {
  // ── Connection ──────────────────────────────────────────────────────────────
  /** Runtime API base URL override. Empty string = use VITE_API_URL env default. */
  apiBaseUrl: string
  // ── Preferences ─────────────────────────────────────────────────────────────
  defaultCurrency: 'USD' | 'EUR' | 'GBP' | 'JPY'
  distanceUnit: 'km' | 'miles'
  defaultBudgetCategory: 'budget' | 'mid-range' | 'luxury'
}

export interface BlogEngineSettings {
  // ── Connection ──────────────────────────────────────────────────────────────
  /** Runtime API base URL override. Empty string = use VITE_API_BASE_URL env default. */
  apiBaseUrl: string
  // ── Preferences ─────────────────────────────────────────────────────────────
  /** Notion integration URL (non-sensitive — just a URL, not an API key). */
  notionApiUrl: string
  defaultAuthor: string
  autoPublish: boolean
  autoSave: boolean
  seoSuggestions: boolean
}

export interface PurefoySettings {
  // ── Connection ──────────────────────────────────────────────────────────────
  /** Runtime API endpoint override. */
  apiBaseUrl: string
  // ── Preferences ─────────────────────────────────────────────────────────────
  showDebugPanel: boolean
}

// ── App settings map ──────────────────────────────────────────────────────────

export interface AppsSettings {
  'cv-builder': CvBuilderSettings
  'tripplanner': TripPlannerSettings
  'blogengine': BlogEngineSettings
  'purefoy': PurefoySettings
}

// ── Capability manifest (firewall) ────────────────────────────────────────────
//
// Declares which other apps' namespaces a given app is authorized to read.
// Default: empty object = no cross-reads authorized (firewall-closed).
//
// Shell's SettingsModal bypasses this manifest — it has full operator
// visibility as the admin layer. This manifest governs sub-app-to-sub-app
// reads via agent/automation, not the shell operator UI.

export type AppCapabilityManifest = {
  [K in AppType]?: {
    /** Other app namespaces this app may read. Empty = none. */
    canReadFrom: AppType[]
  }
}

// ── State ─────────────────────────────────────────────────────────────────────

export interface SettingsState {
  apps: AppsSettings
  /**
   * Firewall manifest. Explicitly-closed by default — no cross-reads.
   * Shell is the only actor that can open entries via setCapabilities().
   */
  capabilities: AppCapabilityManifest
}

const initialState: SettingsState = {
  apps: {
    'cv-builder': {
      apiBaseUrl: '',
      defaultTemplate: 'modern',
      exportFormat: 'pdf',
      language: 'en',
    },
    'tripplanner': {
      apiBaseUrl: '',
      defaultCurrency: 'USD',
      distanceUnit: 'km',
      defaultBudgetCategory: 'mid-range',
    },
    'blogengine': {
      apiBaseUrl: '',
      notionApiUrl: '',
      defaultAuthor: '',
      autoPublish: false,
      autoSave: true,
      seoSuggestions: true,
    },
    'purefoy': {
      apiBaseUrl: '',
      showDebugPanel: false,
    },
  },
  // Firewall-closed by default. Add explicit entries to authorize cross-reads.
  capabilities: {},
}

// ── Slice ─────────────────────────────────────────────────────────────────────

export const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    /** CV Builder only — sub-app panel imports this action, not cross-app ones. */
    updateCvBuilderSettings(state, action: PayloadAction<Partial<CvBuilderSettings>>) {
      Object.assign(state.apps['cv-builder'], action.payload)
    },
    /** TripPlanner only. */
    updateTripPlannerSettings(state, action: PayloadAction<Partial<TripPlannerSettings>>) {
      Object.assign(state.apps['tripplanner'], action.payload)
    },
    /** BlogEngine only. */
    updateBlogEngineSettings(state, action: PayloadAction<Partial<BlogEngineSettings>>) {
      Object.assign(state.apps['blogengine'], action.payload)
    },
    /** Purefoy only. */
    updatePurefoySettings(state, action: PayloadAction<Partial<PurefoySettings>>) {
      Object.assign(state.apps['purefoy'], action.payload)
    },
    /**
     * Shell-only: update the capability manifest.
     * Only the shell operator (SettingsModal, frame-agent) should dispatch this.
     * Sub-apps must not dispatch setCapabilities — they have no authority over
     * the firewall manifest.
     */
    setCapabilities(state, action: PayloadAction<AppCapabilityManifest>) {
      state.capabilities = action.payload
    },
  },
})

export const {
  updateCvBuilderSettings,
  updateTripPlannerSettings,
  updateBlogEngineSettings,
  updatePurefoySettings,
  setCapabilities,
} = settingsSlice.actions

// ── Selectors ─────────────────────────────────────────────────────────────────

/**
 * Shell operator selector — full cross-app visibility.
 * Use ONLY in SettingsModal and frame-agent. Not for sub-app panels.
 */
export const selectAllSettings = (state: { settings: SettingsState }): AppsSettings =>
  state.settings.apps

/**
 * Scoped selector — returns only this app's settings namespace.
 * Sub-apps should use this selector exclusively. Enforces the isolation model.
 */
export const selectAppSettings = <T extends keyof AppsSettings>(
  state: { settings: SettingsState },
  appType: T,
): AppsSettings[T] => state.settings.apps[appType]

/**
 * Returns true if `appType` is explicitly authorized (in the capability
 * manifest) to read from `targetType`. False by default (firewall-closed).
 */
export const canReadCrossApp = (
  state: { settings: SettingsState },
  appType: AppType,
  targetType: AppType,
): boolean => {
  const entry = state.settings.capabilities[appType]
  return entry?.canReadFrom.includes(targetType) ?? false
}

export default settingsSlice.reducer
