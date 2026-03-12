import Anthropic from '@anthropic-ai/sdk'

/**
 * Synthesizes a contextual thread-resumption opener from conversation history.
 *
 * Design constraints:
 * - 1–2 sentences. Cites specific topics, decisions, or content from the prior conversation.
 * - Feels like memory, not a log dump.
 * - This call is NEVER added to any domain agent's conversation history.
 * - Returns null when there is not enough history to synthesize from.
 */
export async function synthesizeResumption(
  apiKey: string,
  conversationHistory: Array<{ role: string; content: string }>,
  activeAppType: string
): Promise<string | null> {
  if (conversationHistory.length < 2) return null

  // Take the last 6 messages (3 turns) — enough context without over-loading the prompt
  const recentMessages = conversationHistory.slice(-6)

  const historyText = recentMessages
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n')

  const systemPrompt = [
    'You are synthesizing a brief thread-resumption opening for a returning user.',
    'Write 1–2 sentences in first person plural ("last time we were…", "last time you were…").',
    'Be specific — cite actual topics, decisions, wording, or content from the conversation history.',
    'Do not use generic phrases like "you have N messages" or "previous session".',
    'Do not mention the word "history" or "conversation".',
    'Do not add pleasantries or greetings.',
    'Just the resumption sentence(s). Nothing else.',
  ].join(' ')

  const userPrompt = [
    `Active application: ${activeAppType}`,
    '',
    'Recent conversation:',
    historyText,
    '',
    'Write the resumption opener.',
  ].join('\n')

  const client = new Anthropic({ apiKey })

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 120,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  })

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => ('text' in b ? b.text.trim() : ''))
    .join('')

  return text.length > 0 ? text : null
}
