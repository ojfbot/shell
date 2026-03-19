/**
 * Connects the pure @ojfbot/shell SettingsModal to the Redux store.
 * Passes contextAppType from store + static config.
 */
import { SettingsModal } from '@ojfbot/shell'
import { useAppSelector } from '../store/hooks.js'
import { APP_LABELS } from '../store/slices/appRegistrySlice.js'
import type { AppType } from '../store/slices/appRegistrySlice.js'
import { SETTINGS_LOADERS, SETTINGS_META } from '../remotes/settings-loaders.js'

const SETTINGS_APP_TYPES: AppType[] = ['resume-builder', 'tripplanner', 'blogengine', 'purefoy', 'core-reader', 'lean-canvas']

interface Props {
  open: boolean
  onClose: () => void
}

export function SettingsModalConnected({ open, onClose }: Props) {
  const contextAppType = useAppSelector(s => s.appRegistry.activeAppType)

  return (
    <SettingsModal
      open={open}
      onClose={onClose}
      contextAppType={contextAppType}
      appTypes={SETTINGS_APP_TYPES}
      appLabels={APP_LABELS}
      settingsMeta={SETTINGS_META}
      settingsLoaders={SETTINGS_LOADERS}
    />
  )
}
