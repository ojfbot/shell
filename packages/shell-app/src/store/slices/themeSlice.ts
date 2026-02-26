import { createSlice } from '@reduxjs/toolkit'
import type { RootState } from '../index.js'

const themeSlice = createSlice({
  name: 'theme',
  // TODO: persist to localStorage (tracked in roadmap: "Persist AppRegistry to localStorage")
  initialState: { isDark: true },
  reducers: {
    toggleTheme(state) { state.isDark = !state.isDark },
  },
})

export const { toggleTheme } = themeSlice.actions
export default themeSlice.reducer

export const selectIsDark = (state: RootState) => state.theme.isDark
