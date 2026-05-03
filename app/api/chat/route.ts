import { createAgentUIStreamResponse, type UIMessage } from 'ai'
import { createHabitQuestAgent } from '@/lib/ai/habitquest-agent'

export const dynamic = 'force-dynamic'

const model = process.env.HABITQUEST_AGENT_MODEL ?? 'openai/gpt-5.4'

const agent = createHabitQuestAgent({ model })

export async function POST(request: Request) {
  const { messages }: { messages: UIMessage[] } = await request.json()

  return createAgentUIStreamResponse({
    agent,
    uiMessages: messages,
    abortSignal: request.signal,
  })
}
