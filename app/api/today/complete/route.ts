import { NextRequest, NextResponse } from 'next/server'
import { createHabitQuestDomainService } from '@/lib/ai/habitquest-domain-service'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  planItemId: z.string().uuid(),
  durationMinutes: z.number().int().positive().optional(),
  note: z.string().max(500).optional(),
})

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body', code: 'invalid_input' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input', code: 'invalid_input' }, { status: 400 })
  }

  const service = createHabitQuestDomainService()
  const result = await service.completePlanItem({
    planItemId: parsed.data.planItemId,
    durationMinutes: parsed.data.durationMinutes ?? null,
    note: parsed.data.note ?? null,
    source: 'web',
  })

  if (!result.ok) {
    const status =
      result.error.code === 'supabase_not_configured'
        ? 503
        : result.error.code === 'unauthorized'
          ? 401
          : result.error.code === 'not_found'
            ? 404
            : result.error.code === 'conflict'
              ? 409
              : 500

    return NextResponse.json({ error: result.error.message, code: result.error.code }, { status })
  }

  return NextResponse.json(result.data)
}
