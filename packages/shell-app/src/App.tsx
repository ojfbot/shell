import { useState } from 'react'
import {
  Theme,
  Header,
  HeaderMenuButton,
  HeaderName,
  HeaderGlobalBar,
  HeaderGlobalAction,
  SideNav,
  SideNavItems,
} from '@carbon/react'
import { Asleep, Light } from '@carbon/icons-react'
import { AppSwitcher } from './components/AppSwitcher.js'
import { AppFrame } from './components/AppFrame.js'
import { ShellHeader } from './components/ShellHeader.js'

export function App() {
  const [sideNavExpanded, setSideNavExpanded] = useState(false)
  const [isDark, setIsDark] = useState(true)

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
        <HeaderName prefix="">Frame</HeaderName>
        <ShellHeader />
        <HeaderGlobalBar>
          <HeaderGlobalAction
            aria-label="Toggle theme"
            tooltipAlignment="end"
            onClick={() => setIsDark(d => !d)}
          >
            {isDark ? <Light size={20} /> : <Asleep size={20} />}
          </HeaderGlobalAction>
        </HeaderGlobalBar>
      </Header>

      {sideNavExpanded && (
        <SideNav
          aria-label="App navigation"
          expanded={sideNavExpanded}
          onOverlayClick={() => setSideNavExpanded(false)}
        >
          <SideNavItems>
            <AppSwitcher />
          </SideNavItems>
        </SideNav>
      )}

      <div
        className="main-content"
        style={{
          marginLeft: sideNavExpanded ? '256px' : '0',
          transition: 'margin-left 0.11s cubic-bezier(0.2, 0, 1, 0.9)',
        }}
      >
        <AppFrame />
      </div>
    </Theme>
  )
}
