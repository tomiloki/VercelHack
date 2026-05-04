import { ToolLoopAgent, stepCountIs, tool } from 'ai'
import { z } from 'zod'
import { createHabitQuestTools } from '@/lib/ai/habitquest-tools'
import { createHabitQuestDomainService, type HabitQuestDomainService } from '@/lib/ai/habitquest-domain-service'

export type HabitQuestProfileContext = {
  isAuthenticated: boolean
  profileId: string | null
  displayName: string | null
  timezone: string | null
  coachTone: string | null
}

export const HABITQUEST_AGENT_INSTRUCTIONS = `You are HabitQuest, a collaborative coach for daily wellbeing habits.

Your job is to help the user make practical progress with small, realistic next steps.
Sound collaborative, calm, and concrete. Prefer short plans, reflective questions, and simple action options over motivational fluff.

Rules you must follow:
- Act like a collaborative coach, not a lecturer.
- Help the user choose the next small step they can actually do today.
- Never promise medical outcomes, hormone regulation, cures, diagnoses, or treatment results.
- If the user describes symptoms, danger, or a medical condition, stay in general wellbeing language and recommend professional support when appropriate.
- Do not invent persisted data, rewards, points, or today's plan.
- When the user asks to onboard, plan the day, adapt a plan, log progress, inspect progress, redeem a reward, or update preferences, use the available domain tools.
- Base your answer on tool results, not guesses.
- When you return a daily plan, present it as an ordered list with estimated duration, points, and a short rationale for each item.
- Do not assign clock times or fixed schedules to plan items unless the user explicitly asks for that.
`

const profileContextOutputSchema = z.object({
  isAuthenticated: z.boolean(),
  profileId: z.string().nullable(),
  displayName: z.string().nullable(),
  timezone: z.string().nullable(),
  coachTone: z.string().nullable(),
})

type CreateHabitQuestAgentOptions = {
  model: ConstructorParameters<typeof ToolLoopAgent>[0]['model']
  loadProfileContext?: () => Promise<HabitQuestProfileContext>
  domainService?: Pick<
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

const defaultProfileContext: HabitQuestProfileContext = {
  isAuthenticated: false,
  profileId: null,
  displayName: null,
  timezone: null,
  coachTone: null,
}

export function createHabitQuestAgent({
  model,
  loadProfileContext = async () => defaultProfileContext,
  domainService = createHabitQuestDomainService(),
}: CreateHabitQuestAgentOptions) {
  return new ToolLoopAgent({
    model,
    instructions: HABITQUEST_AGENT_INSTRUCTIONS,
    stopWhen: stepCountIs(5),
    tools: {
      get_profile_context: tool({
        description:
          "Get the authenticated HabitQuest profile context before giving personalized coaching or referencing the user's profile.",
        inputSchema: z.object({}),
        outputSchema: profileContextOutputSchema,
        execute: async () => loadProfileContext(),
      }),
      ...createHabitQuestTools({
        service: domainService,
      }),
    },
  })
}
