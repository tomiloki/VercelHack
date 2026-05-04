import { createAgentUIStreamResponse, createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from 'ai'
import { createHabitQuestAgent } from '@/lib/ai/habitquest-agent'
import { createHabitQuestDomainService, type HabitQuestDomainService } from '@/lib/ai/habitquest-domain-service'
import {
  extractLatestUserText,
  formatDailyPlanMarkdown,
  formatGenericCoachMarkdown,
  formatTodaySummaryMarkdown,
  isPlanRequest,
  isSummaryRequest,
} from '@/lib/ai/chat-fallback'

export const dynamic = 'force-dynamic'

const defaultGatewayModel = process.env.HABITQUEST_AGENT_MODEL ?? 'openai/gpt-5.4'

type ChatDomainService = Pick<
  HabitQuestDomainService,
  | 'completeOnboarding'
  | 'generateDailyPlan'
  | 'logCheckIn'
  | 'completePlanItem'
  | 'redeemReward'
  | 'getTodaySummary'
  | 'updatePreferences'
>

type ChatRouteDependencies = {
  gatewayApiKey?: string
  gatewayModel?: string
  createDomainService?: () => ChatDomainService
  createAgent?: (input: { model: string; domainService: ChatDomainService }) => ReturnType<typeof createHabitQuestAgent>
}

async function buildFallbackReply(messages: UIMessage[], service: Pick<ChatDomainService, 'generateDailyPlan' | 'getTodaySummary'>) {
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

async function createFallbackCoachResponse(
  messages: UIMessage[],
  service: Pick<ChatDomainService, 'generateDailyPlan' | 'getTodaySummary'>,
) {
  const stream = createUIMessageStream({
    originalMessages: messages,
    execute: async ({ writer }) => {
      const textId = crypto.randomUUID()
      const reply = await buildFallbackReply(messages, service)

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

export function createChatPostHandler({
  gatewayApiKey = process.env.AI_GATEWAY_API_KEY,
  gatewayModel = defaultGatewayModel,
  createDomainService = () => createHabitQuestDomainService(),
  createAgent = ({ model, domainService }) => createHabitQuestAgent({ model, domainService }),
}: ChatRouteDependencies = {}) {
  return async function POST(request: Request) {
    const { messages }: { messages: UIMessage[] } = await request.json()
    const service = createDomainService()

    if (!gatewayApiKey) {
      return createFallbackCoachResponse(messages, service)
    }

    const agent = createAgent({ model: gatewayModel, domainService: service })

    return createAgentUIStreamResponse({
      agent,
      uiMessages: messages,
      abortSignal: request.signal,
    })
  }
}

export const POST = createChatPostHandler()
