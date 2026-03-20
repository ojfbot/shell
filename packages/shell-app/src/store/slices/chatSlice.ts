import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import { saveThreadHistory } from '../../lib/threadHistoryStore.js'
import { spawnInstance, activateInstance, APP_CONFIG, type AppType } from './appRegistrySlice.js'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface SpawnInstanceAction {
  type: 'spawn_instance'
  appType: string
  instanceName: string
}

export interface FocusInstanceAction {
  type: 'focus_instance'
  appType: string
  instanceId: string
}

export type InstanceAction = SpawnInstanceAction | FocusInstanceAction

export interface FrameAgentResponse {
  content: string
  domain: string
  handledBy: string
  conversationHistory: ChatMessage[]
  action?: InstanceAction
}

interface ChatState {
  messages: ChatMessage[]
  isStreaming: boolean
  error: string | null
  lastDomain: string | null
  lastHandledBy: string | null
  /** True when the last response triggered an instance action (spawn/focus). Cleared on next message. */
  lastActionExecuted: boolean
  /** Set when returning to a thread — cleared on the next user message. */
  resumptionSummary: string | null
  /** Contextual follow-up suggestions surfaced alongside the resumption toast. */
  resumptionSuggestions: string[]
}

const initialState: ChatState = {
  messages: [],
  isStreaming: false,
  error: null,
  lastDomain: null,
  lastHandledBy: null,
  lastActionExecuted: false,
  resumptionSummary: null,
  resumptionSuggestions: [],
}

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async (payload: {
    message: string
    activeAppType: string | null
    activeInstanceId: string | null
    activeThreadId: string | null
    frameAgentUrl: string
    conversationHistory: ChatMessage[]
    /** Instance list for spawn-vs-focus matching on the server. */
    instances: Array<{ id: string; appType: string; name: string }>
  }, { dispatch, getState }) => {
    const res = await fetch(`${payload.frameAgentUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: payload.message,
        context: {
          activeAppType: payload.activeAppType ?? undefined,
          instanceId: payload.activeInstanceId ?? undefined,
          instances: payload.instances,
        },
        conversationHistory: payload.conversationHistory,
      }),
    })

    if (!res.ok) {
      throw new Error(`frame-agent error: ${res.status} ${res.statusText}`)
    }

    const json = await res.json() as { success: boolean; data: FrameAgentResponse }

    // Persist updated history for this thread so it survives navigation + reload
    if (payload.activeInstanceId && payload.activeThreadId) {
      saveThreadHistory(
        payload.activeInstanceId,
        payload.activeThreadId,
        json.data.conversationHistory,
      )
    }

    // Handle instance actions — frame-agent detected NL intent
    if (json.data.action) {
      const action = json.data.action

      if (action.type === 'spawn_instance') {
        const { appType, instanceName } = action
        if (appType in APP_CONFIG) {
          dispatch(spawnInstance({
            appType: appType as AppType,
            name: instanceName,
            remoteUrl: APP_CONFIG[appType as AppType].remoteUrl,
          }))
        }
      } else if (action.type === 'focus_instance') {
        // Re-validate instanceId against current state to avoid stale references
        const state = getState() as { appRegistry: { instances: Array<{ id: string }> } }
        const exists = state.appRegistry.instances.some(i => i.id === action.instanceId)
        if (exists) {
          dispatch(activateInstance(action.instanceId))
        }
      }
    }

    return json.data
  }
)

/**
 * Request a thread resumption synthesis from frame-agent.
 * Fires once per session per thread when returning to a thread with history.
 */
export const requestResumption = createAsyncThunk(
  'chat/requestResumption',
  async (payload: {
    conversationHistory: ChatMessage[]
    activeAppType: string
    frameAgentUrl: string
  }): Promise<{ summary: string | null; suggestions: string[] }> => {
    try {
      const res = await fetch(`${payload.frameAgentUrl}/api/resumption`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationHistory: payload.conversationHistory,
          activeAppType: payload.activeAppType,
        }),
      })
      if (!res.ok) return { summary: null, suggestions: [] }
      const json = await res.json() as {
        success: boolean
        data: { resumption: string | null; suggestions: string[] }
      }
      return { summary: json.data.resumption ?? null, suggestions: json.data.suggestions ?? [] }
    } catch {
      return { summary: null, suggestions: [] }
    }
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
      state.resumptionSummary = null
      state.resumptionSuggestions = []
    },
    clearError(state) {
      state.error = null
    },
    /** Load saved messages from localStorage without triggering an API call. */
    loadSavedHistory(state, action: PayloadAction<ChatMessage[]>) {
      state.messages = action.payload
      state.resumptionSummary = null
    },
    clearResumptionSummary(state) {
      state.resumptionSummary = null
      state.resumptionSuggestions = []
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendMessage.pending, (state) => {
        state.isStreaming = true
        state.error = null
        state.lastActionExecuted = false
        state.resumptionSummary = null
        state.resumptionSuggestions = []
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.messages = action.payload.conversationHistory
        state.isStreaming = false
        state.lastDomain = action.payload.domain
        state.lastHandledBy = action.payload.handledBy
        state.lastActionExecuted = Boolean(action.payload.action)
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to reach frame-agent'
        state.isStreaming = false
      })
      .addCase(requestResumption.fulfilled, (state, action) => {
        if (action.payload.summary) {
          state.resumptionSummary = action.payload.summary
          state.resumptionSuggestions = action.payload.suggestions
        }
      })
  },
})

export const {
  appendAssistantChunk,
  setStreaming,
  clearChat,
  clearError,
  loadSavedHistory,
  clearResumptionSummary,
} = chatSlice.actions
export default chatSlice.reducer
