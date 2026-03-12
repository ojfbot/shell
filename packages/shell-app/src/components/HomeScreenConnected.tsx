/**
 * Connects the pure @ojfbot/shell HomeScreen to the Redux store.
 * AppInstance already satisfies HomeScreenInstance — both have threads[] and lastActivity.
 */
import { HomeScreen, DEFAULT_ROWS } from '@ojfbot/shell'
import { useAppDispatch, useAppSelector } from '../store/hooks.js'
import { activateInstance } from '../store/slices/appRegistrySlice.js'

export function HomeScreenConnected() {
  const dispatch = useAppDispatch()
  const { instances } = useAppSelector(s => s.appRegistry)

  return (
    <HomeScreen
      instances={instances}
      rows={DEFAULT_ROWS}
      onActivate={id => dispatch(activateInstance(id))}
    />
  )
}
