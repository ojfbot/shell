import React from 'react'
import { ShellHeader } from './components/ShellHeader.js'
import { AppSwitcher } from './components/AppSwitcher.js'
import { AppFrame } from './components/AppFrame.js'

export function App() {
  return (
    <div className="frame-layout">
      <ShellHeader />
      <div className="frame-body">
        <AppSwitcher />
        <main className="frame-main">
          <AppFrame />
        </main>
      </div>
    </div>
  )
}
