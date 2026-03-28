# Plan: Cross-Domain Fan-Out + Synthesis (Hero Demo)

**Feature:** MetaOrchestrator cross-domain coordination
**Target:** Week 2 deliverable (Mar 10–12, 2026)
**Deadline:** March 25, 2026 (TBCoNY application target)
**Phase:** 3 (per `frame-os-context.md` roadmap)
**Primary repos:** `shell/packages/frame-agent`, `shell/packages/shell-app`

---

## Problem Statement

When a user submits a cross-domain query such as:

> "I'm applying for jobs in Berlin, how does this affect my trip plans and resume?"

the current system has a routing path for `cross-domain` in `MetaOrchestratorAgent.routeStream()` and a non-streaming equivalent in `route()`. The skeleton exists (`handleCrossDomainStream`, `handleCrossDomain`, `fanOut`), but the following specific gaps make the hero demo non-functional:

1. **`classify()` cross-domain signal detection is too narrow.** The fast-path heuristic in `hasCrossDomainSignal()` only checks for explicit connective words (`"and also"`, `"both"`, `"across"`, `"combine"`, `"together"`). The hero query — *"I'm applying for jobs in Berlin, how does this affect my trip plans and resume?"* — contains `"trip"` and `"applying"` but neither `"both"` nor `"together"`. The fast-path fires at message.length < 200 with `activeAppType` set, skipping the LLM classify call entirely, and would route to whichever app is currently active rather than `cross-domain`.

2. **`detectInvolvedDomains()` relies on keyword matching against `DOMAIN_REGISTRY`.** For the hero query: `"applying"` matches `cv-builder` and `"trip"` matches `tripplanner` — so detection is actually correct if we reach it. The bug is in step 1: we may never reach `detectInvolvedDomains` because `classify()` returns early.

3. **Domain agents in `fanOut()` run non-streaming `processMessage()` in parallel, then synthesis streams.** This is architecturally sound but the domain agents currently receive the raw cross-domain user message without any framing — they have no instruction to focus their response on their domain's angle. CvBuilderDomainAgent will answer about jobs; TripPlannerDomainAgent will answer about travel in general. Neither agent is prompted to produce a partial answer that is synthesis-ready.

4. **No SSE progress events during fan-out.** From the moment the user submits until synthesis begins, `chatSlice` shows `isStreaming: true` with the UI stuck on `"thinking…"`. For a request that waits on two sequential domain agent calls (fan-out is parallel but each call can take 2–5s), the user sees a blank thinking state for potentially 5–8s before streaming synthesis text appears. This is a UX gap during the hero demo.

5. **`chatSlice.sendMessage` uses the non-streaming `/api/chat` endpoint** (not `/api/chat/stream`). The streaming infrastructure exists end-to-end (`frameAgentClient.streamChat`, `routeStream`, `handleCrossDomainStream`) but the Redux thunk does not yet call the streaming path. The `appendAssistantChunk` reducer exists but is never dispatched.

6. **The domain-badge (`lastDomain` in `ShellHeader`) renders the routed domain name** (e.g. `"cross-domain"`). For the hero demo, this should convey which agents participated (e.g. `"cv-builder + tripplanner"`), not the routing label.

---

## Architecture Sketch

### Fan-out trigger: fixing `classify()` for cross-domain detection

**Do not introduce a new node.** The existing `classify()` method is sufficient. Two targeted changes:

**Change A — `hasCrossDomainSignal()` must check for domain keyword overlap, not just connective phrases.** The fix: if the message contains keywords from two or more distinct domains (as defined in `DOMAIN_REGISTRY`), treat it as a cross-domain signal even before the LLM call. This is deterministic, adds no latency, and integrates cleanly with the existing fast-path guard.

```
hasCrossDomainSignal(msg):
  matchedDomains = DOMAIN_REGISTRY.filter(d => d.keywords.some(k => msg.includes(k)))
  return matchedDomains.length >= 2 || existingConnectivePhrases(msg)
```

**Change B — the fast-path must not suppress cross-domain when the message carries cross-domain content.** Currently: `if (!hasCrossDomainSignal && !hasStrongDomainSignal) return activeAppType`. After Change A, `hasCrossDomainSignal` will correctly return `true` for the hero query, so the fast-path exits and the LLM classify call runs. No change to the fast-path logic itself is needed — fixing Change A is sufficient.

**LLM classify call** already has `cross-domain` in the valid domains list and the system prompt explains cross-domain routing. The classify prompt itself is correct and needs no change.

