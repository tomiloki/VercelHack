import { DEFAULT_ACTIVITIES, GOALS } from '@/lib/types'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { getAuthContext, type HabitQuestProfile } from '@/lib/auth'

export const COACH_TONES = ['collaborative', 'direct', 'calm'] as const
export const CHECK_IN_INTENTS = ['progress', 'fatigue', 'replan', 'reward_request', 'reflection', 'other'] as const
export const CHECK_IN_SOURCES = ['web', 'telegram', 'whatsapp', 'other'] as const
export const PLAN_STATUSES = ['draft', 'active', 'completed', 'archived'] as const

export type CoachTone = (typeof COACH_TONES)[number]
export type CheckInIntent = (typeof CHECK_IN_INTENTS)[number]
export type CheckInSource = (typeof CHECK_IN_SOURCES)[number]

export type HabitQuestServiceErrorCode =
  | 'supabase_not_configured'
  | 'unauthorized'
  | 'invalid_input'
  | 'not_found'
  | 'conflict'
  | 'insufficient_points'
  | 'persistence_error'

export type HabitQuestServiceError = {
  code: HabitQuestServiceErrorCode
  message: string
}

export type HabitQuestServiceResult<T> =
  | {
      ok: true
      data: T
    }
  | {
      ok: false
      error: HabitQuestServiceError
    }

export type CompleteOnboardingInput = {
  goalIds: string[]
  displayName?: string | null
  timezone?: string | null
  coachTone?: CoachTone | null
  customActivityNames?: string[]
  customRewardNames?: string[]
}

export type CompleteOnboardingData = {
  profileId: string
  displayName: string | null
  timezone: string
  coachTone: string
  goalCount: number
  activityCount: number
  rewardCount: number
}

export type GenerateDailyPlanInput = {
  date?: string | null
  focus?: string | null
  maxItems?: number
  forceRegenerate?: boolean
}

export type DailyPlanItemSummary = {
  id: string
  title: string
  durationMinutes: number | null
  points: number
  position: number
  status: string
  rationale: string | null
}

export type GenerateDailyPlanData = {
  planId: string
  planDate: string
  status: string
  agentSummary: string | null
  items: DailyPlanItemSummary[]
}

export type LogCheckInInput = {
  message: string
  energyLevel?: number | null
  stressLevel?: number | null
  intent?: CheckInIntent | null
  source?: CheckInSource | null
}

export type LogCheckInData = {
  checkInId: string
  dailyPlanId: string | null
  intent: string
  source: string
  createdAt: string
  adaptationApplied: boolean
  adaptationSummary: string | null
  planStatus: string | null
  adaptedPlanItems: DailyPlanItemSummary[]
}

export type CompletePlanItemInput = {
  planItemId: string
  durationMinutes?: number | null
  note?: string | null
  source?: CheckInSource | null
}

export type CompletePlanItemData = {
  planItemId: string
  completionId: string
  walletTransactionId: string
  pointsAwarded: number
  availablePoints: number
  planStatus: string
}

export type RedeemRewardInput = {
  rewardId: string
  note?: string | null
}

export type RedeemRewardData = {
  rewardId: string
  rewardName: string
  walletTransactionId: string
  remainingPoints: number
}

export type TodaySummaryData = {
  profileId: string
  planId: string | null
  planDate: string
  planStatus: string | null
  agentSummary: string | null
  availablePoints: number
  completedPoints: number
  redeemedPoints: number
  completedItemsCount: number
  pendingItemsCount: number
  items: DailyPlanItemSummary[]
  recentCheckIn: {
    id: string
    message: string
    intent: string
    createdAt: string
  } | null
}

export type UpdatePreferencesInput = {
  displayName?: string | null
  timezone?: string | null
  coachTone?: CoachTone | null
}

export type UpdatePreferencesData = {
  profileId: string
  displayName: string | null
  timezone: string
  coachTone: string
}

type ServiceDependencies = {
  createClient?: typeof createSupabaseClient
  getProfileContext?: () => Promise<{
    isConfigured: boolean
    profile: HabitQuestProfile | null
  }>
}

type ActivePlanRow = {
  id: string
  plan_date: string
  status: string
  agent_summary: string | null
}

type RewardRow = {
  id: string
  name: string
  cost_points: number
  status: string
}

function ok<T>(data: T): HabitQuestServiceResult<T> {
  return {
    ok: true,
    data,
  }
}

function fail<T>(code: HabitQuestServiceErrorCode, message: string): HabitQuestServiceResult<T> {
  return {
    ok: false,
    error: {
      code,
      message,
    },
  }
}

function toDayKey(input?: string | null) {
  if (input && /^\d{4}-\d{2}-\d{2}$/.test(input)) return input
  return new Date().toISOString().split('T')[0]
}

function normalizeMaxItems(value?: number) {
  if (!value) return 4
  return Math.min(6, Math.max(1, value))
}

