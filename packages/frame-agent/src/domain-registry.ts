/**
 * Domain registry — config-driven per ADR-0008.
 *
 * `keywords` are the conservative fast-path heuristic: unambiguous signals used
 * to override active-context routing and to detect cross-domain fan-out targets.
 * They are intentionally narrow to avoid false positives in hasStrongDomainSignal().
 *
 * API URLs are NOT stored here — they are resolved at construction time from env
 * vars and stored on MetaOrchestratorAgent as `this.urls`. This avoids duplicating
 * env var reads between this module and frame-agent-manager.ts.
 */

export interface DomainConfig {
  id: string
  keywords: string[]
}

export const DOMAIN_REGISTRY: DomainConfig[] = [
  {
    id: 'resume-builder',
    keywords: ['resume', 'cv', 'job', 'interview', 'cover letter', 'skills gap', 'applying', 'application'],
  },
  {
    id: 'blogengine',
    keywords: ['blog', 'post', 'draft', 'publish', 'notion', 'podcast'],
  },
  {
    id: 'tripplanner',
    keywords: ['trip', 'itinerary', 'hotel', 'flight', 'destination', 'travel'],
  },
  {
    // R7: tightened — 'film', 'lighting', 'lens' deliberately excluded (too generic)
    id: 'purefoy',
    keywords: ['deakins', 'cinematography', 'roger'],
  },
  {
    id: 'lean-canvas',
    keywords: ['lean canvas', 'business model', 'value proposition', 'customer segment', 'revenue stream', 'cost structure', 'key metrics', 'unfair advantage'],
  },
  {
    id: 'gastown-pilot',
    keywords: ['gas town', 'gastown', 'agent tree', 'convoy', 'bead', 'formula', 'rig', 'wasteland', 'wanted board', 'sling', 'nudge', 'handoff'],
  },
  {
    id: 'seh-study',
    keywords: ['systems engineering', 'seh', 'nasa handbook', 'flashcard', 'quiz me', 'spaced repetition', 'glossary', 'leitner'],
  },
]
