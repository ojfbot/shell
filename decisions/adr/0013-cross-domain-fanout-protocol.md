# ADR-0013: Cross-Domain Fan-Out and Synthesis Protocol

**Date:** 2026-04-04
**Status:** Accepted
**See also:** ADR-0034 (isolated Redux stores with FrameBus), shell plan doc `docs/plan-cross-domain-fanout.md`

---

## Context

MetaOrchestratorAgent in frame-agent can route messages to individual domain agents (cv-builder, tripplanner, blogengine). When a user query spans multiple domains — e.g. "I'm applying for jobs in Berlin, how does this affect my trip plans and resume?" — the system needs to call multiple domain agents in parallel, then synthesize their responses into a single coherent answer.

The skeleton exists (`handleCrossDomainStream`, `handleCrossDomain`, `fanOut` in `meta-orchestrator.ts`), but three gaps prevent it from working:

1. `hasCrossDomainSignal()` only checks connective phrases ("and also", "both"), missing queries that contain keywords from two domains without explicit connectives.
2. Domain agents in `fanOut()` receive the raw user message with no domain-specific framing, producing unfocused responses.
3. No SSE progress events during fan-out — the UI shows a blank "thinking..." state for 5-8s.

## Decision

### Classification fix

`hasCrossDomainSignal()` checks for keyword overlap across `DOMAIN_REGISTRY` entries: if a message contains keywords from two or more distinct domains, it returns `true` regardless of connective phrases. This is deterministic and adds no latency.

### Parallel dispatch with framed messages

`fanOut()` calls each involved domain agent's `processMessage()` in parallel via `Promise.all`. Each agent receives a domain-framed version of the user message:

```typescript
const framed = `[Cross-domain context] The user is asking a question that involves
${involvedDomains.join(' and ')}. Focus ONLY on the ${domain} angle.
User message: "${message}"`
```

Domain agents are not LangGraph graphs — they are thin Anthropic SDK wrappers. `Promise.all` is the correct parallel dispatch mechanism: no new dependencies, no state schema, no checkpoint store.

### Synthesis protocol

After all domain agent responses arrive, a single streaming Anthropic call synthesizes them. The synthesis prompt explicitly instructs: weave insights together as one expert, do not list domains separately, lead with the most time-sensitive action.

### SSE progress events

The stream route emits typed SSE events at two phase transitions:

```typescript
// Before fan-out
{ type: 'progress', phase: 'fanout', domains: ['cv-builder', 'tripplanner'] }
// Before synthesis
{ type: 'progress', phase: 'synthesis' }
```

The shell-app transitions through: "Consulting cv-builder + tripplanner..." → "Synthesizing..." → streamed synthesis text.

### Domain badge

The `done` SSE event includes a `domains` array. The shell-app domain badge renders `"cv-builder + tripplanner"` instead of `"cross-domain"`.

## Consequences

### Gains

- Cross-domain queries produce coherent synthesized answers instead of routing to one domain.
- Domain-framed messages produce synthesis-ready partial answers.
- Progress events eliminate the blank "thinking" state during parallel dispatch.
- The pattern scales to N domains without architectural changes — `Promise.all` works with any number of agents.

### Costs

- One additional LLM call per cross-domain query (the synthesis call), adding ~$0.03 and 2-4s.
- `DOMAIN_REGISTRY` keywords must be maintained — adding a new domain requires updating the registry for correct cross-domain detection.
- Domain agent `processMessage()` must handle framed messages gracefully (the framing prefix is invisible to the LLM's instruction-following, but agents must not strip it).

### Neutral

- Single-domain routing is unaffected. The keyword overlap check only fires when two or more domains match.
- The `fanOut()` → synthesis pattern is one-shot — no iterative refinement. Follow-up cross-domain queries re-run the full pipeline.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| LangGraph parallel branches | Adds dependency, state schema, checkpoint store for two concurrent HTTP calls. Not justified. |
| Separate SSE streams per domain agent | Client must merge streams and track partial state. Breaks "one coherent answer" UX. |
| Sequential domain calls (no parallelism) | Doubles latency for no benefit. Domain agents are independent. |
| Re-route to most-relevant single domain | Loses the cross-domain insight. The value is in connecting the domains. |