function buildPlanSummary(focus?: string | null) {
  return focus
    ? `Plan generado para priorizar: ${focus}. Mantené foco en pasos chicos y concretos.`
    : 'Plan diario simple, concreto y sostenible para hoy.'
}

type ActivitySeed = {
  name: string
  description?: string
  category: string
  duration_minutes?: number
  points: number
}

function buildActivitySeeds(): ActivitySeed[] {
  return DEFAULT_ACTIVITIES.filter((activity) => activity.type === 'positive').map((activity) => ({
    name: activity.name,
    description: activity.description,
    category: activity.category,
    duration_minutes: activity.duration,
    points: activity.points,
  }))
}

function buildRewardSeeds() {
  return DEFAULT_ACTIVITIES.filter((activity) => activity.type === 'treat').map((activity) => ({
    name: activity.name,
    description: activity.description,
    category: activity.category,
    cost_points: activity.points,
    duration_minutes: activity.duration ?? null,
  }))
}

export function selectActivitiesForDailyPlan<
  T extends { category: string; points: number; duration_minutes: number | null; created_at?: string; name: string },
>(activities: T[], maxItems: number) {
  const sorted = [...activities].sort((left, right) => {
    if (right.points !== left.points) return right.points - left.points
    return (left.duration_minutes ?? Number.MAX_SAFE_INTEGER) - (right.duration_minutes ?? Number.MAX_SAFE_INTEGER)
  })

  const selected: T[] = []
  const usedCategories = new Set<string>()

  for (const activity of sorted) {
    if (selected.length >= maxItems) break

    if (!usedCategories.has(activity.category)) {
      selected.push(activity)
      usedCategories.add(activity.category)
    }
  }

  for (const activity of sorted) {
    if (selected.length >= maxItems) break
    if (!selected.some((item) => item.name === activity.name)) {
      selected.push(activity)
    }
  }

  return selected.slice(0, maxItems)
}

export function calculateWalletBalance(
  transactions: Array<{
    type: 'earn' | 'redeem' | 'adjustment'
    points: number
  }>,
) {
  return transactions.reduce((balance, transaction) => {
    if (transaction.type === 'redeem') return balance - transaction.points
    return balance + transaction.points
  }, 0)
}

export function detectCheckInIntent({
  message,
  energyLevel,
  stressLevel,
}: Pick<LogCheckInInput, 'message' | 'energyLevel' | 'stressLevel'>): CheckInIntent {
  const normalizedMessage = message.trim().toLowerCase()

  if (
    /\b(cansad|agotad|fundid|sin energia|sin energía|poca energia|poca energía|fatig|dormi mal|dormi poco|dormí mal|dormí poco)\b/i.test(
      normalizedMessage,
    ) ||
    (typeof energyLevel === 'number' && energyLevel <= 2)
  ) {
    return 'fatigue'
  }

  if (
    /\b(sin tiempo|poco tiempo|apurad|apurada|no llego|voy tarde|estres|estrés|abrumad|ansios|nervios)\b/i.test(normalizedMessage) ||
    (typeof stressLevel === 'number' && stressLevel >= 4)
  ) {
    return 'replan'
  }

  if (/\b(recompensa|canjear|premio)\b/i.test(normalizedMessage)) {
    return 'reward_request'
  }

  if (/\b(hice|avance|avancé|complet|termin|logr)\b/i.test(normalizedMessage)) {
    return 'progress'
  }

  if (/\b(siento|pienso|reflex|me paso|me pasó)\b/i.test(normalizedMessage)) {
    return 'reflection'
  }

  return 'other'
}

function getCheckInCategoryPriority(intent: CheckInIntent, category: string) {
  const normalizedCategory = category.trim().toLowerCase()
  const priorities =
    intent === 'fatigue'
      ? ['health', 'mind', 'reset', 'nature', 'movement', 'nutrition', 'social', 'custom']
      : ['health', 'mind', 'reset', 'movement', 'nature', 'nutrition', 'social', 'custom']

  const index = priorities.indexOf(normalizedCategory)
  return index === -1 ? priorities.length : index
}

export function selectActivitiesForCheckInAdjustment<
  T extends { id: string; name: string; category: string; duration_minutes: number | null; points: number },
>(activities: T[], intent: CheckInIntent, maxItems: number) {
  const sorted = [...activities].sort((left, right) => {
    const categoryDelta = getCheckInCategoryPriority(intent, left.category) - getCheckInCategoryPriority(intent, right.category)
    if (categoryDelta !== 0) return categoryDelta

    const durationDelta = (left.duration_minutes ?? Number.MAX_SAFE_INTEGER) - (right.duration_minutes ?? Number.MAX_SAFE_INTEGER)
    if (durationDelta !== 0) return durationDelta

    if (left.points !== right.points) return left.points - right.points
    return left.name.localeCompare(right.name)
  })

  const selected: T[] = []
  const usedCategories = new Set<string>()

  for (const activity of sorted) {
    if (selected.length >= maxItems) break

    if (!usedCategories.has(activity.category)) {
      selected.push(activity)
      usedCategories.add(activity.category)
    }
  }

  for (const activity of sorted) {
    if (selected.length >= maxItems) break

    if (!selected.some((item) => item.id === activity.id)) {
      selected.push(activity)
    }
  }

  return selected.slice(0, maxItems)
}

