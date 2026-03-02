import { useState, useEffect } from 'react'
import {
  Theme,
  Header,
  HeaderMenuButton,
  HeaderName,
  HeaderGlobalBar,
  HeaderGlobalAction,
} from '@carbon/react'
import { Asleep, Light, Settings } from '@carbon/icons-react'
import { AppSwitcher } from './components/AppSwitcher.js'
import { AppFrame } from './components/AppFrame.js'
import { ShellHeader } from './components/ShellHeader.js'
import { SettingsModal } from './components/SettingsModal.js'
import { useAppSelector, useAppDispatch } from './store/hooks.js'
import { toggleTheme } from './store/slices/themeSlice.js'
import { APP_LABELS } from './store/slices/appRegistrySlice.js'

export function App() {
  const [sideNavExpanded, setSideNavExpanded] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsKey, setSettingsKey] = useState(0)
  const isDark = useAppSelector(s => s.theme.isDark)
  const { activeAppType, activeInstanceId } = useAppSelector(s => s.appRegistry)
  const dispatch = useAppDispatch()

  const showSettings = !!activeInstanceId && !!activeAppType && activeAppType !== 'purefoy'

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
        <ShellHeader />
        <HeaderGlobalBar>
          {showSettings && (
            <HeaderGlobalAction
              aria-label={`${APP_LABELS[activeAppType]} Settings`}
              tooltipAlignment="end"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings size={20} />
            </HeaderGlobalAction>
          )}
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
        <AppSwitcher />
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

      {/* showSettings asserts activeAppType is non-null + not 'purefoy'.
          resetKey increments on close: gives fresh form state on reopen (intentional UX)
          and clears any MF load error held in SettingsEB. */}
      {showSettings && (
        <SettingsModal
          open={settingsOpen}
          appType={activeAppType!}
          resetKey={settingsKey}
          onClose={() => { setSettingsOpen(false); setSettingsKey(k => k + 1) }}
        />
      )}
    </Theme>
  )
}
