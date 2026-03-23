/**
 * Connects the pure @ojfbot/shell AppSwitcher to the Redux store.
 * This is the only place in shell-app that knows about both the store shape
 * and the @ojfbot/shell props interface.
 */
import { AppSwitcher } from '@ojfbot/shell'
import { useAppDispatch, useAppSelector } from '../store/hooks.js'
import {
  activateInstance,
  closeInstance,
  spawnInstance,
  clearLastSpawned,
  goHome,
  APP_CONFIG,
  APP_TYPES,
  type AppType,
} from '../store/slices/appRegistrySlice.js'
import type { AppDisplayConfig } from '@ojfbot/shell'

// Map shell-app's AppConfig to @ojfbot/shell's AppDisplayConfig
const displayConfig = Object.fromEntries(
  APP_TYPES.map(t => [
    t,
    { label: APP_CONFIG[t].label, singleton: APP_CONFIG[t].singleton } satisfies AppDisplayConfig,
  ]),
) as Record<AppType, AppDisplayConfig>

export function AppSwitcherConnected() {
  const dispatch = useAppDispatch()
  const { instances, activeInstanceId, lastSpawnedInstanceId } = useAppSelector(s => s.appRegistry)

  function handleSpawnNew(appType: AppType) {
    const base = APP_CONFIG[appType].defaultInstanceName
    const taken = new Set(instances.filter(i => i.appType === appType).map(i => i.name))
    let name = base
    if (taken.has(name)) {
      let n = 2
      while (taken.has(`${base} ${n}`)) n++
      name = `${base} ${n}`
    }
    dispatch(spawnInstance({ appType, name, remoteUrl: APP_CONFIG[appType].remoteUrl }))
  }

  return (
    <AppSwitcher
      instances={instances}
      activeInstanceId={activeInstanceId}
      lastSpawnedInstanceId={lastSpawnedInstanceId}
      appConfig={displayConfig}
      appTypes={APP_TYPES}
      onActivate={id => dispatch(activateInstance(id))}
      onClose={id => dispatch(closeInstance(id))}
      onSpawnNew={handleSpawnNew}
      onGoHome={() => dispatch(goHome())}
      onSpawnAnimationEnd={() => dispatch(clearLastSpawned())}
    />
  )
}