function buildAdaptationSummary(intent: CheckInIntent) {
  if (intent === 'fatigue') {
    return 'Ajusté el plan a una versión más liviana para cuidar tu energía sin cortar la racha.'
  }

  return 'Reorganicé el plan con opciones más cortas y realistas para que lo puedas sostener hoy.'
}

function buildAdaptationRationale(intent: CheckInIntent, message: string) {
  if (intent === 'fatigue') {
    return `Adaptada por energía baja: ${message}`
  }

  return `Adaptada por cambio de contexto: ${message}`
}

export class HabitQuestDomainService {
  private readonly createClient
  private readonly getProfileContext

  constructor({ createClient = createSupabaseClient, getProfileContext }: ServiceDependencies = {}) {
    this.createClient = createClient
    this.getProfileContext =
      getProfileContext ??
      (async () => {
        const auth = await getAuthContext()

        return {
          isConfigured: auth.isConfigured,
          profile: auth.profile,
        }
      })
  }

  private async requireProfile() {
    const auth = await this.getProfileContext()

    if (!auth.isConfigured) {
      return fail<{ profile: HabitQuestProfile }>('supabase_not_configured', 'Supabase no está configurado.')
    }

    if (!auth.profile) {
      return fail<{ profile: HabitQuestProfile }>('unauthorized', 'Necesitás iniciar sesión para usar las herramientas del agente.')
    }

    return ok({
      profile: auth.profile,
    })
  }

  private async getWalletSnapshot(profileId: string) {
    const client = await this.createClient()
    const { data, error } = await client
      .from('wallet_transactions')
      .select('type, points')
      .eq('profile_id', profileId)

    if (error) {
      return fail<{ availablePoints: number; completedPoints: number; redeemedPoints: number }>(
        'persistence_error',
        `No pude leer la billetera: ${error.message}`,
      )
    }

    const typedTransactions = (data ?? []).map((transaction) => ({
      type: transaction.type as 'earn' | 'redeem' | 'adjustment',
      points: transaction.points,
    }))

    return ok({
      availablePoints: calculateWalletBalance(typedTransactions),
      completedPoints: typedTransactions
        .filter((transaction) => transaction.type !== 'redeem')
        .reduce((sum, transaction) => sum + transaction.points, 0),
      redeemedPoints: typedTransactions
        .filter((transaction) => transaction.type === 'redeem')
        .reduce((sum, transaction) => sum + transaction.points, 0),
    })
  }

