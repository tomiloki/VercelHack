import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateWalletBalance,
  createHabitQuestDomainService,
  detectCheckInIntent,
  selectActivitiesForCheckInAdjustment,
  selectActivitiesForDailyPlan,
} from '../lib/ai/habitquest-domain-service'
import { createHabitQuestTools } from '../lib/ai/habitquest-tools'

type MockState = {
  daily_plans: Array<Record<string, any>>
  daily_plan_items: Array<Record<string, any>>
  user_activities: Array<Record<string, any>>
  check_ins: Array<Record<string, any>>
  completions: Array<Record<string, any>>
  rewards: Array<Record<string, any>>
  wallet_transactions: Array<Record<string, any>>
}

class MockSupabaseQuery {
  private readonly filters = new Map<string, unknown>()
  private selectClause = ''
  private insertPayload: Record<string, any> | Array<Record<string, any>> | null = null
  private updatePayload: Record<string, any> | null = null
  private orderColumn: string | null = null
  private orderAscending = true
  private rowLimit: number | null = null

  constructor(
    private readonly state: MockState,
    private readonly table: keyof MockState,
    private operation: 'select' | 'insert' | 'update' = 'select',
  ) {}

  select(clause: string) {
    this.selectClause = clause
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.set(column, value)
    return this
  }

  limit(value: number) {
    this.rowLimit = value
    return this
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderColumn = column
    this.orderAscending = options?.ascending ?? true
    return this
  }

  insert(payload: Record<string, any> | Array<Record<string, any>>) {
    this.operation = 'insert'
    this.insertPayload = payload
    return this
  }

  update(payload: Record<string, any>) {
    this.operation = 'update'
    this.updatePayload = payload
    return this
  }

  single() {
    return this.executeSingle()
  }

  maybeSingle() {
    return this.executeSingle()
  }

  then(resolve: (value: any) => unknown, reject?: (reason: unknown) => unknown) {
    return this.execute().then(resolve, reject)
  }

  private async execute() {
    if (this.operation === 'insert') {
      return this.handleInsert(false)
    }

    if (this.operation === 'update') {
      return this.handleUpdate(false)
    }

    return this.handleSelect()
  }

  private async executeSingle() {
    if (this.operation === 'insert') {
      return this.handleInsert(true)
    }

    if (this.operation === 'update') {
      return this.handleUpdate(true)
    }

    const result = await this.handleSelect()
    const data = Array.isArray(result.data) ? result.data[0] ?? null : result.data
    return { data, error: null }
  }

