import { createAgentUIStreamResponse, createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from 'ai'
import { createHabitQuestAgent } from '@/lib/ai/habitquest-agent'
import { createHabitQuestDomainService } from '@/lib/ai/habitquest-domain-service'
import {
  extractLatestUserText,
  formatDailyPlanMarkdown,
  formatGenericCoachMarkdown,
  formatTodaySummaryMarkdown,
  isPlanRequest,
  isSummaryRequest,
} from '@/lib/ai/chat-fallback'

export const dynamic = 'force-dynamic'

const gatewayModel = process.env.HABITQUEST_AGENT_MODEL ?? 'openai/gpt-5.4'

async function buildFallbackReply(messages: UIMessage[]) {
  const service = createHabitQuestDomainService()
  const latestUserText = extractLatestUserText(messages)

  if (isPlanRequest(latestUserText)) {
    const result = await service.generateDailyPlan({
      focus: latestUserText,
      maxItems: 3,
    })

    if (result.ok) {
      return formatDailyPlanMarkdown(result.data)
    }
  }

  if (isSummaryRequest(latestUserText)) {
    const result = await service.getTodaySummary()

    if (result.ok) {
      return formatTodaySummaryMarkdown(result.data)
    }
  }

  return formatGenericCoachMarkdown(latestUserText)
}

async function createFallbackCoachResponse(messages: UIMessage[]) {
  const stream = createUIMessageStream({
    originalMessages: messages,
    execute: async ({ writer }) => {
      const textId = crypto.randomUUID()
      const reply = await buildFallbackReply(messages)

      writer.write({ type: 'start' })
      writer.write({ type: 'text-start', id: textId })
      writer.write({ type: 'text-delta', id: textId, delta: reply })
      writer.write({ type: 'text-end', id: textId })
      writer.write({ type: 'finish', finishReason: 'stop' })
    },
    onError: () => 'No se pudo generar la respuesta del coach.',
  })

  return createUIMessageStreamResponse({ stream })
}

export async function POST(request: Request) {
  const { messages }: { messages: UIMessage[] } = await request.json()

  if (!process.env.AI_GATEWAY_API_KEY) {
    return createFallbackCoachResponse(messages)
  }

  const agent = createHabitQuestAgent({ model: gatewayModel })

  return createAgentUIStreamResponse({
    agent,
    uiMessages: messages,
    abortSignal: request.signal,
  })
}
