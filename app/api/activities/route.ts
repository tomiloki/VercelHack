import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthContext } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export type UserActivityItem = {
  id: string
  name: string
  description: string | null
  category: string
  durationMinutes: number | null
  points: number
  type: 'positive' | 'treat'
}

export async function GET() {
  const auth = await getAuthContext()

  if (!auth.isConfigured) {
    return NextResponse.json({ error: 'Supabase not configured', code: 'supabase_not_configured' }, { status: 503 })
  }

  if (!auth.profile) {
    return NextResponse.json({ error: 'Unauthorized', code: 'unauthorized' }, { status: 401 })
  }

  const client = await createClient()
  const [activitiesResult, rewardsResult] = await Promise.all([
    client
      .from('user_activities')
      .select('id, name, description, category, duration_minutes, points')
      .eq('profile_id', auth.profile.id)
      .eq('status', 'active')
      .order('points', { ascending: false }),
    client
      .from('rewards')
      .select('id, name, description, category, duration_minutes, cost_points')
      .eq('profile_id', auth.profile.id)
      .eq('status', 'active')
      .order('cost_points', { ascending: false }),
  ])

  if (activitiesResult.error || rewardsResult.error) {
    const message = activitiesResult.error?.message ?? rewardsResult.error?.message
    return NextResponse.json({ error: message, code: 'persistence_error' }, { status: 500 })
  }

  const activities: UserActivityItem[] = [
    ...(activitiesResult.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      durationMinutes: row.duration_minutes,
      points: row.points,
      type: 'positive' as const,
    })),
    ...(rewardsResult.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      durationMinutes: row.duration_minutes,
      points: row.cost_points,
      type: 'treat' as const,
    })),
  ]

  return NextResponse.json(activities)
}
