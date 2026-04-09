import { useState, useMemo, useEffect } from 'react'
import type { AppType } from '../../types.js'
import type { SettingsFieldMeta } from './types.js'

export function useSettingsModal({
  open,
  onClose,
  contextAppType,
  appTypes,
  appLabels,
  settingsMeta,
}: {
  open: boolean
  onClose: () => void
  contextAppType: AppType | null
  appTypes: AppType[]
  appLabels: Record<string, string>
  settingsMeta: Record<string, SettingsFieldMeta[]>
}) {
  const [activeTab, setActiveTab] = useState(0)
  const [query, setQuery] = useState('')
  const [resetKey, setResetKey] = useState(0)

  useEffect(() => {
    if (!open || !contextAppType) return
    const idx = appTypes.indexOf(contextAppType)
    if (idx >= 0) setActiveTab(idx)
  }, [open, contextAppType, appTypes])

  const visibleApps = useMemo<AppType[]>(() => {
    if (!query.trim()) return appTypes
    const q = query.toLowerCase()
    return appTypes.filter(appType => {
      if (appLabels[appType]?.toLowerCase().includes(q)) return true
      const fields = settingsMeta[appType] ?? []
      return fields.some(f =>
        f.label.toLowerCase().includes(q) ||
        f.keywords.some(k => k.includes(q))
      )
    })
  }, [query, appTypes, appLabels, settingsMeta])

  const safeTab = Math.min(activeTab, Math.max(0, visibleApps.length - 1))

  const handleClose = () => {
    setQuery('')
    setActiveTab(0)
    setResetKey(k => k + 1)
    onClose()
  }

  const handleSearchChange = (value: string) => {
    setQuery(value)
    setActiveTab(0)
  }

  const handleSearchClear = () => {
    setQuery('')
    setActiveTab(0)
  }

  return {
    activeTab: safeTab,
    setActiveTab,
    query,
    resetKey,
    visibleApps,
    handleClose,
    handleSearchChange,
    handleSearchClear,
  }
}
