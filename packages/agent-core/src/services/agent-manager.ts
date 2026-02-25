/**
 * Generic AgentManager singleton.
 *
 * Usage:
 *   const manager = AgentManager.getInstance<{ meta: MetaOrchestrator }>('frame')
 *   manager.initialize(apiKey => ({ meta: new MetaOrchestrator(apiKey) }))
 *   const agent = manager.get('meta')
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ManagedAgents = Record<string, any>

export class AgentManager<T extends object> {
  private static instances = new Map<string, AgentManager<object>>()

  private agents: T | null = null
  private initialized = false

  private constructor() {}

  static getInstance<T extends object>(name: string): AgentManager<T> {
    if (!AgentManager.instances.has(name)) {
      AgentManager.instances.set(name, new AgentManager<T>())
    }
    return AgentManager.instances.get(name) as AgentManager<T>
  }

  initialize(factory: (apiKey: string) => T): void {
    if (this.initialized) return

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable not set')
    }

    this.agents = factory(apiKey)
    this.initialized = true
    console.log(`AgentManager initialized`)
  }

  get<K extends keyof T>(name: K): T[K] {
    if (!this.initialized || !this.agents) {
      throw new Error('AgentManager not initialized. Call initialize() first.')
    }
    return this.agents[name]
  }

  isInitialized(): boolean {
    return this.initialized
  }

  reset(): void {
    this.agents = null
    this.initialized = false
  }
}
