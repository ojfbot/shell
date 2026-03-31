import { useState, useEffect, useMemo } from 'react'
import {
  Theme,
  Header,
  HeaderMenuButton,
  HeaderName,
  HeaderGlobalBar,
  HeaderGlobalAction,
} from '@carbon/react'
import { Asleep, Light, Settings } from '@carbon/icons-react'
import { AppSwitcherConnected } from './components/AppSwitcherConnected.js'
import { AppFrame } from './components/AppFrame.js'
import { HeaderConnected } from './components/HeaderConnected.js'
import { SettingsModalConnected } from './components/SettingsModalConnected.js'
import { ResumptionToastConnected } from './components/ResumptionToastConnected.js'
import { ApprovalQueueConnected } from './components/ApprovalQueueConnected.js'
import { SmallViewportNotice } from './components/SmallViewportNotice.js'
import { useAppSelector, useAppDispatch } from './store/hooks.js'
import { toggleTheme } from './store/slices/themeSlice.js'
import { APP_LABELS, APP_CONFIG, activateInstance, type AppType } from './store/slices/appRegistrySlice.js'
import { clearChat, loadSavedHistory, requestResumption } from './store/slices/chatSlice.js'
import {
  loadThreadHistory,
  isFirstVisitThisSession,
  markResumedThisSession,
} from './lib/threadHistoryStore.js'

export function App() {
  const [sideNavExpanded, setSideNavExpanded] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const isDark = useAppSelector(s => s.theme.isDark)
  const { activeAppType, activeInstanceId, instances } = useAppSelector(s => s.appRegistry)
  const dispatch = useAppDispatch()

  const frameAgentUrl = import.meta.env.VITE_FRAME_AGENT_URL ?? 'http://localhost:4001'

  // Derive a stable key that changes whenever the active thread changes.
  // Using a combined string avoids two separate useEffect deps.
  const activeInstance = useMemo(
    () => instances.find(i => i.id === activeInstanceId),
    [instances, activeInstanceId]
  )
  const activeThreadId = activeInstance?.activeThreadId ?? null
  const threadContextKey = activeInstanceId && activeThreadId
    ? `${activeInstanceId}:${activeThreadId}`
    : null

  // On every instance/thread switch: load saved history and, if this is the
  // first visit to this thread this session and there is enough history,
  // request a resumption synthesis from frame-agent.
  useEffect(() => {
    if (!activeInstanceId || !activeThreadId) {
      dispatch(clearChat())
      return
    }

    const saved = loadThreadHistory(activeInstanceId, activeThreadId)

    if (!saved || saved.length === 0) {
      dispatch(clearChat())
      return
    }

    dispatch(loadSavedHistory(saved))

    if (isFirstVisitThisSession(activeInstanceId, activeThreadId)) {
      markResumedThisSession(activeInstanceId, activeThreadId)
      dispatch(requestResumption({
        conversationHistory: saved,
        activeAppType: activeInstance?.appType ?? 'meta',
        frameAgentUrl,
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadContextKey])

  // Deep-link: ?app=blogengine opens that app on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const appParam = params.get('app') as AppType | null
    if (appParam && appParam in APP_CONFIG) {
      const instanceId = `default-${appParam}`
      if (instances.some(i => i.id === instanceId)) {
        dispatch(activateInstance(instanceId))
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Push theme class to <html> so body + :root-resolved tokens change with the theme
  useEffect(() => {
    document.documentElement.classList.toggle('cds--g100', isDark)
    document.documentElement.classList.toggle('cds--white', !isDark)
  }, [isDark])

  return (
    // Theme renders as the app-container div — adds .cds--g100 / .cds--white in-place
    <Theme
      theme={isDark ? 'g100' : 'white'}
      as="div"
      className="app-container"
    >
      <Header aria-label="Frame">
        <HeaderMenuButton
          aria-label={sideNavExpanded ? 'Close menu' : 'Open menu'}
          onClick={() => setSideNavExpanded(v => !v)}
          isActive={sideNavExpanded}
          aria-expanded={sideNavExpanded}
        />
        <HeaderName prefix="">
          <span className="shell-breadcrumb-home">Frame</span>
          {activeAppType && (
            <>
              <span className="shell-breadcrumb-sep"> / </span>
              <span className="shell-breadcrumb-app">
                {APP_LABELS[activeAppType] ?? activeAppType}
              </span>
            </>
          )}
        </HeaderName>
        <HeaderConnected />
        <HeaderGlobalBar>
          <HeaderGlobalAction
            aria-label="Settings"
            tooltipAlignment="end"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings size={20} />
          </HeaderGlobalAction>
          <HeaderGlobalAction
            aria-label="Toggle theme"
            tooltipAlignment="end"
            onClick={() => dispatch(toggleTheme())}
          >
            {isDark ? <Light size={20} /> : <Asleep size={20} />}
          </HeaderGlobalAction>
        </HeaderGlobalBar>
      </Header>

      {/* role="navigation" — <aside> is implicitly "complementary"; we want nav semantics.
          inert removes the closed sidenav from the tab order and AT without display:none,
          so keyboard users can't accidentally land on invisible AppSwitcher items. */}
      <aside
        className={`shell-sidenav${sideNavExpanded ? ' shell-sidenav--open' : ''}`}
        role="navigation"
        aria-label="App navigation"
        {...(!sideNavExpanded && { inert: '' })}
      >
        <AppSwitcherConnected />
      </aside>

      <div
        className="main-content"
        style={{
          marginLeft: sideNavExpanded ? '256px' : '0',
          transition: 'margin-left 0.11s cubic-bezier(0.2, 0, 1, 0.9)',
        }}
      >
        <AppFrame />
      </div>

      <SettingsModalConnected
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <ResumptionToastConnected />
      <ApprovalQueueConnected />
      <SmallViewportNotice />
    </Theme>
  )
}
