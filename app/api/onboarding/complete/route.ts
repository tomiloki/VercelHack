import { z } from 'zod'
import { createHabitQuestDomainService } from '@/lib/ai/habitquest-domain-service'

const onboardingSchema = z.object({
  displayName: z.string().trim().min(1).nullable().optional(),
  goalIds: z.array(z.string()).min(1),
  customActivityNames: z.array(z.string().trim().min(1)).max(5).optional(),
  customRewardNames: z.array(z.string().trim().min(1)).max(5).optional(),
})

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
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

  const parsed = onboardingSchema.safeParse(payload)

  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        error: 'Invalid onboarding payload.',
      },
      { status: 400 },
    )
  }

  const service = createHabitQuestDomainService()
  const result = await service.completeOnboarding(parsed.data)

  if (!result.ok) {
    const status = result.error.code === 'unauthorized' ? 401 : result.error.code === 'invalid_input' ? 400 : 500

    return Response.json(
      {
        ok: false,
        error: result.error.message,
        code: result.error.code,
      },
      { status },
    )
  }

  return Response.json({
    ok: true,
    data: result.data,
  })
}
