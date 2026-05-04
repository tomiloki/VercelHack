import { tool } from 'ai'
import { z } from 'zod'
import {
  CHECK_IN_INTENTS,
  CHECK_IN_SOURCES,
  COACH_TONES,
  createHabitQuestDomainService,
  type HabitQuestDomainService,
} from '@/lib/ai/habitquest-domain-service'

const errorSchema = z.object({
  code: z.string(),
  message: z.string(),
})

const planItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  durationMinutes: z.number().int().nullable(),
  points: z.number().int(),
  position: z.number().int(),
  status: z.string(),
  rationale: z.string().nullable(),
})

const summaryBaseSchema = z.object({
  ok: z.boolean(),
  error: errorSchema.nullable(),
})

const completeOnboardingOutputSchema = summaryBaseSchema.extend({
  profileId: z.string().nullable(),
  displayName: z.string().nullable(),
  timezone: z.string().nullable(),
  coachTone: z.string().nullable(),
  goalCount: z.number().int().nullable(),
  activityCount: z.number().int().nullable(),
  rewardCount: z.number().int().nullable(),
})

const generateDailyPlanOutputSchema = summaryBaseSchema.extend({
  planId: z.string().nullable(),
  planDate: z.string().nullable(),
  status: z.string().nullable(),
  agentSummary: z.string().nullable(),
  items: z.array(planItemSchema),
})

const logCheckInOutputSchema = summaryBaseSchema.extend({
  checkInId: z.string().nullable(),
  dailyPlanId: z.string().nullable(),
  intent: z.string().nullable(),
  source: z.string().nullable(),
  createdAt: z.string().nullable(),
})

const completePlanItemOutputSchema = summaryBaseSchema.extend({
  planItemId: z.string().nullable(),
  completionId: z.string().nullable(),
  walletTransactionId: z.string().nullable(),
  pointsAwarded: z.number().int().nullable(),
  availablePoints: z.number().int().nullable(),
  planStatus: z.string().nullable(),
})

const redeemRewardOutputSchema = summaryBaseSchema.extend({
  rewardId: z.string().nullable(),
  rewardName: z.string().nullable(),
  walletTransactionId: z.string().nullable(),
  remainingPoints: z.number().int().nullable(),
})

const getTodaySummaryOutputSchema = summaryBaseSchema.extend({
  profileId: z.string().nullable(),
  planId: z.string().nullable(),
  planDate: z.string().nullable(),
  planStatus: z.string().nullable(),
  agentSummary: z.string().nullable(),
  availablePoints: z.number().int().nullable(),
  completedPoints: z.number().int().nullable(),
  redeemedPoints: z.number().int().nullable(),
  completedItemsCount: z.number().int().nullable(),
  pendingItemsCount: z.number().int().nullable(),
  items: z.array(planItemSchema),
  recentCheckIn: z
    .object({
      id: z.string(),
      message: z.string(),
      intent: z.string(),
      createdAt: z.string(),
    })
    .nullable(),
})

const updatePreferencesOutputSchema = summaryBaseSchema.extend({
  profileId: z.string().nullable(),
  displayName: z.string().nullable(),
  timezone: z.string().nullable(),
  coachTone: z.string().nullable(),
})

type ToolOptions = {
  service?: Pick<
    HabitQuestDomainService,
    | 'completeOnboarding'
    | 'generateDailyPlan'
    | 'logCheckIn'
    | 'completePlanItem'
    | 'redeemReward'
    | 'getTodaySummary'
    | 'updatePreferences'
  >
}

function withError<T extends Record<string, unknown>>(error: { code: string; message: string }, empty: T) {
  return {
    ok: false,
    error,
    ...empty,
  }
}

