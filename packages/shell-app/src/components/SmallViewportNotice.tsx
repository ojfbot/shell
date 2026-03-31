import { useState, useEffect } from 'react'
import { Button } from '@carbon/react'

const BREAKPOINT = '(max-width: 768px)'
const STORAGE_KEY = 'frame-viewport-notice-dismissed'

export function SmallViewportNotice() {
  const [isSmall, setIsSmall] = useState(() => window.matchMedia(BREAKPOINT).matches)
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(STORAGE_KEY) === '1')

  useEffect(() => {
    const mql = window.matchMedia(BREAKPOINT)
    const onChange = (e: MediaQueryListEvent) => setIsSmall(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  if (!isSmall || dismissed) return null

  const handleDismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, '1')
    setDismissed(true)
  }

  return (
    <>
      <div className="viewport-notice-backdrop" onClick={handleDismiss} />
      <div className="viewport-notice" role="alertdialog" aria-label="Small screen notice">
        <p className="viewport-notice__title">Heads up</p>
        <p className="viewport-notice__body">
          Frame is designed for larger screens. On this viewport size you may
          encounter layout issues.
        </p>
        <p className="viewport-notice__body">
          Thanks for your patience while we work on mobile support.
        </p>
        <a
          className="viewport-notice__cta"
          href="https://jim.software"
          target="_blank"
          rel="noopener noreferrer"
        >
          jim.software
        </a>
        <div className="viewport-notice__dismiss">
          <Button kind="primary" size="sm" onClick={handleDismiss}>
            Got it
          </Button>
        </div>
      </div>
    </>
  )
}
