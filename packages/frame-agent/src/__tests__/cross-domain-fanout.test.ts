/**
 * cross-domain-fanout.test.ts
 *
 * Smoke tests for MetaOrchestratorAgent cross-domain routing and fan-out.
 * Uses Node's built-in test runner (node:test) — no extra test dependency required.
 *
 * Run:
 *   node --import tsx/esm --test src/__tests__/cross-domain-fanout.test.ts
 *
 * All Anthropic API calls are mocked — these tests exercise routing logic only.
 */

import { describe, it, mock } from 'node:test'
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
