import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface FrameAgentResponse {
  content: string
  domain: string
  handledBy: string
  conversationHistory: ChatMessage[]
}

interface ChatState {
  messages: ChatMessage[]
  isStreaming: boolean
  error: string | null
  lastDomain: string | null
  lastHandledBy: string | null
}

const initialState: ChatState = {
  messages: [],
  isStreaming: false,
  error: null,
  lastDomain: null,
  lastHandledBy: null,
}

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async (payload: {
    message: string
    activeAppType: string | null
    frameAgentUrl: string
    conversationHistory: ChatMessage[]
  }) => {
    const res = await fetch(`${payload.frameAgentUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: payload.message,
        context: { activeAppType: payload.activeAppType ?? undefined },
        conversationHistory: payload.conversationHistory,
      }),
    })

    if (!res.ok) {
      throw new Error(`frame-agent error: ${res.status} ${res.statusText}`)
    }

    const json = await res.json() as { success: boolean; data: FrameAgentResponse }
    return json.data
  }
)

export const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    appendAssistantChunk(state, action: PayloadAction<string>) {
      const last = state.messages[state.messages.length - 1]
      if (last?.role === 'assistant') {
        last.content += action.payload
      } else {
        state.messages.push({ role: 'assistant', content: action.payload })
      }
    },
    setStreaming(state, action: PayloadAction<boolean>) {
      state.isStreaming = action.payload
    },
    clearChat(state) {
      state.messages = []
      state.error = null
      state.lastDomain = null
      state.lastHandledBy = null
    },
    clearError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendMessage.pending, (state) => {
        state.isStreaming = true
        state.error = null
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.messages = action.payload.conversationHistory
        state.isStreaming = false
        state.lastDomain = action.payload.domain
        state.lastHandledBy = action.payload.handledBy
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to reach frame-agent'
        state.isStreaming = false
      })
  },
})

export const { appendAssistantChunk, setStreaming, clearChat, clearError } = chatSlice.actions
export default chatSlice.reducer
