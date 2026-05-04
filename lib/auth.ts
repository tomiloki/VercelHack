import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { isOnboardingComplete } from '@/lib/ai/habitquest-onboarding'
import { getSupabaseEnv } from '@/lib/supabase/env'

export type HabitQuestProfile = {
  id: string
  user_id: string
  display_name: string | null
  timezone: string
  coach_tone: string
  created_at: string
  updated_at: string
}

export type AuthContext = {
  isConfigured: boolean
  user: User | null
  profile: HabitQuestProfile | null
  hasCompletedOnboarding: boolean
}

const PROFILE_FIELDS = 'id, user_id, display_name, timezone, coach_tone, created_at, updated_at'

function getDisplayName(user: User) {
  const metadataName =
    typeof user.user_metadata?.display_name === 'string'
      ? user.user_metadata.display_name
      : typeof user.user_metadata?.name === 'string'
        ? user.user_metadata.name
        : null

  if (metadataName) return metadataName
  if (user.email) return user.email.split('@')[0]
  return 'Demo user'
}

async function getOrCreateProfile(user: User): Promise<HabitQuestProfile> {
  const supabase = await createClient()

  const { data: existingProfile, error: existingProfileError } = await supabase
    .from('profiles')
    .select(PROFILE_FIELDS)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingProfileError) {
    throw existingProfileError
  }

  if (existingProfile) {
    return existingProfile
  }

  const { data: createdProfile, error: createdProfileError } = await supabase
    .from('profiles')
    .insert({
      user_id: user.id,
      display_name: getDisplayName(user),
      timezone: 'America/Santiago',
      coach_tone: 'collaborative',
    })
    .select(PROFILE_FIELDS)
    .single()

  if (createdProfileError) {
    throw createdProfileError
  }

  return createdProfile
}

async function getOnboardingSnapshot(profileId: string) {
  const supabase = await createClient()

  const [{ count: goalCount }, { count: activityCount }, { count: rewardCount }] = await Promise.all([
    supabase.from('goals').select('*', { count: 'exact', head: true }).eq('profile_id', profileId).eq('status', 'active'),
    supabase
      .from('user_activities')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profileId)
      .eq('status', 'active'),
    supabase.from('rewards').select('*', { count: 'exact', head: true }).eq('profile_id', profileId).eq('status', 'active'),
  ])

  return {
    goalCount: goalCount ?? 0,
    activityCount: activityCount ?? 0,
    rewardCount: rewardCount ?? 0,
  }
}

export async function getAuthContext(): Promise<AuthContext> {
  if (!getSupabaseEnv().isConfigured) {
    return {
      isConfigured: false,
      user: null,
      profile: null,
      hasCompletedOnboarding: false,
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      isConfigured: true,
      user: null,
      profile: null,
      hasCompletedOnboarding: false,
    }
  }

  const profile = await getOrCreateProfile(user)
  const onboardingSnapshot = await getOnboardingSnapshot(profile.id)

  return {
    isConfigured: true,
    user,
    profile,
    hasCompletedOnboarding: isOnboardingComplete(onboardingSnapshot),
  }
}
