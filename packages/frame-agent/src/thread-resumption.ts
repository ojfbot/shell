import Anthropic from '@anthropic-ai/sdk'

export interface ResumptionResult {
  /** 1–2 sentence opener citing specific content from the prior session. */
  summary: string
  /** 2–4 short follow-up action labels the user can tap to continue. */
  suggestions: string[]
}

/**
 * Synthesizes a contextual thread-resumption opener + follow-up suggestions
 * from conversation history.
 *
 * Design constraints:
 * - summary: 1–2 sentences, cites specific topics/decisions/content. Feels
 *   like memory, not a log dump.
 * - suggestions: 2–4 short (≤6 words) actionable follow-up prompts that
 *   directly continue the prior work. Not generic ("tell me more") — specific
 *   to what was actually happening.
 * - This call is NEVER added to any domain agent's conversation history.
 * - Returns null when there is not enough history to synthesize from.
 */
export async function synthesizeResumption(
  apiKey: string,
  conversationHistory: Array<{ role: string; content: string }>,
  activeAppType: string
): Promise<ResumptionResult | null> {
  if (conversationHistory.length < 2) return null

  // Last 6 messages (3 turns) — enough context without over-loading the prompt
  const recentMessages = conversationHistory.slice(-6)

  const historyText = recentMessages
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n')

  const systemPrompt = [
    'You are synthesizing a thread-resumption opening for a returning user.',
    'Respond with valid JSON only — no prose, no markdown fences.',
    'Schema: { "summary": string, "suggestions": string[] }',
    '',
    'summary rules:',
    '- 1–2 sentences, first person plural ("last time we were…" or "last time you were…")',
    '- Be specific — cite actual topics, decisions, wording, or content from the conversation',
    '- No generic phrases like "you have N messages" or "previous session"',
    '- Do not mention "history" or "conversation"',
    '- No pleasantries or greetings',
    '',
    'suggestions rules:',
    '- 2 to 4 items',
    '- Each suggestion is a short user message (≤6 words) the user could send right now',
    '- Make them specific to what was actually happening — not generic ("continue", "tell me more")',
    '- Write them as the user would say them (first person, imperative or question)',
    '- Examples of good suggestions: "Finalize the skills section", "Show the Berlin gap analysis",',
    '  "Draft the cover letter now", "What else is missing?"',
  ].join('\n')

  const userPrompt = [
    `Active application: ${activeAppType}`,
    '',
    'Recent conversation:',
    historyText,
    '',
    'Respond with the JSON object.',
  ].join('\n')

  const client = new Anthropic({ apiKey })

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  })

  const raw = response.content
    .filter(b => b.type === 'text')
    .map(b => ('text' in b ? b.text.trim() : ''))
    .join('')

  try {
    const parsed = JSON.parse(raw) as { summary?: unknown; suggestions?: unknown }
    const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : ''
    const suggestions = Array.isArray(parsed.suggestions)
      ? (parsed.suggestions as unknown[])
          .filter((s): s is string => typeof s === 'string')
          .slice(0, 4)
      : []

    if (!summary) return null
    return { summary, suggestions }
  } catch {
    // Model returned non-JSON — treat plain text as summary with no suggestions
    return raw.length > 0 ? { summary: raw, suggestions: [] } : null
  }
}
