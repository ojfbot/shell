/**
 * SettingsModal — shell-owned settings chrome for all sub-apps.
 *
 * ── Layout ────────────────────────────────────────────────────────────────────
 *
 *   ComposedModal
 *   ├─ ModalHeader
 *   │    ├─ "Settings" title
 *   │    ├─ Search bar  (filters visible app tabs)
 *   │    └─ Tab bar     (one button per app, shown in header — not scrollable)
 *   └─ ModalBody (scrollable panel content)
 *        └─ Active panel  (lazy MF component from the sub-app)
 *
 * The tab bar lives in the ModalHeader, not inside ModalBody, so it remains
 * visible and fixed while the panel content scrolls independently below it.
 * Accessibility: role="tablist" / role="tab" / role="tabpanel" with
 * aria-controls + aria-labelledby wiring.
 *
 * ── Isolation contract (ADR-0011) ────────────────────────────────────────────
 *
 * Shell SettingsModal: operator view — reads all apps' namespaces (by design).
 * Sub-app panels:      scoped to their own namespace only.
 *   - Panel receives `onClose` prop. It dispatches only its own update action.
 *   - Panel never receives another app's settings as props.
 *   - Panel cannot import cross-app selectors from this file.
 *
 * ── Search ────────────────────────────────────────────────────────────────────
 *
 * SETTINGS_META provides static field metadata per app. Search filters the
 * visible tabs by matching the query against app names and field labels/keywords.
 * No live inspection of lazy MF components — shell owns the schema, apps own
 * the rendering.
 */

import React, { Suspense, useState, useMemo, useEffect } from 'react'
import { useSelector } from 'react-redux'
import {
  ComposedModal,
  ModalHeader,
  ModalBody,
  InlineLoading,
  InlineNotification,
  Search,
} from '@carbon/react'
import { APP_LABELS } from '../store/slices/appRegistrySlice.js'
import type { AppType } from '../store/slices/appRegistrySlice.js'
import { SETTINGS_LOADERS, SETTINGS_META } from '../remotes/settings-loaders.js'

// Apps that appear in the settings tab bar (in display order).
const SETTINGS_APP_TYPES: AppType[] = ['resume-builder', 'tripplanner', 'blogengine', 'purefoy', 'core-reader', 'lean-canvas']

interface Props {
  open: boolean
  onClose: () => void
}

// ── Error boundary for MF panel load failures ─────────────────────────────────

class SettingsEB extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error }
  }

  componentDidCatch(err: Error, info: React.ErrorInfo) {
    console.error('[SettingsEB]', err, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <InlineNotification
          kind="error"
          title="Could not load settings panel"
          subtitle={this.state.error.message}
          hideCloseButton
        />
      )
    }
    return this.props.children
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SettingsModal({ open, onClose }: Props) {
  const contextAppType = useSelector((s: any) => s?.appRegistry?.activeAppType as AppType | null)

  const [activeTab, setActiveTab] = useState(0)
  const [query, setQuery] = useState('')
  // Incremented on close — resets each panel's error boundary on next open.
  const [resetKey, setResetKey] = useState(0)

  // When the modal opens, jump to the tab matching the currently active app.
  useEffect(() => {
    if (!open) return
    if (!contextAppType) return
    const idx = SETTINGS_APP_TYPES.indexOf(contextAppType)
    if (idx >= 0) setActiveTab(idx)
  }, [open, contextAppType])

  // Filter the tab list based on the search query.
  // Matches against app name OR any field label/keyword from SETTINGS_META.
  const visibleApps = useMemo<AppType[]>(() => {
    if (!query.trim()) return SETTINGS_APP_TYPES
    const q = query.toLowerCase()
    return SETTINGS_APP_TYPES.filter(appType => {
      if (APP_LABELS[appType].toLowerCase().includes(q)) return true
      const fields = SETTINGS_META[appType] ?? []
      return fields.some(f =>
        f.label.toLowerCase().includes(q) ||
        f.keywords.some(k => k.includes(q))
      )
    })
  }, [query])

  // Clamp tab index if search reduces the visible app count.
  const safeTab = Math.min(activeTab, Math.max(0, visibleApps.length - 1))

  const handleTabClick = (i: number) => setActiveTab(i)

  const handleClose = () => {
    setQuery('')
    setActiveTab(0)
    setResetKey(k => k + 1)
    onClose()
  }

  const activeAppType = visibleApps[safeTab] ?? null
  const Panel = activeAppType ? SETTINGS_LOADERS[activeAppType] : undefined

  return (
    <ComposedModal
      open={open}
      onClose={handleClose}
      size="lg"
      className="shell-settings-modal"
    >
      <ModalHeader title="Settings" closeModal={handleClose}>
        {/* ── Search bar ─────────────────────────────────────────────────── */}
        <Search
          size="sm"
          id="settings-search"
          labelText="Search settings"
          placeholder="Search settings…"
          value={query}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setQuery(e.target.value)
            setActiveTab(0)
          }}
          onClear={() => {
            setQuery('')
            setActiveTab(0)
          }}
          className="settings-search-input"
        />

        {/* ── Tab bar — one button per visible app ───────────────────────── */}
        {visibleApps.length > 0 && (
          <div
            className="settings-modal-tabs"
            role="tablist"
            aria-label="App settings panels"
          >
            {visibleApps.map((appType, i) => (
              <button
                key={appType}
                id={`settings-tab-${appType}`}
                role="tab"
                aria-selected={safeTab === i}
                aria-controls={`settings-panel-${appType}`}
                className={`settings-tab${safeTab === i ? ' settings-tab--active' : ''}`}
                onClick={() => handleTabClick(i)}
                tabIndex={safeTab === i ? 0 : -1}
                onKeyDown={(e) => {
                  // Arrow key navigation within the tab bar
                  if (e.key === 'ArrowRight') {
                    e.preventDefault()
                    setActiveTab((safeTab + 1) % visibleApps.length)
                  } else if (e.key === 'ArrowLeft') {
                    e.preventDefault()
                    setActiveTab((safeTab - 1 + visibleApps.length) % visibleApps.length)
                  }
                }}
              >
                {APP_LABELS[appType]}
              </button>
            ))}
          </div>
        )}
      </ModalHeader>

      {/* ── Panel content ──────────────────────────────────────────────────── */}
      <ModalBody hasScrollingContent className="settings-modal-body">
        {visibleApps.length === 0 ? (
          <p className="settings-no-results">No settings match "{query}"</p>
        ) : (
          visibleApps.map((appType, i) => {
            const PanelComponent = SETTINGS_LOADERS[appType]
            return (
              <div
                key={appType}
                id={`settings-panel-${appType}`}
                role="tabpanel"
                aria-labelledby={`settings-tab-${appType}`}
                hidden={safeTab !== i}
                className="settings-panel-region"
              >
                {/*
                 * Only render the active panel. `hidden` keeps the other
                 * panel divs in the DOM for ARIA labelling but React won't
                 * render into them — MF lazy load only fires for safeTab === i.
                 */}
                {safeTab === i && (
                  <SettingsEB key={`${appType}-${resetKey}`}>
                    <Suspense
                      fallback={
                        <InlineLoading
                          description="Loading settings…"
                          className="settings-loading-fallback"
                        />
                      }
                    >
                      {PanelComponent ? (
                        <PanelComponent onClose={handleClose} />
                      ) : (
                        <p className="settings-no-panel">
                          No settings panel available for {APP_LABELS[appType]}.
                        </p>
                      )}
                    </Suspense>
                  </SettingsEB>
                )}
              </div>
            )
          })
        )}
      </ModalBody>
    </ComposedModal>
  )
}