### Parallel dispatch: `Promise.all` over domain agents (no LangGraph)

The fan-out mechanism is **`Promise.all` over domain agent `processMessage()` calls**, which is already implemented in `fanOut()`. This is the correct choice:

- Domain agents in frame-agent are not LangGraph graphs; they are thin Anthropic SDK wrappers (BaseAgent). Adding LangGraph for parallel branches would introduce a new dependency, a new state schema, and a checkpoint store — all for two concurrent HTTP/LLM calls. The overhead is not justified.
- Separate SSE streams (streaming each domain agent's response independently to the client) would require the client to merge two streams and track partial state across both — significantly more complex for the shell-app and Redux store.
- `Promise.all` is already in production in `init()` for tool discovery and in the existing `fanOut()` skeleton. It is idiomatic and reviewers will understand it immediately.

**Domain agent framing:** Each domain agent call in `fanOut()` must receive a framed message, not the raw user message, to produce synthesis-ready output:

```typescript
// Instead of passing `message` directly:
const cvFramed = `[Cross-domain context] The user is asking a question that involves both
career/job applications and travel planning. Focus ONLY on the career and resume angle.
User message: "${message}"`

const tripFramed = `[Cross-domain context] The user is asking a question that involves both
travel planning and career/job applications. Focus ONLY on the travel planning angle.
User message: "${message}"`
```

The framing is per-domain and computed in `fanOut()` or in a new private method `frameCrossDomainMessage(domain, message)`.

### Progress events during fan-out

The `/api/chat/stream` route calls `orchestrator.routeStream()` and then writes SSE events. When `domain === 'cross-domain'`, before calling `fanOut()`, emit two SSE progress events:

```typescript
// In the stream route handler, or via a new onProgress callback:
res.write(`data: ${JSON.stringify({ type: 'progress', phase: 'fanout', domains: ['cv-builder', 'tripplanner'] })}\n\n`)
// ... fanOut completes ...
res.write(`data: ${JSON.stringify({ type: 'progress', phase: 'synthesis' })}\n\n`)
// ... synthesis streams via onChunk ...
```

The shell-app `frameAgentClient.streamChat` already parses SSE events. The client checks `event.type` — progress events will pass through the `else` branch silently unless the caller handles them. Adding an optional `onProgress` callback to `frameAgentClient.streamChat` allows the shell-app to surface these events in the UI.

### Synthesis prompt design

The current `buildSynthesisPrompt()` concatenates domain responses with `---` separators and asks Claude to "weave the insights together." For the hero demo this is directionally correct but needs strengthening:

```
Synthesize these domain expert responses into one integrated, actionable answer.

The user asked: "${message}"

You have received expert input from two domains:
- cv-builder (career/jobs): focused on the resume, application, and skills angle
- tripplanner (travel): focused on how this affects trip planning, dates, and logistics

Do NOT list the domains separately. Weave the insights together as if you are one expert
who understands both career strategy and travel logistics. Lead with the most time-sensitive
action, then connect the two domains explicitly (e.g., "Your Berlin interview window aligns
with your May trip — here's how to sequence both").

cv-builder response:
${cvResponse}

tripplanner response:
${tripResponse}
```

The explicit instruction to "connect the two domains explicitly" is what makes the output feel like "magic" rather than a concatenation. The synthesis itself is a streaming Anthropic call (`streamChat`) — so the user sees text appearing as soon as synthesis begins.

### ChatBar UX during fan-out

**Single typing indicator, two phases, one streaming synthesis.** Do not show two separate typing indicators — that implies two separate conversations, which breaks the "one coherent answer" illusion.

Phase 1 — fan-out in progress (both domain agents running in parallel, ~2–5s):
- The existing `"thinking…"` state is shown
- A new `fanoutDomains` field in `chatSlice` is set when a progress `fanout` event is received
- The UI renders: `"Consulting cv-builder + tripplanner…"` (replacing `"thinking…"`)

Phase 2 — synthesis streaming (~2–4s):
- When a progress `synthesis` event arrives, the UI switches to: `"Synthesizing…"`
- `appendAssistantChunk` fires on each streamed token, building the response text in place

Final state:
- The domain badge (`lastDomain`) renders `"cv-builder + tripplanner"` instead of `"cross-domain"`
- The synthesized response is visually identical to a normal response (same `.shell-chat-msg--assistant` class), with no "cross-domain" label in the message body itself — the quality of the answer is the signal

**Wire up the streaming path in `chatSlice`:** The `sendMessage` thunk currently calls `/api/chat` (non-streaming). For the hero demo, the stream path needs to be used. The recommended approach: add a parallel `sendMessageStream` thunk that calls `frameAgentClient.streamChat`, dispatching `appendAssistantChunk` on each chunk and setting final state on `onDone`. The existing `sendMessage` (non-streaming) is left intact for non-streaming fallback.

---

## Acceptance Criteria

1. A query containing keywords from two distinct DOMAIN_REGISTRY entries (e.g., any of `resume/cv/job/applying` AND any of `trip/itinerary/travel/hotel`) is classified as `cross-domain` regardless of `activeAppType` and regardless of message length.

2. `detectInvolvedDomains()` identifies exactly the domains signalled by the query — not all four domains, not a hardcoded pair. For the hero query: `['cv-builder', 'tripplanner']`.

3. Both identified domain agents are called in parallel (`Promise.all`), with each receiving a domain-framed version of the user message. Neither agent blocks the other.

4. Both domain agent calls complete before synthesis begins. Synthesis is not progressive (it waits for both). This is the simpler and more correct UX for this demo — a partially synthesized answer that references only one domain is worse than a brief wait.

5. The synthesised response explicitly references both domains in its body. Evaluation: manually verify the response to the hero query mentions both "resume/job/application" concepts and "trip/travel/Berlin" concepts within the first 100 words.

6. A purely single-domain query (e.g., "tailor my resume for this job description") is NOT routed as `cross-domain`. The fast-path and LLM classify call both return `cv-builder`. No regression in single-domain routing.

7. SSE progress events are emitted during fan-out (`phase: 'fanout'`) and before synthesis (`phase: 'synthesis'`). The shell-app UI transitions through: `"Consulting cv-builder + tripplanner…"` → `"Synthesizing…"` → streamed synthesis text.

8. The domain badge in `ShellHeader` renders `"cv-builder + tripplanner"` (or equivalent multi-domain label) after a cross-domain response, not `"cross-domain"`.

9. `classify()` accuracy on 10 standardised test cases ≥ 9/10 for domain detection. See test matrix.

10. `frame-agent` TypeScript compilation passes (`pnpm --filter frame-agent build`) with no new type errors introduced.

---

## Test Matrix

| Test input | Expected routing | Expected synthesis shape |
|---|---|---|
| `"Tailor my resume for a senior engineer role at Stripe"` | `cv-builder` | Single-domain response about resume tailoring; no travel content |
| `"What are the best neighbourhoods to stay in when visiting Tokyo?"` | `tripplanner` | Single-domain response about Tokyo accommodation; no career content |
| `"I'm applying for jobs in Berlin, how does this affect my trip plans and resume?"` | `cross-domain` → `['cv-builder', 'tripplanner']` | Synthesised response referencing Berlin job timeline AND trip logistics; both domains mentioned in first 100 words |
| `"I want to take a trip to Berlin for some job interviews — what should I plan?"` | `cross-domain` → `['cv-builder', 'tripplanner']` | Synthesised response; implicit cross-domain (no connective phrase, but `trip` + `job interviews` both present) |
| `"Help"` | `meta` | Capability overview listing all four apps |
| `"Write a blog post about my Berlin trip"` | ambiguous — likely `blogengine` (fast-path: `blog` keyword dominant); if `tripplanner` active, `hasStrongDomainSignal` fires for `blog` and overrides context | Single-domain blogengine response; should NOT be `cross-domain` (only one DOMAIN_REGISTRY entry matched by `blog`) |
| `"How do I open a new instance?"` | `meta` (shell pattern match: `"how do i"`) | Shell navigation answer; no domain agent call |
| `"What's my match score for the Berlin engineering job, and do my trip dates clash with the interview window?"` | `cross-domain` → `['cv-builder', 'tripplanner']` | Synthesised response cross-referencing job match and trip date logistics |
| `"Draft a blog post about my experience applying for jobs in Berlin"` | `cross-domain` → `['blogengine', 'cv-builder']` OR `blogengine` (borderline) | Acceptable: either blogengine-dominant or cross-domain synthesis. Must not route to `tripplanner`. |
| `"Generate a cover letter for the TBC Design Engineer role"` | `cv-builder` | Single-domain cover letter; no trip or blog content |

**Note on row 9 (ambiguous):** The `blog` keyword in `"applying"` does not appear in `blogengine` DOMAIN_REGISTRY (`['blog', 'post', 'draft', 'publish', 'notion', 'podcast']`). The word `"applying"` matches `cv-builder`. The word `"blog"` from the sentence `"blog post"` matches `blogengine`. Whether this routes as `cross-domain` or `blogengine`-dominant depends on whether both registry entries fire — it likely will route as `cross-domain`. This is acceptable behaviour and does not require special-casing; the synthesis will produce a useful response in either case.

---

## Files That Need to Change (ordered by dependency)

### Layer 1 — frame-agent (no shell-app dependency)

1. **`shell/packages/frame-agent/src/meta-orchestrator.ts`**
   - Fix `hasCrossDomainSignal()`: add multi-domain keyword overlap check using `DOMAIN_REGISTRY`
   - Add `frameCrossDomainMessage(domain: DomainType, message: string): string` private method
   - Update `fanOut()` to pass framed messages per domain
   - Update `buildSynthesisPrompt()` with improved synthesis instruction
   - Update `handleCrossDomainStream()` to emit progress callbacks before fan-out and before synthesis
   - Update `historyFor()` return type — for `cross-domain`, return merged history from both involved agents or `this.getConversationHistory()` (synthesis history)
   - **Merge risk:** This file is the most active in frame-agent. Check for any open PRs touching it before starting.

2. **`shell/packages/frame-agent/src/routes/chat.ts`**
   - The `/stream` route's `onChunk` callback is currently a simple `res.write`. Add a `onProgress` callback parameter to `routeStream` (or use a separate mechanism) to emit `{ type: 'progress', phase, domains }` SSE events.
   - Alternatively: pass a pre-constructed `onProgress` function into `handleCrossDomainStream` — simplest to implement.
   - **Merge risk:** Low — this file is stable.

3. **`shell/packages/frame-agent/src/meta-orchestrator.ts`** (types — same file as #1)
   - Add `domains?: DomainType[]` to `FrameAgentResponse` interface — allows the `done` SSE event to carry which agents participated, enabling the shell-app domain badge to show `"cv-builder + tripplanner"`.

### Layer 2 — shell-app (depends on Layer 1 SSE contract)

4. **`shell/packages/shell-app/src/api/frame-agent-client.ts`**
   - Add `onProgress?: (event: { phase: string; domains?: string[] }) => void` parameter to `streamChat`
   - Parse `event.type === 'progress'` SSE events and call `onProgress` if provided
   - Add `domains` to the `onDone` metadata type: `{ domain: string; domains?: string[]; conversationHistory: ChatMessage[] }`
   - **Merge risk:** Low — this file has no open PRs.

5. **`shell/packages/shell-app/src/store/slices/chatSlice.ts`**
   - Add `fanoutDomains: string[] | null` and `fanoutPhase: 'fanout' | 'synthesis' | null` to `ChatState`
   - Add `setFanoutProgress(state, action: PayloadAction<{ phase: string; domains?: string[] }>)` reducer
   - Add `sendMessageStream` async thunk that calls `frameAgentClient.streamChat`, dispatches `appendAssistantChunk` per chunk, `setFanoutProgress` on progress events, and sets final state on done
   - **Merge risk:** Medium — chatSlice is touched by any shell-app chat work. If [shell] #24 (thread resumption synthesis) is in progress, coordinate.

6. **`shell/packages/shell-app/src/components/ShellHeader.tsx`**
   - Replace `dispatch(sendMessage(...))` call with `dispatch(sendMessageStream(...))` for the stream path
   - Update the typing indicator to show `fanoutPhase`-aware text: `"Consulting cv-builder + tripplanner…"` when `fanoutPhase === 'fanout'`, `"Synthesizing…"` when `fanoutPhase === 'synthesis'`
   - Update the domain badge to render `fanoutDomains.join(' + ')` when present, falling back to `lastDomain`
   - **Merge risk:** Low — this file is likely touched by [shell] #24 if thread context is passed; coordinate on the `dispatch` call site.

### Layer 3 — test coverage

7. **`shell/packages/frame-agent/src/__tests__/classify.test.ts`** (new file)
   - Unit tests for all 10 rows in the test matrix above
   - Mock the Anthropic SDK to return controlled classifications
   - Test `hasCrossDomainSignal()` directly with Berlin hero query and pure single-domain queries

8. **`shell/packages/frame-agent/src/__tests__/fanout.test.ts`** (new file)
   - Unit tests for `detectInvolvedDomains()` with the hero query and edge cases
   - Unit tests for `frameCrossDomainMessage()` — verify framing strings contain domain focus instructions
   - Mock `processMessage` on domain agents; verify `Promise.all` parallelism (both called, neither blocks)

---

## Open Questions

### Dependency on [shell] #24 — thread resumption synthesis

The hero demo query does NOT depend on thread resumption to function. The cross-domain fan-out operates on the current message and the `conversationHistory` array passed in the request body. It does not reconstruct prior session context from storage.

However, if [shell] #24 lands before this work and changes how `conversationHistory` is assembled in `chatSlice.sendMessage` / `sendMessageStream`, there is a **coordination risk at `chatSlice.ts`** (file #5 above). Before opening a PR for this feature, check the [shell] #24 branch for any changes to `ChatState` or the `sendMessage` thunk shape.

If the hero demo needs to reference a specific saved trip instance ("your Tokyo trip") or a specific job application ("the Berlin role you saved"), it would need `instanceId` and `threadId` context to pass to the domain agents so they can call their respective CRUD APIs (`fetchTrips()`, `fetchJobs()`). The domain agents already accept `_context: TripPlannerContext / CvBuilderContext` — the context is passed through `route()` and `fanOut()` from the request body. So the wiring exists; the gap is that `fanOut()` currently passes the same `context` (which has one `activeAppType`) to all domain agents. For the initial hero demo, this is acceptable — the domain agents will respond from their system-prompt knowledge rather than live data. Full data-aware cross-domain is a Phase 3B concern.

### Domain agent history isolation

After a cross-domain call, `historyFor('cross-domain')` falls through to `this.getConversationHistory()` (the MetaOrchestrator's own history, which contains the synthesis call). The cv-builder and tripplanner agents' histories are updated by their own `processMessage` calls in `fanOut()`. This means the next message, if routed to `cv-builder`, will restore cv-builder's history correctly. But if the user sends a follow-up cross-domain message, the synthesis context (the combined answer the user saw) is not in either domain agent's history. This is a known gap — for the demo, it is acceptable. Flag for Phase 3 follow-up.

### Cross-domain with tripplanner offline

`TripPlanner GET /api/tools` is not yet implemented (Phase 1B gap). `init()` falls back to static stubs, so tripplanner is classified correctly. But if the tripplanner API itself is offline, `tripPlanner.processMessage()` will call the Anthropic SDK with no live trip data — it will respond from system prompt knowledge. For the hero demo in local dev with all services running, this is not a problem. For the Vercel demo (Layer 1 only, APIs not deployed), both domain agents run in LLM-only mode (no live data). The synthesis will still be coherent — it just won't reference specific trip dates or saved job listings.

---

## ADR Stub

**Should fan-out introduce a new ADR?** Yes. The fan-out mechanism introduces a new pattern for how frame-agent composes responses — one that adds a new SSE event type (`progress`), a new domain agent framing contract, and new state in `chatSlice`. This is an architectural commitment that future domain agents must comply with.

**Proposed: ADR-0018 — Cross-Domain Fan-Out and Synthesis Protocol**

> When `MetaOrchestratorAgent` classifies a message as `cross-domain`, it: (1) detects the involved domains using keyword overlap against `DOMAIN_REGISTRY`; (2) calls each involved domain agent's `processMessage()` in parallel via `Promise.all`, passing a domain-framed version of the user message; (3) emits SSE `progress` events to the client at fan-out start and synthesis start; (4) synthesizes all domain responses via a single streaming Anthropic call; (5) includes the list of participating domains in the `done` SSE event. All new domain agents added to frame-agent must implement `processMessage(framedMessage, history, context)` in a way that is compatible with receiving a domain-framed (not raw) user message. The `DOMAIN_REGISTRY` keywords are the authoritative cross-domain trigger — adding a new domain requires adding its keywords to the registry.

---

## Implementation Order (Mar 10–12 sprint)

**Day 1 (Mar 10):**
- Fix `hasCrossDomainSignal()` and add `frameCrossDomainMessage()` in `meta-orchestrator.ts`
- Update `buildSynthesisPrompt()` with improved synthesis instruction
- Add progress event emission to the stream route + `handleCrossDomainStream()`
- Manual test: curl the stream endpoint with the hero query, verify `progress` events and synthesis output

**Day 2 (Mar 11):**
- Add `sendMessageStream` thunk + `fanoutDomains`/`fanoutPhase` state to `chatSlice.ts`
- Update `frame-agent-client.ts` `streamChat` signature with `onProgress`
- Wire `ShellHeader` to use `sendMessageStream` and render phase-aware text

**Day 3 (Mar 12):**
- Write `classify.test.ts` and `fanout.test.ts`
- End-to-end demo test: hero query in local dev, verify full UX flow
- Open PR against shell main; request review
