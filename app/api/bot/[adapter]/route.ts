import {
  createBotEntrypoint,
  createConversationThreadResolver,
  createSupabaseConversationThreadRepository,
  runHabitQuestBotAgent,
} from '@/lib/ai/habitquest-bot'

export const dynamic = 'force-dynamic'

const handleBotRequest = createBotEntrypoint({
  resolveConversation: createConversationThreadResolver({
    repository: createSupabaseConversationThreadRepository(),
  }),
  runAgent: runHabitQuestBotAgent,
})

export async function POST(request: Request, context: { params: Promise<{ adapter: string }> }) {
  const { adapter } = await context.params

  let payload: unknown

  try {
    payload = await request.json()
  } catch {
    return Response.json(
      {
        ok: false,
        error: 'Invalid JSON body.',
      },
      { status: 400 },
    )
  }

  try {
    const result = await handleBotRequest(adapter, payload)

    return Response.json({
      ok: true,
      ...result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected adapter error.'
    const status = /unsupported bot adapter|missing|invalid json|profile mapping|required|does not contain/i.test(message)
      ? 400
      : 500

    return Response.json(
      {
        ok: false,
        error: message,
      },
      { status },
    )
  }
}
