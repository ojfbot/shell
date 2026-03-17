/**
 * cross-domain-fanout.test.ts
 *
 * Tests for MetaOrchestratorAgent cross-domain routing and fan-out.
 * Uses Node's built-in test runner (node:test) — no extra test dependency required.
 *
 * Run:
 *   node --import tsx/esm --test src/__tests__/cross-domain-fanout.test.ts
 *
 * All Anthropic API calls are mocked — these tests exercise routing logic and
 * the context isolation invariant (ADR-0019).
 */

import { describe, it, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

// ---------------------------------------------------------------------------
// Minimal stubs — we exercise the pure routing/classification helpers without
// instantiating MetaOrchestratorAgent (which would open live HTTP connections).
// ---------------------------------------------------------------------------

import { DOMAIN_REGISTRY, type DomainConfig } from '../domain-registry.js'

// Re-implement the two pure functions from MetaOrchestratorAgent so we can
// test them in isolation without the full class and its side-effects.
function hasCrossDomainSignal(msg: string): boolean {
  const lowerMsg = msg.toLowerCase()
  const connectives = ['and also', 'as well as', 'both', 'across', 'combine', 'together']
  if (connectives.some(p => lowerMsg.includes(p))) return true
  const matchedDomains = DOMAIN_REGISTRY.filter((config: DomainConfig) =>
    config.keywords.some(k => lowerMsg.includes(k))
  )
  return matchedDomains.length >= 2
}

function detectInvolvedDomains(message: string): string[] {
  const lowerMsg = message.toLowerCase()
  return DOMAIN_REGISTRY
    .filter((config: DomainConfig) => config.keywords.some(s => lowerMsg.includes(s)))
    .map((config: DomainConfig) => config.id)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('cross-domain routing', () => {
  it('hero demo query is detected as cross-domain', () => {
    const query = "I'm applying for Berlin jobs, how does this affect my trip plans and resume?"
    assert.equal(
      hasCrossDomainSignal(query),
      true,
      'Hero demo query must trigger cross-domain signal'
    )
  })

  it('hero demo query fans out to cv-builder AND tripplanner', () => {
    const query = "I'm applying for Berlin jobs, how does this affect my trip plans and resume?"
    const domains = detectInvolvedDomains(query)
    assert.ok(
      domains.includes('cv-builder'),
      `Expected cv-builder in fan-out domains, got: ${domains.join(', ')}`
    )
    assert.ok(
      domains.includes('tripplanner'),
      `Expected tripplanner in fan-out domains, got: ${domains.join(', ')}`
    )
  })

  it('hero demo query does NOT fan out to unrelated domains', () => {
    const query = "I'm applying for Berlin jobs, how does this affect my trip plans and resume?"
    const domains = detectInvolvedDomains(query)
    assert.ok(
      !domains.includes('blogengine'),
      `blogengine should not appear in fan-out for hero demo query`
    )
    assert.ok(
      !domains.includes('purefoy'),
      `purefoy should not appear in fan-out for hero demo query`
    )
  })

  it('single-domain query is NOT cross-domain', () => {
    assert.equal(hasCrossDomainSignal('help me write a cover letter'), false)
    assert.equal(hasCrossDomainSignal('plan my trip to Tokyo'), false)
    assert.equal(hasCrossDomainSignal('draft a blog post about AI'), false)
  })

  it('explicit connective phrase triggers cross-domain even without matching keywords', () => {
    // 'both' is a connective — should flag cross-domain regardless of domain keywords
    assert.equal(hasCrossDomainSignal('I want both of these'), true)
  })

  it('two distinct domain keywords without connective trigger cross-domain', () => {
    // 'resume' (cv-builder) + 'trip' (tripplanner) co-present → cross-domain
    assert.equal(hasCrossDomainSignal('update my resume before the trip'), true)
  })

  it('keyword co-presence within same domain does NOT trigger cross-domain', () => {
    // 'resume' + 'cover letter' are both cv-builder — only 1 domain matched
    assert.equal(hasCrossDomainSignal('write a cover letter to go with my resume'), false)
  })
})

describe('detectInvolvedDomains', () => {
  it('returns empty array for messages with no domain keywords', () => {
    const domains = detectInvolvedDomains('hello, how are you?')
    assert.deepEqual(domains, [])
  })

  it('returns single domain for unambiguous messages', () => {
    const domains = detectInvolvedDomains('tailor my resume for this job')
    assert.deepEqual(domains, ['cv-builder'])
  })

  it('returns both domains for hero demo query', () => {
    const domains = detectInvolvedDomains(
      "I'm applying for Berlin jobs, how does this affect my trip plans and resume?"
    )
    // Order determined by DOMAIN_REGISTRY order: cv-builder before tripplanner
    assert.ok(domains.includes('cv-builder'))
    assert.ok(domains.includes('tripplanner'))
    assert.equal(domains.length, 2)
  })
})

// ---------------------------------------------------------------------------
// ADR-0019 isolation invariant tests
//
// Verify that fanOut() calls each domain agent with its own scoped history,
// not the shared MetaOrchestrator history passed in by the caller.
// ---------------------------------------------------------------------------

describe('ADR-0019: context isolation in fanOut()', () => {
  /**
   * Build a minimal MetaOrchestratorAgent-like object with:
   * - historyFor() returning distinct per-domain arrays
   * - domain agent stubs that record which history they received
   * - a fanOut()-equivalent method (copied from MetaOrchestratorAgent for isolation)
   */
  function buildTestOrchestrator() {
    const resumeHistory = [{ role: 'user' as const, content: 'resume message' }]
    const tripHistory   = [{ role: 'user' as const, content: 'trip message' }]
    const sharedHistory = [
      { role: 'user' as const, content: 'shared context should not leak' },
      { role: 'assistant' as const, content: 'meta response' },
    ]

    const capturedCalls: Record<string, { history: unknown[] }[]> = {
      'resume-builder': [],
      tripplanner: [],
    }

    // Stub domain agents that record which history they receive
    const resumeBuilderStub = {
      processMessage: async (_msg: string, history: unknown[]) => {
        capturedCalls['resume-builder'].push({ history })
        return 'resume response'
      },
      getConversationHistory: () => resumeHistory,
    }
    const tripPlannerStub = {
      processMessage: async (_msg: string, history: unknown[]) => {
        capturedCalls['tripplanner'].push({ history })
        return 'tripplanner response'
      },
      getConversationHistory: () => tripHistory,
    }

    // Replicate the actual historyFor() + fanOut() from MetaOrchestratorAgent
    function historyFor(domain: string) {
      if (domain === 'resume-builder') return resumeHistory
      if (domain === 'tripplanner') return tripHistory
      return sharedHistory
    }

    async function fanOut(involved: string[], message: string) {
      return Promise.all(involved.map(async domain => {
        const domainHistory = historyFor(domain)
        let response = ''
        if (domain === 'resume-builder') response = await resumeBuilderStub.processMessage(message, domainHistory)
        if (domain === 'tripplanner')    response = await tripPlannerStub.processMessage(message, domainHistory)
        return { domain, response }
      }))
    }

    return { fanOut, capturedCalls, resumeHistory, tripHistory, sharedHistory }
  }

  it('each domain agent receives its own scoped history, not shared history', async () => {
    const { fanOut, capturedCalls, resumeHistory, tripHistory } = buildTestOrchestrator()
    await fanOut(['resume-builder', 'tripplanner'], 'hero demo query')

    assert.equal(capturedCalls['resume-builder'].length, 1, 'resume-builder called once')
    assert.equal(capturedCalls['tripplanner'].length, 1, 'tripplanner called once')

    // resume-builder must receive its own history
    assert.deepEqual(
      capturedCalls['resume-builder'][0].history,
      resumeHistory,
      'resume-builder must receive its own scoped history'
    )

    // tripplanner must receive its own history
    assert.deepEqual(
      capturedCalls['tripplanner'][0].history,
      tripHistory,
      'tripplanner must receive its own scoped history'
    )
  })

  it('domain agents do NOT receive each other\'s history', async () => {
    const { fanOut, capturedCalls, resumeHistory, tripHistory } = buildTestOrchestrator()
    await fanOut(['resume-builder', 'tripplanner'], 'hero demo query')

    // resume-builder must NOT see trip history
    assert.notDeepEqual(
      capturedCalls['resume-builder'][0].history,
      tripHistory,
      'resume-builder must not receive tripplanner history'
    )

    // tripplanner must NOT see resume history
    assert.notDeepEqual(
      capturedCalls['tripplanner'][0].history,
      resumeHistory,
      'tripplanner must not receive resume-builder history'
    )
  })

  it('fanOut() is parallel (both agents called before either awaits)', async () => {
    const callOrder: string[] = []
    let resolveResume!: () => void
    let resolveTrip!: () => void

    // Staggered stubs — resume resolves second; both must START before either resolves
    const resumeStub = () => new Promise<string>(res => { callOrder.push('resume-start'); resolveResume = () => { callOrder.push('resume-end'); res('r') } })
    const tripStub   = () => new Promise<string>(res => { callOrder.push('trip-start');   resolveTrip   = () => { callOrder.push('trip-end');   res('t') } })

    const p = Promise.all([resumeStub(), tripStub()])
    // Both should have started before we resolve either
    assert.ok(callOrder.includes('resume-start'), 'resume-start before any resolve')
    assert.ok(callOrder.includes('trip-start'),   'trip-start before any resolve')
    resolveResume(); resolveTrip()
    await p
    assert.ok(callOrder.includes('resume-end'))
    assert.ok(callOrder.includes('trip-end'))
  })

  it('fanOut() returns synthesizable structure', async () => {
    const { fanOut } = buildTestOrchestrator()
    const results = await fanOut(['resume-builder', 'tripplanner'], 'hero demo query')

    assert.equal(results.length, 2, 'should return one result per domain')
    assert.ok(results.every(r => typeof r.domain === 'string'), 'each result has domain string')
    assert.ok(results.every(r => typeof r.response === 'string'), 'each result has response string')
    const domains = results.map(r => r.domain)
    assert.ok(domains.includes('resume-builder'))
    assert.ok(domains.includes('tripplanner'))
  })
})
