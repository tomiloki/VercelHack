import { AppShell } from '@/components/app-shell'
import { AuthCard } from '@/components/auth-card'
import { getAuthContext } from '@/lib/auth'
import { createHabitQuestDomainService } from '@/lib/ai/habitquest-domain-service'
import { createClient } from '@/lib/supabase/server'
import type { TodaySummaryData } from '@/lib/ai/habitquest-domain-service'
import type { UserActivityItem } from '@/app/api/activities/route'

export const dynamic = 'force-dynamic'

async function fetchUserActivities(profileId: string): Promise<UserActivityItem[]> {
  const client = await createClient()
  const [activitiesResult, rewardsResult] = await Promise.all([
    client
      .from('user_activities')
      .select('id, name, description, category, duration_minutes, points')
      .eq('profile_id', profileId)
      .eq('status', 'active')
      .order('points', { ascending: false }),
    client
      .from('rewards')
      .select('id, name, description, category, duration_minutes, cost_points')
      .eq('profile_id', profileId)
      .eq('status', 'active')
      .order('cost_points', { ascending: false }),
  ])

  return [
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
}

export default async function Home() {
  const auth = await getAuthContext()

  if (!auth.isConfigured || !auth.user || !auth.profile) {
    return <AuthCard isConfigured={auth.isConfigured} />
  }

  let initialSummary: TodaySummaryData | null = null
  let initialActivities: UserActivityItem[] = []

  if (auth.hasCompletedOnboarding) {
    const service = createHabitQuestDomainService()
    const [summaryResult, activities] = await Promise.all([
      service.getTodaySummary(),
      fetchUserActivities(auth.profile.id),
    ])

    if (summaryResult.ok) {
      initialSummary = summaryResult.data
    }

    initialActivities = activities
  }

  return (
    <AppShell
      profileId={auth.profile.id}
      displayName={auth.profile.display_name ?? auth.user.email ?? 'Demo user'}
      initialHasOnboarded={auth.hasCompletedOnboarding}
      initialSummary={initialSummary}
      initialActivities={initialActivities}
    />
  )
}
