import type React from 'react'
import type { AppType } from '../../types.js'

export interface SettingsFieldMeta {
  label: string
  keywords: string[]
}

export interface SettingsModalProps {
  open: boolean
  onClose: () => void
  contextAppType: AppType | null
  appTypes: AppType[]
  appLabels: Record<string, string>
  settingsMeta: Record<string, SettingsFieldMeta[]>
  settingsLoaders: Record<string, React.LazyExoticComponent<React.ComponentType<{ onClose?: () => void }>> | undefined>
}