  async completeOnboarding(input: CompleteOnboardingInput): Promise<HabitQuestServiceResult<CompleteOnboardingData>> {
    const authResult = await this.requireProfile()
    if (!authResult.ok) return authResult

    if (!input.goalIds.length) {
      return fail('invalid_input', 'Necesitás elegir al menos un objetivo para completar el onboarding.')
    }

    const selectedGoals = GOALS.filter((goal) => input.goalIds.includes(goal.id))
    if (selectedGoals.length !== input.goalIds.length) {
      return fail('invalid_input', 'Hay objetivos inválidos en el onboarding.')
    }

    const client = await this.createClient()
    const profile = authResult.data.profile

    const { data: updatedProfile, error: profileError } = await client
      .from('profiles')
      .update({
        display_name: input.displayName ?? profile.display_name,
        timezone: input.timezone ?? profile.timezone,
        coach_tone: input.coachTone ?? profile.coach_tone,
      })
      .eq('id', profile.id)
      .select('id, display_name, timezone, coach_tone')
      .single()

    if (profileError || !updatedProfile) {
      return fail('persistence_error', `No pude actualizar el perfil: ${profileError?.message ?? 'sin respuesta'}`)
    }

    const { data: existingGoals, error: goalsError } = await client
      .from('goals')
      .select('id, name')
      .eq('profile_id', profile.id)

    if (goalsError) {
      return fail('persistence_error', `No pude leer los objetivos actuales: ${goalsError.message}`)
    }

    const existingGoalNames = new Set((existingGoals ?? []).map((goal) => goal.name))
    const goalsToInsert = selectedGoals
      .filter((goal) => !existingGoalNames.has(goal.name))
      .map((goal) => ({
        profile_id: profile.id,
        name: goal.name,
        description: goal.description,
        status: 'active',
      }))

    if (goalsToInsert.length) {
      const { error } = await client.from('goals').insert(goalsToInsert)
      if (error) {
        return fail('persistence_error', `No pude guardar los objetivos del onboarding: ${error.message}`)
      }
    }

    const { data: existingActivities, error: activitiesError } = await client
      .from('user_activities')
      .select('id, name')
      .eq('profile_id', profile.id)

    if (activitiesError) {
      return fail('persistence_error', `No pude leer las actividades del usuario: ${activitiesError.message}`)
    }

    if (!(existingActivities?.length ?? 0)) {
      const activitySeeds = buildActivitySeeds().map((activity) => ({
        profile_id: profile.id,
        name: activity.name,
        description: activity.description,
        category: activity.category,
        duration_minutes: activity.duration_minutes ?? null,
        points: activity.points,
        status: 'active',
      }))

      const { error } = await client.from('user_activities').insert(activitySeeds)
      if (error) {
        return fail('persistence_error', `No pude crear las actividades iniciales: ${error.message}`)
      }
    }

    const existingActivityNames = new Set((existingActivities ?? []).map((activity) => activity.name.toLowerCase()))
    if (!(existingActivities?.length ?? 0)) {
      buildActivitySeeds().forEach((activity) => existingActivityNames.add(activity.name.toLowerCase()))
    }
    const customActivitiesToInsert = (input.customActivityNames ?? [])
      .map((name) => name.trim())
      .filter(Boolean)
      .filter((name, index, array) => array.findIndex((candidate) => candidate.toLowerCase() === name.toLowerCase()) === index)
      .filter((name) => !existingActivityNames.has(name.toLowerCase()))
      .map((name) => ({
        profile_id: profile.id,
        name,
        description: 'Actividad personalizada capturada durante el onboarding conversacional.',
        category: 'Custom',
        duration_minutes: null,
        points: 15,
        status: 'active',
      }))

    if (customActivitiesToInsert.length) {
      const { error } = await client.from('user_activities').insert(customActivitiesToInsert)
      if (error) {
        return fail('persistence_error', `No pude guardar las actividades personalizadas: ${error.message}`)
      }
    }

    const { data: existingRewards, error: rewardsError } = await client
      .from('rewards')
      .select('id, name')
      .eq('profile_id', profile.id)

    if (rewardsError) {
      return fail('persistence_error', `No pude leer las recompensas del usuario: ${rewardsError.message}`)
    }

    if (!(existingRewards?.length ?? 0)) {
      const rewardSeeds = buildRewardSeeds().map((reward) => ({
        profile_id: profile.id,
        name: reward.name,
        description: reward.description,
        category: reward.category,
        cost_points: reward.cost_points,
        duration_minutes: reward.duration_minutes,
        status: 'active',
      }))

      const { error } = await client.from('rewards').insert(rewardSeeds)
      if (error) {
        return fail('persistence_error', `No pude crear las recompensas iniciales: ${error.message}`)
      }
    }

    const existingRewardNames = new Set((existingRewards ?? []).map((reward) => reward.name.toLowerCase()))
    if (!(existingRewards?.length ?? 0)) {
      buildRewardSeeds().forEach((reward) => existingRewardNames.add(reward.name.toLowerCase()))
    }
    const customRewardsToInsert = (input.customRewardNames ?? [])
      .map((name) => name.trim())
      .filter(Boolean)
      .filter((name, index, array) => array.findIndex((candidate) => candidate.toLowerCase() === name.toLowerCase()) === index)
      .filter((name) => !existingRewardNames.has(name.toLowerCase()))
      .map((name) => ({
        profile_id: profile.id,
        name,
        description: 'Recompensa personalizada capturada durante el onboarding conversacional.',
        category: 'Custom',
        cost_points: 20,
        duration_minutes: null,
        status: 'active',
      }))

    if (customRewardsToInsert.length) {
      const { error } = await client.from('rewards').insert(customRewardsToInsert)
      if (error) {
        return fail('persistence_error', `No pude guardar las recompensas personalizadas: ${error.message}`)
      }
    }

    const { count: goalCount } = await client
      .from('goals')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profile.id)
      .eq('status', 'active')

