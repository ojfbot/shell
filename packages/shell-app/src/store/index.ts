import { configureStore } from '@reduxjs/toolkit'
import appRegistryReducer from './slices/appRegistrySlice.js'
import chatReducer from './slices/chatSlice.js'

export const store = configureStore({
  reducer: {
    appRegistry: appRegistryReducer,
    chat: chatReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
