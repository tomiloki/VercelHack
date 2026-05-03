import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateWalletBalance, selectActivitiesForDailyPlan } from '../lib/ai/habitquest-domain-service'
import { createHabitQuestTools } from '../lib/ai/habitquest-tools'

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

test('wallet balance subtracts redeems from earned points', () => {
  const balance = calculateWalletBalance([
    { type: 'earn', points: 40 },
    { type: 'redeem', points: 15 },
    { type: 'adjustment', points: 5 },
  ])

  assert.equal(balance, 30)
})
