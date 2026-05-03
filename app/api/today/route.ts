import { NextResponse } from 'next/server'
import { createHabitQuestDomainService } from '@/lib/ai/habitquest-domain-service'

export const dynamic = 'force-dynamic'

export async function GET() {
  const service = createHabitQuestDomainService()
  const summary = await service.getTodaySummary()

  if (!summary.ok) {
    const status =
      summary.error.code === 'supabase_not_configured'
        ? 503
        : summary.error.code === 'unauthorized'
          ? 401
          : summary.error.code === 'not_found'
            ? 404
            : summary.error.code === 'invalid_input'
              ? 400
              : 500

    return NextResponse.json({ error: summary.error.message, code: summary.error.code }, { status })
  }

  return NextResponse.json(summary.data)
}