    const { count: activityCount } = await client
      .from('user_activities')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profile.id)
      .eq('status', 'active')

    const { count: rewardCount } = await client
      .from('rewards')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profile.id)
      .eq('status', 'active')

    return ok({
      profileId: profile.id,
      displayName: updatedProfile.display_name,
      timezone: updatedProfile.timezone,
      coachTone: updatedProfile.coach_tone,
      goalCount: goalCount ?? selectedGoals.length,
      activityCount: activityCount ?? buildActivitySeeds().length,
      rewardCount: rewardCount ?? buildRewardSeeds().length,
    })
  }

  async updatePreferences(input: UpdatePreferencesInput): Promise<HabitQuestServiceResult<UpdatePreferencesData>> {
    const authResult = await this.requireProfile()
    if (!authResult.ok) return authResult

    if (!input.displayName && !input.timezone && !input.coachTone) {
      return fail('invalid_input', 'Tenés que enviar al menos una preferencia para actualizar.')
    }

    const profile = authResult.data.profile
    const client = await this.createClient()

    const { data, error } = await client
      .from('profiles')
      .update({
        display_name: input.displayName ?? profile.display_name,
        timezone: input.timezone ?? profile.timezone,
        coach_tone: input.coachTone ?? profile.coach_tone,
      })
      .eq('id', profile.id)
      .select('id, display_name, timezone, coach_tone')
      .single()

    if (error || !data) {
      return fail('persistence_error', `No pude actualizar preferencias: ${error?.message ?? 'sin respuesta'}`)
    }

    return ok({
      profileId: data.id,
      displayName: data.display_name,
      timezone: data.timezone,
      coachTone: data.coach_tone,
    })
  }

  async generateDailyPlan(input: GenerateDailyPlanInput): Promise<HabitQuestServiceResult<GenerateDailyPlanData>> {
    const authResult = await this.requireProfile()
    if (!authResult.ok) return authResult

    const profile = authResult.data.profile
    const client = await this.createClient()
    const planDate = toDayKey(input.date)
    const maxItems = normalizeMaxItems(input.maxItems)

    const { data: activities, error: activitiesError } = await client
      .from('user_activities')
      .select('id, name, category, duration_minutes, points, status')
      .eq('profile_id', profile.id)
      .eq('status', 'active')

    if (activitiesError) {
      return fail('persistence_error', `No pude leer las actividades del usuario: ${activitiesError.message}`)
    }

    const availableActivities = (activities ?? []).filter((activity) => activity.status === 'active')
    if (!availableActivities.length) {
      return fail('invalid_input', 'No hay actividades activas. Completá onboarding o creá actividades primero.')
    }

    const { data: planRows, error: planError } = await client
      .from('daily_plans')
      .select('id, plan_date, status, agent_summary')
      .eq('profile_id', profile.id)
      .eq('plan_date', planDate)
      .order('created_at', { ascending: false })
      .limit(1)

    if (planError) {
      return fail('persistence_error', `No pude leer el plan del día: ${planError.message}`)
    }

    let currentPlan = (planRows?.[0] ?? null) as ActivePlanRow | null

    if (currentPlan && !input.forceRegenerate) {
      const { data: existingItems, error } = await client
        .from('daily_plan_items')
        .select('id, title, duration_minutes, points, position, status, rationale')
        .eq('profile_id', profile.id)
        .eq('daily_plan_id', currentPlan.id)
        .order('position', { ascending: true })

      if (error) {
        return fail('persistence_error', `No pude leer los items del plan existente: ${error.message}`)
      }

      return ok({
        planId: currentPlan.id,
        planDate: currentPlan.plan_date,
        status: currentPlan.status,
        agentSummary: currentPlan.agent_summary,
        items: (existingItems ?? []).map((item) => ({
          id: item.id,
          title: item.title,
          durationMinutes: item.duration_minutes,
          points: item.points,
          position: item.position,
          status: item.status,
          rationale: item.rationale,
        })),
      })
    }

    const selectedActivities = selectActivitiesForDailyPlan(availableActivities, maxItems)
    const agentSummary = buildPlanSummary(input.focus)

    if (!currentPlan) {
      const { data, error } = await client
        .from('daily_plans')
        .insert({
          profile_id: profile.id,
          plan_date: planDate,
          status: 'active',
          agent_summary: agentSummary,
          created_from: input.focus ? 'manual' : 'on_demand',
        })
        .select('id, plan_date, status, agent_summary')
        .single()

      if (error || !data) {
        return fail('persistence_error', `No pude crear el plan diario: ${error?.message ?? 'sin respuesta'}`)
      }

      currentPlan = data as ActivePlanRow
    } else {
      const { error: updateError } = await client
        .from('daily_plans')
        .update({
          status: 'active',
          agent_summary: agentSummary,
        })
        .eq('id', currentPlan.id)

      if (updateError) {
        return fail('persistence_error', `No pude actualizar el plan diario: ${updateError.message}`)
      }

      const { error: deleteError } = await client
        .from('daily_plan_items')
        .delete()
        .eq('profile_id', profile.id)
        .eq('daily_plan_id', currentPlan.id)

      if (deleteError) {
        return fail('persistence_error', `No pude regenerar los items del plan: ${deleteError.message}`)
      }
    }

    const itemsToInsert = selectedActivities.map((activity, index) => ({
      profile_id: profile.id,
      daily_plan_id: currentPlan.id,
      user_activity_id: activity.id,
      title: activity.name,
      duration_minutes: activity.duration_minutes,
      points: activity.points,
      position: index + 1,
      status: 'pending',
      rationale: input.focus ? `Elegida para apoyar: ${input.focus}` : 'Elegida como siguiente paso simple y sostenible.',
    }))

    const { data: createdItems, error: itemsError } = await client
      .from('daily_plan_items')
      .insert(itemsToInsert)
      .select('id, title, duration_minutes, points, position, status, rationale')
      .order('position', { ascending: true })

    if (itemsError) {
      return fail('persistence_error', `No pude guardar los items del plan: ${itemsError.message}`)
    }

    return ok({
      planId: currentPlan.id,
      planDate,
      status: 'active',
      agentSummary,
      items: (createdItems ?? []).map((item) => ({
        id: item.id,
        title: item.title,
        durationMinutes: item.duration_minutes,
        points: item.points,
        position: item.position,
        status: item.status,
        rationale: item.rationale,
      })),
    })
  }

  async logCheckIn(input: LogCheckInInput): Promise<HabitQuestServiceResult<LogCheckInData>> {
    const authResult = await this.requireProfile()
    if (!authResult.ok) return authResult

    const profile = authResult.data.profile
    const client = await this.createClient()
    const today = toDayKey()
    const resolvedIntent = input.intent ?? detectCheckInIntent(input)

    const { data: planRows, error: planError } = await client
      .from('daily_plans')
      .select('id, status')
      .eq('profile_id', profile.id)
      .eq('plan_date', today)
      .eq('status', 'active')
      .limit(1)

    if (planError) {
      return fail('persistence_error', `No pude leer el plan activo para asociar el check-in: ${planError.message}`)
    }

    const activePlanId = planRows?.[0]?.id ?? null

    const { data, error } = await client
      .from('check_ins')
      .insert({
        profile_id: profile.id,
        daily_plan_id: activePlanId,
        message: input.message,
        energy_level: input.energyLevel ?? null,
        stress_level: input.stressLevel ?? null,
        intent: resolvedIntent,
        source: input.source ?? 'web',
      })
      .select('id, daily_plan_id, intent, source, created_at')
      .single()

    if (error || !data) {
      return fail('persistence_error', `No pude guardar el check-in: ${error?.message ?? 'sin respuesta'}`)
    }

    let adaptationApplied = false
    let adaptationSummary: string | null = null
    let planStatus: string | null = planRows?.[0]?.status ?? null
    let adaptedPlanItems: DailyPlanItemSummary[] = []

    if (activePlanId && (resolvedIntent === 'fatigue' || resolvedIntent === 'replan')) {
      const { data: currentItems, error: currentItemsError } = await client
        .from('daily_plan_items')
        .select('id, user_activity_id, title, duration_minutes, points, position, status, rationale')
        .eq('profile_id', profile.id)
        .eq('daily_plan_id', activePlanId)
        .order('position', { ascending: true })

      if (currentItemsError) {
        return fail('persistence_error', `No pude leer el plan a adaptar: ${currentItemsError.message}`)
      }

      const pendingItems = (currentItems ?? []).filter((item) => item.status === 'pending')
      const completedItems = (currentItems ?? []).filter((item) => item.status === 'completed')

      if (pendingItems.length) {
        const { data: activities, error: activitiesError } = await client
          .from('user_activities')
          .select('id, name, category, duration_minutes, points, status')
          .eq('profile_id', profile.id)
          .eq('status', 'active')

        if (activitiesError) {
          return fail('persistence_error', `No pude leer actividades para adaptar el plan: ${activitiesError.message}`)
        }

        const completedActivityIds = new Set(
          completedItems
            .map((item) => item.user_activity_id)
            .filter((activityId): activityId is string => typeof activityId === 'string'),
        )
        const pendingActivityIds = new Set(
          pendingItems
            .map((item) => item.user_activity_id)
            .filter((activityId): activityId is string => typeof activityId === 'string'),
        )

        const freshActivities = (activities ?? []).filter(
          (activity) => !completedActivityIds.has(activity.id) && !pendingActivityIds.has(activity.id),
        )
        const candidateActivities = freshActivities.length
          ? freshActivities
          : (activities ?? []).filter((activity) => !completedActivityIds.has(activity.id))
        const maxAdaptedItems =
          resolvedIntent === 'fatigue' || (typeof input.energyLevel === 'number' && input.energyLevel <= 2) ? 2 : 3
        const selectedActivities = selectActivitiesForCheckInAdjustment(candidateActivities, resolvedIntent, maxAdaptedItems)

        if (selectedActivities.length) {
          const currentMaxPosition = (currentItems ?? []).reduce((max, item) => Math.max(max, item.position), 0)
          const completedMaxPosition = completedItems.reduce((max, item) => Math.max(max, item.position), 0)
          const nextVisiblePosition = completedMaxPosition + 1
          const replacedBasePosition = currentMaxPosition + selectedActivities.length + 10

          for (const [index, item] of pendingItems.entries()) {
            const { error: replaceError } = await client
              .from('daily_plan_items')
              .update({
                status: 'replaced',
                position: replacedBasePosition + index,
              })
              .eq('profile_id', profile.id)
              .eq('id', item.id)

            if (replaceError) {
              return fail('persistence_error', `No pude conservar el historial del plan anterior: ${replaceError.message}`)
            }
          }

          const itemsToInsert = selectedActivities.map((activity, index) => ({
            profile_id: profile.id,
            daily_plan_id: activePlanId,
            user_activity_id: activity.id,
            title: activity.name,
            duration_minutes: activity.duration_minutes,
            points: activity.points,
            position: nextVisiblePosition + index,
            status: 'pending',
            rationale: buildAdaptationRationale(resolvedIntent, input.message),
          }))

          const { data: insertedItems, error: insertItemsError } = await client
            .from('daily_plan_items')
            .insert(itemsToInsert)
            .select('id, title, duration_minutes, points, position, status, rationale')
            .order('position', { ascending: true })

          if (insertItemsError) {
            return fail('persistence_error', `No pude guardar el plan adaptado: ${insertItemsError.message}`)
          }

          adaptationApplied = true
          adaptationSummary = buildAdaptationSummary(resolvedIntent)
          adaptedPlanItems = (insertedItems ?? []).map((item) => ({
            id: item.id,
            title: item.title,
            durationMinutes: item.duration_minutes,
            points: item.points,
            position: item.position,
            status: item.status,
            rationale: item.rationale,
          }))

          const { error: updatePlanError } = await client
            .from('daily_plans')
            .update({
              status: 'active',
              created_from: 'check_in_adjustment',
              agent_summary: adaptationSummary,
            })
            .eq('profile_id', profile.id)
            .eq('id', activePlanId)

          if (updatePlanError) {
            return fail('persistence_error', `No pude actualizar el resumen del plan adaptado: ${updatePlanError.message}`)
          }

          planStatus = 'active'
        }
      }
    }

    return ok({
      checkInId: data.id,
      dailyPlanId: data.daily_plan_id,
      intent: data.intent,
      source: data.source,
      createdAt: data.created_at,
      adaptationApplied,
      adaptationSummary,
      planStatus,
      adaptedPlanItems,
    })
  }

  async completePlanItem(input: CompletePlanItemInput): Promise<HabitQuestServiceResult<CompletePlanItemData>> {
    const authResult = await this.requireProfile()
    if (!authResult.ok) return authResult

    const profile = authResult.data.profile
    const client = await this.createClient()

    const { data: item, error: itemError } = await client
      .from('daily_plan_items')
      .select('id, daily_plan_id, user_activity_id, title, points, status')
      .eq('profile_id', profile.id)
      .eq('id', input.planItemId)
      .maybeSingle()

    if (itemError) {
      return fail('persistence_error', `No pude leer el item del plan: ${itemError.message}`)
    }

    if (!item) {
      return fail('not_found', 'No encontré ese item del plan.')
    }

    if (item.status === 'completed') {
      return fail('conflict', 'Ese item ya estaba completado.')
    }

    const completedAt = new Date().toISOString()

    const { error: planItemUpdateError } = await client
      .from('daily_plan_items')
      .update({
        status: 'completed',
        completed_at: completedAt,
      })
      .eq('profile_id', profile.id)
      .eq('id', item.id)

    if (planItemUpdateError) {
      return fail('persistence_error', `No pude marcar el item como completado: ${planItemUpdateError.message}`)
    }

    const { data: completion, error: completionError } = await client
      .from('completions')
      .insert({
        profile_id: profile.id,
        daily_plan_item_id: item.id,
        user_activity_id: item.user_activity_id,
        source: input.source ?? 'web',
        duration_minutes: input.durationMinutes ?? null,
        points_awarded: item.points,
        note: input.note ?? null,
      })
      .select('id')
      .single()

    if (completionError || !completion) {
      return fail('persistence_error', `No pude registrar la completion: ${completionError?.message ?? 'sin respuesta'}`)
    }

    const { data: walletTransaction, error: walletError } = await client
      .from('wallet_transactions')
      .insert({
        profile_id: profile.id,
        type: 'earn',
        points: item.points,
        reason: `Completion: ${item.title}`,
        completion_id: completion.id,
      })
      .select('id')
      .single()

    if (walletError || !walletTransaction) {
      return fail('persistence_error', `No pude registrar los puntos ganados: ${walletError?.message ?? 'sin respuesta'}`)
    }

    const { data: pendingItems, error: pendingError } = await client
      .from('daily_plan_items')
      .select('id')
      .eq('profile_id', profile.id)
      .eq('daily_plan_id', item.daily_plan_id)
      .eq('status', 'pending')

    if (pendingError) {
      return fail('persistence_error', `No pude recalcular el estado del plan: ${pendingError.message}`)
    }

    const planStatus = pendingItems?.length ? 'active' : 'completed'

    const { error: planUpdateError } = await client
      .from('daily_plans')
      .update({
        status: planStatus,
      })
      .eq('profile_id', profile.id)
      .eq('id', item.daily_plan_id)

    if (planUpdateError) {
      return fail('persistence_error', `No pude actualizar el estado del plan: ${planUpdateError.message}`)
    }

    const walletResult = await this.getWalletSnapshot(profile.id)
    if (!walletResult.ok) return walletResult

    return ok({
      planItemId: item.id,
      completionId: completion.id,
      walletTransactionId: walletTransaction.id,
      pointsAwarded: item.points,
      availablePoints: walletResult.data.availablePoints,
      planStatus,
    })
  }

  async redeemReward(input: RedeemRewardInput): Promise<HabitQuestServiceResult<RedeemRewardData>> {
    const authResult = await this.requireProfile()
    if (!authResult.ok) return authResult

    const profile = authResult.data.profile
    const client = await this.createClient()

    const { data: reward, error: rewardError } = await client
      .from('rewards')
      .select('id, name, cost_points, status')
      .eq('profile_id', profile.id)
      .eq('id', input.rewardId)
      .maybeSingle()

    if (rewardError) {
      return fail('persistence_error', `No pude leer la recompensa: ${rewardError.message}`)
    }

    if (!reward) {
      return fail('not_found', 'No encontré esa recompensa.')
    }

    if (reward.status !== 'active') {
      return fail('conflict', 'La recompensa no está activa.')
    }

    const walletResult = await this.getWalletSnapshot(profile.id)
    if (!walletResult.ok) return walletResult

    if (walletResult.data.availablePoints < reward.cost_points) {
      return fail('insufficient_points', 'No te alcanzan los puntos para canjear esta recompensa.')
    }

    const { data: walletTransaction, error: walletError } = await client
      .from('wallet_transactions')
      .insert({
        profile_id: profile.id,
        type: 'redeem',
        points: reward.cost_points,
        reason: input.note?.trim() || `Reward redeemed: ${reward.name}`,
        reward_id: reward.id,
      })
      .select('id')
      .single()

    if (walletError || !walletTransaction) {
      return fail('persistence_error', `No pude registrar el canje: ${walletError?.message ?? 'sin respuesta'}`)
    }

    return ok({
      rewardId: reward.id,
      rewardName: reward.name,
      walletTransactionId: walletTransaction.id,
      remainingPoints: walletResult.data.availablePoints - reward.cost_points,
    })
  }

  async getTodaySummary({ date }: { date?: string | null } = {}): Promise<HabitQuestServiceResult<TodaySummaryData>> {
    const authResult = await this.requireProfile()
    if (!authResult.ok) return authResult

    const profile = authResult.data.profile
    const client = await this.createClient()
    const planDate = toDayKey(date)

    const { data: planRows, error: planError } = await client
      .from('daily_plans')
      .select('id, plan_date, status, agent_summary')
      .eq('profile_id', profile.id)
      .eq('plan_date', planDate)
      .order('created_at', { ascending: false })
      .limit(1)

    if (planError) {
      return fail('persistence_error', `No pude leer el resumen del día: ${planError.message}`)
    }

    const currentPlan = (planRows?.[0] ?? null) as ActivePlanRow | null

    const { data: items, error: itemsError } = currentPlan
      ? await client
          .from('daily_plan_items')
          .select('id, title, duration_minutes, points, position, status, rationale')
          .eq('profile_id', profile.id)
          .eq('daily_plan_id', currentPlan.id)
          .order('position', { ascending: true })
      : { data: [], error: null }

    if (itemsError) {
      return fail('persistence_error', `No pude leer los items del resumen: ${itemsError.message}`)
    }

    const { data: checkIns, error: checkInError } = await client
      .from('check_ins')
      .select('id, message, intent, created_at')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (checkInError) {
      return fail('persistence_error', `No pude leer el último check-in: ${checkInError.message}`)
    }

    const walletResult = await this.getWalletSnapshot(profile.id)
    if (!walletResult.ok) return walletResult

    const mappedItems = (items ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      durationMinutes: item.duration_minutes,
      points: item.points,
      position: item.position,
      status: item.status,
      rationale: item.rationale,
    }))

    return ok({
      profileId: profile.id,
      planId: currentPlan?.id ?? null,
      planDate,
      planStatus: currentPlan?.status ?? null,
      agentSummary: currentPlan?.agent_summary ?? null,
      availablePoints: walletResult.data.availablePoints,
      completedPoints: walletResult.data.completedPoints,
      redeemedPoints: walletResult.data.redeemedPoints,
      completedItemsCount: mappedItems.filter((item) => item.status === 'completed').length,
      pendingItemsCount: mappedItems.filter((item) => item.status === 'pending').length,
      items: mappedItems,
      recentCheckIn: checkIns?.[0]
        ? {
            id: checkIns[0].id,
            message: checkIns[0].message,
            intent: checkIns[0].intent,
            createdAt: checkIns[0].created_at,
          }
        : null,
    })
  }
}

export function createHabitQuestDomainService(dependencies?: ServiceDependencies) {
  return new HabitQuestDomainService(dependencies)
}
