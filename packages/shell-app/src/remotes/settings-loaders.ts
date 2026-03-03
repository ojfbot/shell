/**
 * SETTINGS_LOADERS — module-level React.lazy() factories for sub-app SettingsPanel components.
 *
 * Pattern mirrors REMOTE_LOADERS in AppFrame.tsx:
 *   - `as string` bypasses TypeScript's module resolution for virtual MF modules
 *   - `as never`  suppresses the Promise<{ default: T }> mismatch at the React.lazy call site
 *   - Module-level lazy: cached after first fetch, one instance per app type
 *
 * 'purefoy' and 'core-reader' are intentionally omitted from SETTINGS_LOADERS
 * — neither exposes a ./Settings MF remote yet. The SettingsModal renders a
 * fallback for apps with no loader entry.
 *
 * ── SETTINGS_META ─────────────────────────────────────────────────────────────
 *
 * Static field metadata for each app type. Used by SettingsModal's search bar
 * to filter visible panels by label or keyword — without needing to inspect
 * the lazy-loaded panel components themselves.
 *
 * Shell owns this metadata (not sub-apps). This is intentional: shell knows
 * the settings schema; sub-apps own the rendering. If a sub-app adds a new
 * field, update the corresponding SETTINGS_META entry here so search works.
 */

import React from 'react'
import type { AppType } from '../store/slices/appRegistrySlice.js'

export interface SettingsPanelProps {
  /** Called after a successful Save — signals shell to close the modal. */
  onClose?: () => void
}

type LazyPanel = React.LazyExoticComponent<React.ComponentType<SettingsPanelProps>>

export const SETTINGS_LOADERS: Partial<Record<AppType, LazyPanel>> = {
  'cv-builder':  React.lazy(() => import('cv_builder/Settings'  as string) as never) as unknown as LazyPanel,
  'blogengine':  React.lazy(() => import('blogengine/Settings'  as string) as never) as unknown as LazyPanel,
  'tripplanner': React.lazy(() => import('tripplanner/Settings' as string) as never) as unknown as LazyPanel,
}

// ── Settings field metadata for search ───────────────────────────────────────

export interface SettingsFieldMeta {
  /** Short label shown in search results (matches the form field label). */
  label: string
  /** Additional terms that should match this field (app name, aliases, etc.). */
  keywords: string[]
}

/**
 * Static field registry for all app settings panels.
 * Keep in sync with the form fields rendered inside each sub-app's panel.
 *
 * Shell uses this to power the search bar — it never inspects the live MF
 * components. This is the source of truth for what's searchable.
 */
export const SETTINGS_META: Partial<Record<AppType, SettingsFieldMeta[]>> = {
  'cv-builder': [
    { label: 'API base URL',      keywords: ['api', 'url', 'connection', 'endpoint', 'backend', 'localhost', '3001'] },
    { label: 'Default template',  keywords: ['template', 'layout', 'modern', 'classic', 'minimal', 'resume', 'cv'] },
    { label: 'Export format',     keywords: ['pdf', 'docx', 'word', 'export', 'download'] },
    { label: 'Language',          keywords: ['language', 'locale', 'en', 'fr', 'de', 'es', 'english', 'french', 'german', 'spanish'] },
  ],
  'tripplanner': [
    { label: 'API base URL',            keywords: ['api', 'url', 'connection', 'endpoint', 'backend', 'localhost', '3011'] },
    { label: 'Default currency',        keywords: ['currency', 'usd', 'eur', 'gbp', 'jpy', 'money', 'dollar', 'euro', 'pound', 'yen'] },
    { label: 'Distance unit',           keywords: ['distance', 'km', 'kilometres', 'miles', 'unit', 'measurement'] },
    { label: 'Default budget category', keywords: ['budget', 'luxury', 'mid-range', 'midrange', 'cost', 'spend'] },
  ],
  'blogengine': [
    { label: 'API base URL',           keywords: ['api', 'url', 'connection', 'endpoint', 'backend', 'localhost', '3006'] },
    { label: 'Notion integration URL', keywords: ['notion', 'url', 'integration', 'cms', 'connect'] },
    { label: 'Default author',         keywords: ['author', 'name', 'byline', 'writer'] },
    { label: 'Auto-save drafts',       keywords: ['autosave', 'auto-save', 'save', 'draft', 'automatic'] },
    { label: 'Auto-publish drafts',    keywords: ['publish', 'auto', 'draft', 'automatic'] },
    { label: 'SEO suggestions',        keywords: ['seo', 'suggestions', 'search', 'optimization'] },
  ],
  'purefoy': [
    { label: 'API base URL',    keywords: ['api', 'url', 'connection', 'endpoint', 'backend', 'override'] },
    { label: 'Show debug panel', keywords: ['debug', 'panel', 'developer', 'devtools', 'inspect'] },
  ],
}
