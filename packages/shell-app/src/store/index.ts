import { configureStore } from '@reduxjs/toolkit'
import appRegistryReducer from './slices/appRegistrySlice.js'
import chatReducer from './slices/chatSlice.js'
import themeReducer from './slices/themeSlice.js'
import settingsReducer from './slices/settingsSlice.js'

export const store = configureStore({
  reducer: {
    appRegistry: appRegistryReducer,
    chat: chatReducer,
    theme: themeReducer,
    settings: settingsReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
