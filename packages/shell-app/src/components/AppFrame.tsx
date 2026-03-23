/**
 * AppFrame — loads the active instance's remote Dashboard module.
 *
 * Uses Vite Module Federation dynamic imports. Each sub-app must expose:
 *   './Dashboard' — its main React component
 *
 * Falls back gracefully when a remote is unavailable (dev mode, pod not ready).
 */

import React, { Suspense, useEffect, useState } from 'react'
import { useAppSelector } from '../store/hooks.js'
import type { AppType } from '../store/slices/appRegistrySlice.js'
import { HomeScreenConnected } from './HomeScreenConnected.js'

// Vite Module Federation remote imports.
// The keys match the federation.remotes config in vite.config.ts.
// TypeScript sees these as `any` until types are declared in remotes/types.d.ts
const REMOTE_LOADERS: Record<AppType, () => Promise<{ default: React.ComponentType<RemoteProps> }>> = {
  'resume-builder': () => import('resume_builder/Dashboard' as string) as never,
  'tripplanner': () => import('tripplanner/Dashboard' as string) as never,
  'blogengine':  () => import('blogengine/Dashboard' as string) as never,
  'purefoy':     () => import('purefoy/Dashboard' as string) as never,
  'core-reader': () => import('core_reader/Dashboard' as string) as never,
  'lean-canvas': () => import('lean_canvas/Dashboard' as string) as never,
  'gastown-pilot': () => import('gastown_pilot/Dashboard' as string) as never,
  'seh-study': () => import('seh_study/Dashboard' as string) as never,
}

interface RemoteProps {
  instanceId: string
  threadId: string | null
  /** Tells the remote to suppress its standalone chrome (title heading, standalone margins).
   *  Shell provides its own Header + breadcrumb; remotes should render their AppPanel only. */
  shellMode: boolean
}

function RemoteErrorBoundary({ appType, children }: { appType: AppType; children: React.ReactNode }) {
  // Simple class component error boundary (hooks can't catch render errors)
  return <RemoteEB appType={appType}>{children}</RemoteEB>
}

class RemoteEB extends React.Component<{ appType: AppType; children: React.ReactNode }, { error: Error | null }> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div className="remote-error">
          <p>Could not load {this.props.appType}</p>
          <p className="remote-error-detail">{(this.state.error as Error).message}</p>
          <p className="remote-error-hint">Is the {this.props.appType} service running?</p>
        </div>
      )
    }
    return this.props.children
  }
}

export function AppFrame() {
  const { instances, activeInstanceId } = useAppSelector(s => s.appRegistry)
  const activeInstance = instances.find(i => i.id === activeInstanceId)

  const [RemoteComponent, setRemoteComponent] = useState<React.ComponentType<RemoteProps> | null>(null)
  const [loading, setLoading] = useState(false)
  const [remoteType, setRemoteType] = useState<AppType | null>(null)

  useEffect(() => {
    if (!activeInstance) return
    if (remoteType === activeInstance.appType && RemoteComponent) return  // already loaded

    setLoading(true)
    setRemoteComponent(null)

    const loader = REMOTE_LOADERS[activeInstance.appType]
    loader()
      .then(mod => {
        setRemoteComponent(() => mod.default)
        setRemoteType(activeInstance.appType)
      })
      .catch(err => {
        console.error(`Failed to load remote ${activeInstance.appType}:`, err)
      })
      .finally(() => setLoading(false))
  }, [activeInstance?.appType])

  if (!activeInstance) {
    return <HomeScreenConnected />
  }

  if (loading) {
    return <div className="frame-loading">Loading {activeInstance.name}…</div>
  }

  if (!RemoteComponent) {
    return (
      <div className="remote-error">
        <p>Could not load {activeInstance.appType}</p>
        <p className="remote-error-hint">Check that the service is running.</p>
      </div>
    )
  }

  return (
    <RemoteErrorBoundary appType={activeInstance.appType}>
      <Suspense fallback={<div className="frame-loading">Loading…</div>}>
        <div className="frame-fade-in" key={activeInstance.id} data-mf-remote={activeInstance.appType}>
          <RemoteComponent
            instanceId={activeInstance.id}
            threadId={activeInstance.activeThreadId}
            shellMode={true}
          />
        </div>
      </Suspense>
    </RemoteErrorBoundary>
  )
}