export function createHabitQuestTools({ service = createHabitQuestDomainService() }: ToolOptions = {}) {
  return {
    completeOnboarding: tool({
      description: 'Complete onboarding, persist user goals, and seed starter activities plus rewards for the authenticated HabitQuest profile.',
      inputSchema: z.object({
        goalIds: z.array(z.string()).min(1),
        displayName: z.string().trim().min(1).nullable().optional(),
        timezone: z.string().trim().min(1).nullable().optional(),
        coachTone: z.enum(COACH_TONES).nullable().optional(),
        customActivityNames: z.array(z.string().trim().min(1)).max(5).optional(),
        customRewardNames: z.array(z.string().trim().min(1)).max(5).optional(),
      }),
      outputSchema: completeOnboardingOutputSchema,
      strict: true,
      execute: async (input) => {
        const result = await service.completeOnboarding(input)
        return result.ok
          ? {
              ok: true,
              error: null,
              profileId: result.data.profileId,
              displayName: result.data.displayName,
              timezone: result.data.timezone,
              coachTone: result.data.coachTone,
              goalCount: result.data.goalCount,
              activityCount: result.data.activityCount,
              rewardCount: result.data.rewardCount,
            }
          : withError(result.error, {
              profileId: null,
              displayName: null,
              timezone: null,
              coachTone: null,
              goalCount: null,
              activityCount: null,
              rewardCount: null,
            })
      },
    }),
    generateDailyPlan: tool({
      description: 'Generate and persist today’s plan for the authenticated HabitQuest profile using saved activities.',
      inputSchema: z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
        focus: z.string().trim().min(1).nullable().optional(),
        maxItems: z.number().int().min(1).max(6).optional(),
        forceRegenerate: z.boolean().optional(),
      }),
      outputSchema: generateDailyPlanOutputSchema,
      strict: true,
      execute: async (input) => {
        const result = await service.generateDailyPlan(input)
        return result.ok
          ? {
              ok: true,
              error: null,
              planId: result.data.planId,
              planDate: result.data.planDate,
              status: result.data.status,
              agentSummary: result.data.agentSummary,
              items: result.data.items,
            }
          : withError(result.error, {
              planId: null,
              planDate: null,
              status: null,
              agentSummary: null,
              items: [],
            })
      },
    }),
    logCheckIn: tool({
      description: 'Persist a user check-in linked to the authenticated HabitQuest profile and current active plan when available.',
      inputSchema: z.object({
        message: z.string().trim().min(1),
        energyLevel: z.number().int().min(1).max(5).nullable().optional(),
        stressLevel: z.number().int().min(1).max(5).nullable().optional(),
        intent: z.enum(CHECK_IN_INTENTS).nullable().optional(),
        source: z.enum(CHECK_IN_SOURCES).nullable().optional(),
      }),
      outputSchema: logCheckInOutputSchema,
      strict: true,
      execute: async (input) => {
        const result = await service.logCheckIn(input)
        return result.ok
          ? {
              ok: true,
              error: null,
              checkInId: result.data.checkInId,
              dailyPlanId: result.data.dailyPlanId,
              intent: result.data.intent,
              source: result.data.source,
              createdAt: result.data.createdAt,
            }
          : withError(result.error, {
              checkInId: null,
              dailyPlanId: null,
              intent: null,
              source: null,
              createdAt: null,
            })
      },
    }),
    completePlanItem: tool({
      description: 'Mark a daily plan item as completed, persist the completion, and award points in the HabitQuest wallet.',
      inputSchema: z.object({
        planItemId: z.string().uuid(),
        durationMinutes: z.number().int().positive().nullable().optional(),
        note: z.string().trim().min(1).nullable().optional(),
        source: z.enum(CHECK_IN_SOURCES).nullable().optional(),
      }),
      outputSchema: completePlanItemOutputSchema,
      strict: true,
      execute: async (input) => {
        const result = await service.completePlanItem(input)
        return result.ok
          ? {
              ok: true,
              error: null,
              planItemId: result.data.planItemId,
              completionId: result.data.completionId,
              walletTransactionId: result.data.walletTransactionId,
              pointsAwarded: result.data.pointsAwarded,
              availablePoints: result.data.availablePoints,
              planStatus: result.data.planStatus,
            }
          : withError(result.error, {
              planItemId: null,
              completionId: null,
              walletTransactionId: null,
              pointsAwarded: null,
              availablePoints: null,
              planStatus: null,
            })
      },
    }),
    redeemReward: tool({
      description: 'Redeem an active reward for the authenticated HabitQuest profile if enough points are available.',
      inputSchema: z.object({
        rewardId: z.string().uuid(),
        note: z.string().trim().min(1).nullable().optional(),
      }),
      outputSchema: redeemRewardOutputSchema,
      strict: true,
      execute: async (input) => {
        const result = await service.redeemReward(input)
        return result.ok
          ? {
              ok: true,
              error: null,
              rewardId: result.data.rewardId,
              rewardName: result.data.rewardName,
              walletTransactionId: result.data.walletTransactionId,
              remainingPoints: result.data.remainingPoints,
            }
          : withError(result.error, {
              rewardId: null,
              rewardName: null,
              walletTransactionId: null,
              remainingPoints: null,
            })
      },
    }),
    getTodaySummary: tool({
      description: 'Read the authenticated user’s current plan, wallet state, and latest check-in summary for today.',
      inputSchema: z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      }),
      outputSchema: getTodaySummaryOutputSchema,
      strict: true,
      execute: async (input) => {
        const result = await service.getTodaySummary(input)
        return result.ok
          ? {
              ok: true,
              error: null,
              profileId: result.data.profileId,
              planId: result.data.planId,
              planDate: result.data.planDate,
              planStatus: result.data.planStatus,
              agentSummary: result.data.agentSummary,
              availablePoints: result.data.availablePoints,
              completedPoints: result.data.completedPoints,
              redeemedPoints: result.data.redeemedPoints,
              completedItemsCount: result.data.completedItemsCount,
              pendingItemsCount: result.data.pendingItemsCount,
              items: result.data.items,
              recentCheckIn: result.data.recentCheckIn,
            }
          : withError(result.error, {
              profileId: null,
              planId: null,
              planDate: null,
              planStatus: null,
              agentSummary: null,
              availablePoints: null,
              completedPoints: null,
              redeemedPoints: null,
              completedItemsCount: null,
              pendingItemsCount: null,
              items: [],
              recentCheckIn: null,
            })
      },
    }),
    updatePreferences: tool({
      description: 'Update persisted profile preferences such as display name, timezone, and coach tone for the authenticated HabitQuest user.',
      inputSchema: z.object({
        displayName: z.string().trim().min(1).nullable().optional(),
        timezone: z.string().trim().min(1).nullable().optional(),
        coachTone: z.enum(COACH_TONES).nullable().optional(),
      }),
      outputSchema: updatePreferencesOutputSchema,
      strict: true,
      execute: async (input) => {
        const result = await service.updatePreferences(input)
        return result.ok
          ? {
              ok: true,
              error: null,
              profileId: result.data.profileId,
              displayName: result.data.displayName,
              timezone: result.data.timezone,
              coachTone: result.data.coachTone,
            }
          : withError(result.error, {
              profileId: null,
              displayName: null,
              timezone: null,
              coachTone: null,
            })
      },
    }),
  }
}
