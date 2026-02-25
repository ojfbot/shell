/**
 * Left sidebar — App → Instance → Thread hierarchy.
 *
 * Groups instances by app type. Each instance is expandable to show
 * its named threads. Clicking a thread activates that instance + thread.
 */

import React, { useState } from 'react'
import { useAppDispatch, useAppSelector } from '../store/hooks.js'
import {
  activateInstance,
  activateThread,
  addThread,
  spawnInstance,
  type AppInstance,
  type AppType,
} from '../store/slices/appRegistrySlice.js'

const APP_LABELS: Record<AppType, string> = {
  'cv-builder': 'CV Builder',
  'tripplanner': 'TripPlanner',
  'blogengine': 'BlogEngine',
  'purefoy': 'Purefoy',
}

const APP_REMOTE_DEFAULTS: Record<AppType, string> = {
  'cv-builder': import.meta.env.VITE_REMOTE_CV_BUILDER ?? 'http://localhost:3000',
  'tripplanner': import.meta.env.VITE_REMOTE_TRIPPLANNER ?? 'http://localhost:3010',
  'blogengine': import.meta.env.VITE_REMOTE_BLOGENGINE ?? 'http://localhost:3005',
  'purefoy': import.meta.env.VITE_REMOTE_PUREFOY ?? 'http://localhost:3020',
}

const APP_TYPES: AppType[] = ['cv-builder', 'tripplanner', 'blogengine', 'purefoy']

export function AppSwitcher() {
  const dispatch = useAppDispatch()
  const { instances, activeInstanceId } = useAppSelector(s => s.appRegistry)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const grouped = APP_TYPES.reduce<Record<AppType, AppInstance[]>>((acc, t) => {
    acc[t] = instances.filter(i => i.appType === t)
    return acc
  }, {} as Record<AppType, AppInstance[]>)

  function toggleExpand(id: string) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function handleSpawn(appType: AppType) {
    const label = prompt(`Name this ${APP_LABELS[appType]} instance:`)
    if (!label?.trim()) return
    dispatch(spawnInstance({ appType, name: label.trim(), remoteUrl: APP_REMOTE_DEFAULTS[appType] }))
  }

  function handleAddThread(instanceId: string) {
    const name = prompt('Thread name:')
    if (!name?.trim()) return
    dispatch(addThread({ instanceId, name: name.trim() }))
  }

  return (
    <nav className="app-switcher" aria-label="App switcher">
      {APP_TYPES.map(appType => {
        const typeInstances = grouped[appType]
        if (typeInstances.length === 0) return null
        return (
          <section key={appType} className="app-type-group">
            <div className="app-type-label">
              <span>{APP_LABELS[appType]}</span>
              <button
                className="spawn-btn"
                onClick={() => handleSpawn(appType)}
                title={`New ${APP_LABELS[appType]} instance`}
                aria-label={`New ${APP_LABELS[appType]}`}
              >+</button>
            </div>

            {typeInstances.map(inst => (
              <div key={inst.id} className={`instance ${activeInstanceId === inst.id ? 'active' : ''}`}>
                <button
                  className="instance-header"
                  onClick={() => {
                    dispatch(activateInstance(inst.id))
                    toggleExpand(inst.id)
                  }}
                >
                  <span className="instance-name">{inst.name}</span>
                  <span className="thread-count">{inst.threads.length}</span>
                  <span className="chevron">{expanded[inst.id] ? '▾' : '▸'}</span>
                </button>

                {expanded[inst.id] && (
                  <ul className="thread-list">
                    {inst.threads.map(thread => (
                      <li key={thread.id}>
                        <button
                          className={`thread-item ${inst.activeThreadId === thread.id && activeInstanceId === inst.id ? 'active-thread' : ''}`}
                          onClick={() => {
                            dispatch(activateInstance(inst.id))
                            dispatch(activateThread({ instanceId: inst.id, threadId: thread.id }))
                          }}
                        >
                          {thread.name}
                          {thread.messageCount > 0 && (
                            <span className="msg-count">{thread.messageCount}</span>
                          )}
                        </button>
                      </li>
                    ))}
                    <li>
                      <button
                        className="add-thread-btn"
                        onClick={() => handleAddThread(inst.id)}
                      >+ thread</button>
                    </li>
                  </ul>
                )}
              </div>
            ))}
          </section>
        )
      })}
    </nav>
  )
}
