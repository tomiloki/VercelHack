import { ToolLoopAgent, stepCountIs, tool } from 'ai'
import { z } from 'zod'

export type HabitQuestProfileContext = {
  isAuthenticated: boolean
  profileId: string | null
  displayName: string | null
  timezone: string | null
  coachTone: string | null
}

export type DomainActionName =
  | 'plan_today'
  | 'adapt_today_plan'
  | 'log_completion'
  | 'check_progress'
  | 'redeem_reward'

export type DomainActionRequest = {
  action: DomainActionName
  reason: string
}

export type DomainActionResponse = DomainActionRequest & {
  status: 'requested'
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
- When the user asks to plan the day, adapt a plan, log progress, inspect progress, or redeem a reward, use the available domain tools or explicitly request them.
- If a needed tool is not available yet, say that clearly and offer the best manual next step.
`

const profileContextOutputSchema = z.object({
  isAuthenticated: z.boolean(),
  profileId: z.string().nullable(),
  displayName: z.string().nullable(),
  timezone: z.string().nullable(),
  coachTone: z.string().nullable(),
})

const domainActionInputSchema = z.object({
  action: z.enum(['plan_today', 'adapt_today_plan', 'log_completion', 'check_progress', 'redeem_reward']),
  reason: z.string().min(1),
})

const domainActionOutputSchema = z.object({
  status: z.literal('requested'),
  action: z.enum(['plan_today', 'adapt_today_plan', 'log_completion', 'check_progress', 'redeem_reward']),
  reason: z.string(),
})

type CreateHabitQuestAgentOptions = {
  model: ConstructorParameters<typeof ToolLoopAgent>[0]['model']
  loadProfileContext?: () => Promise<HabitQuestProfileContext>
  handleDomainAction?: (request: DomainActionRequest) => Promise<DomainActionResponse>
}

const defaultProfileContext: HabitQuestProfileContext = {
  isAuthenticated: false,
  profileId: null,
  displayName: null,
  timezone: null,
  coachTone: null,
}

function defaultDomainActionHandler(request: DomainActionRequest): Promise<DomainActionResponse> {
  return Promise.resolve({
    status: 'requested',
    action: request.action,
    reason: request.reason,
  })
}

export function createHabitQuestAgent({
  model,
  loadProfileContext = async () => defaultProfileContext,
  handleDomainAction = defaultDomainActionHandler,
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
      request_domain_action: tool({
        description:
          "Request a HabitQuest domain action when the user needs planning, tracking, progress lookup, or reward redemption.",
        inputSchema: domainActionInputSchema,
        outputSchema: domainActionOutputSchema,
        strict: true,
        execute: async (input) => handleDomainAction(input),
      }),
    },
  })
}