  private applyFilters(rows: Array<Record<string, any>>) {
    return rows.filter((row) =>
      [...this.filters.entries()].every(([column, value]) => {
        if (column in row) {
          return row[column] === value
        }

        const snakeColumn = column.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`)
        return row[snakeColumn] === value
      }),
    )
  }

  private projectRow(row: Record<string, any>) {
    if (!this.selectClause) {
      return row
    }

    const columns = this.selectClause
      .split(',')
      .map((column) => column.trim())
      .filter(Boolean)

    return columns.reduce<Record<string, any>>((accumulator, column) => {
      accumulator[column] = row[column]
      return accumulator
    }, {})
  }

  private async handleSelect() {
    let rows = this.applyFilters(this.state[this.table])

    if (this.orderColumn) {
      rows = [...rows].sort((left, right) => {
        const leftValue = left[this.orderColumn!]
        const rightValue = right[this.orderColumn!]
        const comparison = leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0
        return this.orderAscending ? comparison : comparison * -1
      })
    }

    if (typeof this.rowLimit === 'number') {
      rows = rows.slice(0, this.rowLimit)
    }

    return {
      data: rows.map((row) => this.projectRow(row)),
      error: null,
    }
  }

  private async handleInsert(single: boolean) {
    const payloads = Array.isArray(this.insertPayload) ? this.insertPayload : [this.insertPayload]
    const inserted = payloads.map((payload, index) => ({
      id: payload?.id ?? `${String(this.table)}-${this.state[this.table].length + index + 1}`,
      ...payload,
      created_at: payload?.created_at ?? '2026-05-04T12:00:00.000Z',
      updated_at: payload?.updated_at ?? '2026-05-04T12:00:00.000Z',
    }))

    this.state[this.table].push(...inserted)

    const projected = inserted.map((row) => this.projectRow(row))
    return {
      data: single ? projected[0] ?? null : projected,
      error: null,
    }
  }

  private async handleUpdate(single: boolean) {
    const matchingRows = this.applyFilters(this.state[this.table])

    matchingRows.forEach((row) => {
      Object.assign(row, this.updatePayload)
    })

    const projected = matchingRows.map((row) => this.projectRow(row))
    return {
      data: single ? projected[0] ?? null : projected,
      error: null,
    }
  }
}

function createMockSupabaseClient(state: MockState) {
  return {
    from(table: keyof MockState) {
      return new MockSupabaseQuery(state, table)
    },
  }
}

test('domain toolset exposes every required planning and tracking tool', () => {
  const tools = createHabitQuestTools({
    service: {
      completeOnboarding: async () => ({
        ok: true,
        data: {
          profileId: 'profile-1',
          displayName: 'Tomi',
          timezone: 'America/Santiago',
          coachTone: 'collaborative',
          goalCount: 2,
          activityCount: 12,
          rewardCount: 8,
        },
      }),
      generateDailyPlan: async () => ({
        ok: true,
        data: {
          planId: 'plan-1',
          planDate: '2026-05-03',
          status: 'active',
          agentSummary: 'Plan chico.',
          items: [],
        },
      }),
      logCheckIn: async () => ({
        ok: true,
        data: {
          checkInId: 'check-1',
          dailyPlanId: 'plan-1',
          intent: 'progress',
          source: 'web',
          createdAt: '2026-05-03T10:00:00.000Z',
          adaptationApplied: false,
          adaptationSummary: null,
          planStatus: 'active',
          adaptedPlanItems: [],
        },
      }),
      completePlanItem: async () => ({
        ok: true,
        data: {
          planItemId: 'item-1',
          completionId: 'completion-1',
          walletTransactionId: 'wallet-1',
          pointsAwarded: 20,
          availablePoints: 20,
          planStatus: 'active',
        },
      }),
      redeemReward: async () => ({
        ok: true,
        data: {
          rewardId: 'reward-1',
          rewardName: 'Gaming session',
          walletTransactionId: 'wallet-2',
          remainingPoints: 5,
        },
      }),
      getTodaySummary: async () => ({
        ok: true,
        data: {
          profileId: 'profile-1',
          planId: 'plan-1',
          planDate: '2026-05-03',
          planStatus: 'active',
          agentSummary: 'Plan chico.',
          availablePoints: 20,
          completedPoints: 40,
          redeemedPoints: 20,
          completedItemsCount: 1,
          pendingItemsCount: 2,
          items: [],
          recentCheckIn: null,
        },
      }),
      updatePreferences: async () => ({
        ok: true,
        data: {
          profileId: 'profile-1',
          displayName: 'Tomi',
          timezone: 'America/Santiago',
          coachTone: 'calm',
        },
      }),
    },
  })

  assert.deepEqual(Object.keys(tools).sort(), [
    'completeOnboarding',
    'completePlanItem',
    'generateDailyPlan',
    'getTodaySummary',
    'logCheckIn',
    'redeemReward',
    'updatePreferences',
  ])
})

test('logCheckIn tool exposes adaptation details from the domain service', async () => {
  const tools = createHabitQuestTools({
    service: {
      completeOnboarding: async () => {
        throw new Error('not used')
      },
      generateDailyPlan: async () => {
        throw new Error('not used')
      },
      logCheckIn: async () => ({
        ok: true,
        data: {
          checkInId: 'check-1',
          dailyPlanId: 'plan-1',
          intent: 'fatigue',
          source: 'web',
          createdAt: '2026-05-04T12:00:00.000Z',
          adaptationApplied: true,
          adaptationSummary: 'Ajusté el plan a una versión más liviana para cuidar tu energía sin cortar la racha.',
          planStatus: 'active',
          adaptedPlanItems: [
            {
              id: 'item-1',
              title: 'Tomar agua',
              durationMinutes: 1,
              points: 5,
              position: 1,
              status: 'pending',
              rationale: 'Adaptada por energía baja: Estoy cansado.',
            },
          ],
        },
      }),
      completePlanItem: async () => {
        throw new Error('not used')
      },
      redeemReward: async () => {
        throw new Error('not used')
      },
      getTodaySummary: async () => {
        throw new Error('not used')
      },
      updatePreferences: async () => {
        throw new Error('not used')
      },
    },
  })

  const execute = (tools.logCheckIn as { execute: (input: { message: string }) => Promise<unknown> }).execute
  const result = (await execute({ message: 'Estoy cansado.' })) as {
    ok: boolean
    adaptationApplied: boolean
    adaptationSummary: string | null
    adaptedPlanItems: Array<{ title: string }>
  }

  assert.equal(result.ok, true)
  assert.equal(result.adaptationApplied, true)
  assert.match(result.adaptationSummary ?? '', /versión más liviana/i)
  assert.equal(result.adaptedPlanItems[0]?.title, 'Tomar agua')
})

test('redeemReward tool returns a clear structured error from the domain service', async () => {
  const tools = createHabitQuestTools({
    service: {
      completeOnboarding: async () => {
        throw new Error('not used')
      },
      generateDailyPlan: async () => {
        throw new Error('not used')
      },
      logCheckIn: async () => {
        throw new Error('not used')
      },
      completePlanItem: async () => {
        throw new Error('not used')
      },
      redeemReward: async () => ({
        ok: false,
        error: {
          code: 'insufficient_points',
          message: 'No te alcanzan los puntos para canjear esta recompensa.',
        },
      }),
      getTodaySummary: async () => {
        throw new Error('not used')
      },
      updatePreferences: async () => {
        throw new Error('not used')
      },
    },
  })

  const execute = (tools.redeemReward as { execute: (input: { rewardId: string }) => Promise<unknown> }).execute
  const result = (await execute({ rewardId: '550e8400-e29b-41d4-a716-446655440000' })) as {
    ok: boolean
    error: { code: string; message: string } | null
    remainingPoints: number | null
  }

  assert.equal(result.ok, false)
  assert.equal(result.error?.code, 'insufficient_points')
  assert.equal(result.remainingPoints, null)
})

test('detectCheckInIntent recognizes fatigue and replan signals from the user context', () => {
  assert.equal(
    detectCheckInIntent({
      message: 'Estoy cansado y sin energía hoy.',
      energyLevel: undefined,
      stressLevel: undefined,
    }),
    'fatigue',
  )

  assert.equal(
    detectCheckInIntent({
      message: 'Estoy con poco tiempo y bastante estrés.',
      energyLevel: undefined,
      stressLevel: undefined,
    }),
    'replan',
  )
})

test('daily plan selection spreads categories before repeating', () => {
  const selected = selectActivitiesForDailyPlan(
    [
      { name: 'Walk', category: 'Movement', points: 20, duration_minutes: 15 },
      { name: 'Stretch', category: 'Movement', points: 10, duration_minutes: 10 },
      { name: 'Meditate', category: 'Mind', points: 25, duration_minutes: 10 },
      { name: 'Read', category: 'Learning', points: 15, duration_minutes: 20 },
    ],
    3,
  )

  assert.deepEqual(
    selected.map((item) => item.name),
    ['Meditate', 'Walk', 'Read'],
  )
})

test('check-in adjustment selection prioritizes short low-friction activities', () => {
  const selected = selectActivitiesForCheckInAdjustment(
    [
      { id: 'a-1', name: 'Walk', category: 'Movement', points: 20, duration_minutes: 15 },
      { id: 'a-2', name: 'Tomar agua', category: 'Health', points: 5, duration_minutes: 1 },
      { id: 'a-3', name: 'Respirar', category: 'Mind', points: 10, duration_minutes: 5 },
      { id: 'a-4', name: 'Leer', category: 'Learning', points: 15, duration_minutes: 20 },
    ],
    'fatigue',
    2,
  )

  assert.deepEqual(
    selected.map((item) => item.name),
    ['Tomar agua', 'Respirar'],
  )
})

test('logCheckIn stores the detected intent and adapts pending items without deleting history', async () => {
  const state: MockState = {
    daily_plans: [
      {
        id: 'plan-1',
        profile_id: 'profile-1',
        plan_date: '2026-05-04',
        status: 'active',
        agent_summary: 'Plan original',
        created_from: 'manual',
      },
    ],
    daily_plan_items: [
      {
        id: 'item-completed',
        profile_id: 'profile-1',
        daily_plan_id: 'plan-1',
        user_activity_id: 'activity-walk',
        title: 'Caminar',
        duration_minutes: 15,
        points: 20,
        position: 1,
        status: 'completed',
        rationale: 'Hecha temprano.',
      },
      {
        id: 'item-pending-1',
        profile_id: 'profile-1',
        daily_plan_id: 'plan-1',
        user_activity_id: 'activity-read',
        title: 'Leer',
        duration_minutes: 20,
        points: 15,
        position: 2,
        status: 'pending',
        rationale: 'Plan original.',
      },
      {
        id: 'item-pending-2',
        profile_id: 'profile-1',
        daily_plan_id: 'plan-1',
        user_activity_id: 'activity-stretch',
        title: 'Estirar',
        duration_minutes: 10,
        points: 10,
        position: 3,
        status: 'pending',
        rationale: 'Plan original.',
      },
    ],
    user_activities: [
      {
        id: 'activity-walk',
        profile_id: 'profile-1',
        name: 'Caminar',
        category: 'Movement',
        duration_minutes: 15,
        points: 20,
        status: 'active',
      },
      {
        id: 'activity-read',
        profile_id: 'profile-1',
        name: 'Leer',
        category: 'Learning',
        duration_minutes: 20,
        points: 15,
        status: 'active',
      },
      {
        id: 'activity-stretch',
        profile_id: 'profile-1',
        name: 'Estirar',
        category: 'Movement',
        duration_minutes: 10,
        points: 10,
        status: 'active',
      },
      {
        id: 'activity-water',
        profile_id: 'profile-1',
        name: 'Tomar agua',
        category: 'Health',
        duration_minutes: 1,
        points: 5,
        status: 'active',
      },
      {
        id: 'activity-breathe',
        profile_id: 'profile-1',
        name: 'Respirar 5 minutos',
        category: 'Mind',
        duration_minutes: 5,
        points: 10,
        status: 'active',
      },
    ],
    check_ins: [],
    completions: [],
    rewards: [],
    wallet_transactions: [],
  }

  const service = createHabitQuestDomainService({
    createClient: async () => createMockSupabaseClient(state) as never,
    getProfileContext: async () => ({
      isConfigured: true,
      profile: {
        id: 'profile-1',
        user_id: 'user-1',
        display_name: 'Tomi',
        timezone: 'America/Santiago',
        coach_tone: 'collaborative',
        created_at: '2026-05-04T08:00:00.000Z',
        updated_at: '2026-05-04T08:00:00.000Z',
      },
    }),
  })

  const result = await service.logCheckIn({
    message: 'Estoy cansado y sin energía hoy.',
  })

  assert.equal(result.ok, true)
  if (!result.ok) return

  assert.equal(result.data.intent, 'fatigue')
  assert.equal(result.data.adaptationApplied, true)
  assert.deepEqual(
    result.data.adaptedPlanItems.map((item) => item.title),
    ['Tomar agua', 'Respirar 5 minutos'],
  )

  assert.equal(state.check_ins.length, 1)
  assert.equal(state.check_ins[0]?.intent, 'fatigue')

  const replacedItems = state.daily_plan_items.filter((item) => item.status === 'replaced')
  const pendingItems = state.daily_plan_items.filter((item) => item.status === 'pending')

  assert.equal(replacedItems.length, 2)
  assert.equal(pendingItems.length, 2)
  assert.equal(state.daily_plan_items.length, 5)
})

test('completePlanItem creates an earn wallet transaction and returns updated available points', async () => {
  const state: MockState = {
    daily_plans: [
      {
        id: 'plan-1',
        profile_id: 'profile-1',
        plan_date: '2026-05-04',
        status: 'active',
        agent_summary: 'Plan original',
        created_from: 'manual',
      },
    ],
    daily_plan_items: [
      {
        id: 'item-1',
        profile_id: 'profile-1',
        daily_plan_id: 'plan-1',
        user_activity_id: 'activity-1',
        title: 'Caminar',
        duration_minutes: 15,
        points: 20,
        position: 1,
        status: 'pending',
        rationale: 'Plan original.',
      },
    ],
    user_activities: [],
    check_ins: [],
    completions: [],
    rewards: [],
    wallet_transactions: [
      {
        id: 'wallet-0',
        profile_id: 'profile-1',
        type: 'earn',
        points: 10,
        reason: 'Existing points',
      },
    ],
  }

  const service = createHabitQuestDomainService({
    createClient: async () => createMockSupabaseClient(state) as never,
    getProfileContext: async () => ({
      isConfigured: true,
      profile: {
        id: 'profile-1',
        user_id: 'user-1',
        display_name: 'Tomi',
        timezone: 'America/Santiago',
        coach_tone: 'collaborative',
        created_at: '2026-05-04T08:00:00.000Z',
        updated_at: '2026-05-04T08:00:00.000Z',
      },
    }),
  })

  const result = await service.completePlanItem({
    planItemId: 'item-1',
  })

  assert.equal(result.ok, true)
  if (!result.ok) return

  assert.equal(result.data.pointsAwarded, 20)
  assert.equal(result.data.availablePoints, 30)
  assert.equal(state.completions.length, 1)
  assert.equal(state.wallet_transactions.length, 2)
  assert.equal(state.wallet_transactions[1]?.type, 'earn')
  assert.equal(state.wallet_transactions[1]?.points, 20)
  assert.equal(state.daily_plan_items[0]?.status, 'completed')
})

test('redeemReward creates a redeem wallet transaction and returns remaining points', async () => {
  const state: MockState = {
    daily_plans: [],
    daily_plan_items: [],
    user_activities: [],
    check_ins: [],
    completions: [],
    rewards: [
      {
        id: 'reward-1',
        profile_id: 'profile-1',
        name: 'Gaming session',
        cost_points: 25,
        status: 'active',
      },
    ],
    wallet_transactions: [
      {
        id: 'wallet-1',
        profile_id: 'profile-1',
        type: 'earn',
        points: 40,
        reason: 'Existing points',
      },
    ],
  }

  const service = createHabitQuestDomainService({
    createClient: async () => createMockSupabaseClient(state) as never,
    getProfileContext: async () => ({
      isConfigured: true,
      profile: {
        id: 'profile-1',
        user_id: 'user-1',
        display_name: 'Tomi',
        timezone: 'America/Santiago',
        coach_tone: 'collaborative',
        created_at: '2026-05-04T08:00:00.000Z',
        updated_at: '2026-05-04T08:00:00.000Z',
      },
    }),
  })

  const result = await service.redeemReward({
    rewardId: 'reward-1',
  })

  assert.equal(result.ok, true)
  if (!result.ok) return

  assert.equal(result.data.rewardName, 'Gaming session')
  assert.equal(result.data.remainingPoints, 15)
  assert.equal(state.wallet_transactions.length, 2)
  assert.equal(state.wallet_transactions[1]?.type, 'redeem')
  assert.equal(state.wallet_transactions[1]?.points, 25)
})

test('wallet balance subtracts redeems from earned points', () => {
  const balance = calculateWalletBalance([
    { type: 'earn', points: 40 },
    { type: 'redeem', points: 15 },
    { type: 'adjustment', points: 5 },
  ])

  assert.equal(balance, 30)
})

test('detectCheckInIntent returns reward_request when user mentions redeeming a reward', () => {
  assert.equal(
    detectCheckInIntent({ message: 'Quiero canjear mi recompensa de gaming.', energyLevel: undefined, stressLevel: undefined }),
    'reward_request',
  )
  assert.equal(
    detectCheckInIntent({ message: '¿Puedo usar mis puntos para un premio?', energyLevel: undefined, stressLevel: undefined }),
    'reward_request',
  )
})

test('redeemReward returns insufficient_points error when available balance is below cost', async () => {
  const state: MockState = {
    daily_plans: [],
    daily_plan_items: [],
    user_activities: [],
    check_ins: [],
    completions: [],
    rewards: [
      {
        id: 'reward-1',
        profile_id: 'profile-1',
        name: 'Gaming session',
        cost_points: 50,
        status: 'active',
      },
    ],
    wallet_transactions: [
      {
        id: 'wallet-1',
        profile_id: 'profile-1',
        type: 'earn',
        points: 20,
        reason: 'Existing points',
      },
    ],
  }

  const service = createHabitQuestDomainService({
    createClient: async () => createMockSupabaseClient(state) as never,
    getProfileContext: async () => ({
      isConfigured: true,
      profile: {
        id: 'profile-1',
        user_id: 'user-1',
        display_name: 'Tomi',
        timezone: 'America/Santiago',
        coach_tone: 'collaborative',
        created_at: '2026-05-04T08:00:00.000Z',
        updated_at: '2026-05-04T08:00:00.000Z',
      },
    }),
  })

  const result = await service.redeemReward({ rewardId: 'reward-1' })

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.error.code, 'insufficient_points')
  assert.equal(state.wallet_transactions.length, 1, 'no redeem transaction should be created when balance is insufficient')
})
