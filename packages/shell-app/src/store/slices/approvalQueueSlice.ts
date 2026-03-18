import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

interface ApprovalItem {
  id: string
  title: string
  labels: Record<string, string>
}

interface ApprovalQueueState {
  items: ApprovalItem[]
  loading: boolean
  error: string | null
}

const initialState: ApprovalQueueState = { items: [], loading: false, error: null }

const BASE_URL = () => import.meta.env.VITE_FRAME_AGENT_URL ?? 'http://localhost:4001'

export const fetchApprovals = createAsyncThunk('approvalQueue/fetch', async () => {
  const res = await fetch(`${BASE_URL()}/api/approvals`)
  if (!res.ok) throw new Error(`approvals fetch failed: ${res.status}`)
  const data = await res.json() as { items: ApprovalItem[] }
  return data.items
})

export const approveHook = createAsyncThunk('approvalQueue/approve', async (agentId: string) => {
  await fetch(`${BASE_URL()}/api/approvals/${encodeURIComponent(agentId)}/approve`, { method: 'POST' })
  return agentId
})

export const rejectHook = createAsyncThunk('approvalQueue/reject', async (agentId: string) => {
  await fetch(`${BASE_URL()}/api/approvals/${encodeURIComponent(agentId)}/reject`, { method: 'POST' })
  return agentId
})

const approvalQueueSlice = createSlice({
  name: 'approvalQueue',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchApprovals.pending, state => { state.loading = true; state.error = null })
      .addCase(fetchApprovals.fulfilled, (state, action) => { state.loading = false; state.items = action.payload })
      .addCase(fetchApprovals.rejected, (state, action) => { state.loading = false; state.error = action.error.message ?? 'Failed to fetch' })
      .addCase(approveHook.fulfilled, (state, action) => { state.items = state.items.filter(i => i.id !== action.payload) })
      .addCase(rejectHook.fulfilled, (state, action) => { state.items = state.items.filter(i => i.id !== action.payload) })
  },
})

export default approvalQueueSlice.reducer
