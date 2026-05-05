import test from 'node:test'
import assert from 'node:assert/strict'
import { MockLanguageModelV3, mockValues } from 'ai/test'
import { createHabitQuestAgent, HABITQUEST_AGENT_INSTRUCTIONS } from '../lib/ai/habitquest-agent'

function createUsage() {
  return {
    inputTokens: {
      total: 10,
      noCache: 10,
      cacheRead: 0,
      cacheWrite: 0,
    },
    outputTokens: {
      total: 10,
      text: 10,
      reasoning: 0,
    },
  }
}

test('agent instructions enforce collaborative coaching and responsible framing', () => {
  assert.match(HABITQUEST_AGENT_INSTRUCTIONS, /collaborative coach/i)
  assert.match(
    HABITQUEST_AGENT_INSTRUCTIONS,
    /Never promise medical outcomes, hormone regulation, cures, diagnoses, or treatment results\./i,
  )
  assert.match(HABITQUEST_AGENT_INSTRUCTIONS, /use the available domain tools/i)
  assert.match(HABITQUEST_AGENT_INSTRUCTIONS, /tired, stressed, or short on time/i)
  assert.match(HABITQUEST_AGENT_INSTRUCTIONS, /use logCheckIn to store the state and adapt today's plan/i)
  assert.match(HABITQUEST_AGENT_INSTRUCTIONS, /ordered list/i)
  assert.match(HABITQUEST_AGENT_INSTRUCTIONS, /estimated duration, points, and a short rationale/i)
  assert.match(HABITQUEST_AGENT_INSTRUCTIONS, /Do not assign clock times or fixed schedules/i)
})

test('agent can use a real planning tool through the tool loop', async () => {
  const calls: Array<{ focus: string | null | undefined; maxItems: number | undefined }> = []

  const model = new MockLanguageModelV3({
    doGenerate: mockValues(
      {
        content: [
          {
            type: 'tool-call',
            toolCallId: 'call-1',
            toolName: 'generateDailyPlan',
            input: JSON.stringify({
              focus: 'Más foco para la tarde',
              maxItems: 3,
            }),
          },
        ],
        finishReason: { unified: 'tool-calls', raw: 'tool-calls' },
        usage: createUsage(),
        warnings: [],
      },
      {
        content: [
          {
            type: 'text',
            text: 'Dale, armemos un plan simple para hoy con foco en una sola acción inicial.',
          },
        ],
        finishReason: { unified: 'stop', raw: 'stop' },
        usage: createUsage(),
        warnings: [],
      },
    ),
  })

  const agent = createHabitQuestAgent({
    model,
    domainService: {
      completeOnboarding: async () => {
        throw new Error('not used')
      },
      generateDailyPlan: async (input) => {
        calls.push({
          focus: input.focus,
          maxItems: input.maxItems,
        })

        return {
          ok: true,
          data: {
            planId: 'plan-1',
            planDate: '2026-05-03',
            status: 'active',
            agentSummary: 'Plan generado.',
            items: [],
          },
        }
      },
      logCheckIn: async () => {
        throw new Error('not used')
      },
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

  const result = await agent.generate({
    prompt: 'Planificame el día con algo simple y sostenible.',
  })

  assert.equal(model.doGenerateCalls.length, 2)
  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0], {
    focus: 'Más foco para la tarde',
    maxItems: 3,
  })
  assert.match(result.text, /plan simple/i)
})

test('agent can log a fatigue check-in and rely on the adapted plan result', async () => {
  const checkInCalls: Array<{ message: string; intent: string | null | undefined }> = []

  const model = new MockLanguageModelV3({
    doGenerate: mockValues(
      {
        content: [
          {
            type: 'tool-call',
            toolCallId: 'call-checkin',
            toolName: 'logCheckIn',
            input: JSON.stringify({
              message: 'Estoy cansado y con poco tiempo hoy.',
            }),
          },
        ],
        finishReason: { unified: 'tool-calls', raw: 'tool-calls' },
        usage: createUsage(),
        warnings: [],
      },
      {
        content: [
          {
            type: 'text',
            text: 'Dale, ya te ajusté el plan con pasos más cortos para hoy.',
          },
        ],
        finishReason: { unified: 'stop', raw: 'stop' },
        usage: createUsage(),
        warnings: [],
      },
    ),
  })

  const agent = createHabitQuestAgent({
    model,
    domainService: {
      completeOnboarding: async () => {
        throw new Error('not used')
      },
      generateDailyPlan: async () => {
        throw new Error('not used')
      },
      logCheckIn: async (input) => {
        checkInCalls.push({
          message: input.message,
          intent: input.intent,
        })

        return {
          ok: true,
          data: {
            checkInId: 'check-1',
            dailyPlanId: 'plan-1',
            intent: 'fatigue',
            source: 'web',
            createdAt: '2026-05-04T10:00:00.000Z',
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
                rationale: 'Adaptada por energía baja: Estoy cansado y con poco tiempo hoy.',
              },
            ],
          },
        }
      },
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

  const result = await agent.generate({
    prompt: 'Estoy cansado y con poco tiempo hoy.',
  })

  assert.equal(checkInCalls.length, 1)
  assert.equal(checkInCalls[0]?.message, 'Estoy cansado y con poco tiempo hoy.')
  assert.equal(checkInCalls[0]?.intent, undefined)
  assert.match(result.text, /ajusté el plan/i)
})

test('agent can complete onboarding when user describes their goals', async () => {
  const onboardingCalls: Array<{ goalIds: string[] }> = []

  const model = new MockLanguageModelV3({
    doGenerate: mockValues(
      {
        content: [
          {
            type: 'tool-call',
            toolCallId: 'call-onboard',
            toolName: 'completeOnboarding',
            input: JSON.stringify({
              goalIds: ['energy', 'focus'],
              displayName: 'Tomi',
            }),
          },
        ],
        finishReason: { unified: 'tool-calls', raw: 'tool-calls' },
        usage: createUsage(),
        warnings: [],
      },
      {
        content: [
          {
            type: 'text',
            text: 'Listo, Tomi. Configuré tu perfil con 2 objetivos y 10 actividades para arrancar.',
          },
        ],
        finishReason: { unified: 'stop', raw: 'stop' },
        usage: createUsage(),
        warnings: [],
      },
    ),
  })

  const agent = createHabitQuestAgent({
    model,
    domainService: {
      completeOnboarding: async (input) => {
        onboardingCalls.push({ goalIds: input.goalIds })
        return {
          ok: true,
          data: {
            profileId: 'profile-1',
            displayName: 'Tomi',
            timezone: 'America/Santiago',
            coachTone: 'collaborative',
            goalCount: 2,
            activityCount: 10,
            rewardCount: 5,
          },
        }
      },
      generateDailyPlan: async () => { throw new Error('not used') },
      logCheckIn: async () => { throw new Error('not used') },
      completePlanItem: async () => { throw new Error('not used') },
      redeemReward: async () => { throw new Error('not used') },
      getTodaySummary: async () => { throw new Error('not used') },
      updatePreferences: async () => { throw new Error('not used') },
    },
  })

  const result = await agent.generate({
    prompt: 'Quiero empezar. Me interesa tener más energía y concentración.',
  })

  assert.equal(onboardingCalls.length, 1)
  assert.deepEqual(onboardingCalls[0]?.goalIds, ['energy', 'focus'])
  assert.match(result.text, /configuré|actividades|objetivos/i)
})

test('agent can mark an activity as complete and report points awarded', async () => {
  const completionCalls: Array<{ planItemId: string }> = []

  const model = new MockLanguageModelV3({
    doGenerate: mockValues(
      {
        content: [
          {
            type: 'tool-call',
            toolCallId: 'call-complete',
            toolName: 'completePlanItem',
            input: JSON.stringify({
              planItemId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            }),
          },
        ],
        finishReason: { unified: 'tool-calls', raw: 'tool-calls' },
        usage: createUsage(),
        warnings: [],
      },
      {
        content: [
          {
            type: 'text',
            text: '¡Excelente! Ganaste 20 puntos por caminar. Ya tenés 35 disponibles.',
          },
        ],
        finishReason: { unified: 'stop', raw: 'stop' },
        usage: createUsage(),
        warnings: [],
      },
    ),
  })

  const agent = createHabitQuestAgent({
    model,
    domainService: {
      completeOnboarding: async () => { throw new Error('not used') },
      generateDailyPlan: async () => { throw new Error('not used') },
      logCheckIn: async () => { throw new Error('not used') },
      completePlanItem: async (input) => {
        completionCalls.push({ planItemId: input.planItemId })
        return {
          ok: true,
          data: {
            planItemId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            completionId: 'completion-1',
            walletTransactionId: 'wallet-1',
            pointsAwarded: 20,
            availablePoints: 35,
            planStatus: 'active',
          },
        }
      },
      redeemReward: async () => { throw new Error('not used') },
      getTodaySummary: async () => { throw new Error('not used') },
      updatePreferences: async () => { throw new Error('not used') },
    },
  })

  const result = await agent.generate({
    prompt: 'Completé la actividad de caminar (item-1).',
  })

  assert.equal(completionCalls.length, 1)
  assert.equal(completionCalls[0]?.planItemId, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
  assert.match(result.text, /20 puntos|35/i)
})

test('agent can redeem a reward and report remaining points', async () => {
  const redeemCalls: Array<{ rewardId: string }> = []

  const model = new MockLanguageModelV3({
    doGenerate: mockValues(
      {
        content: [
          {
            type: 'tool-call',
            toolCallId: 'call-redeem',
            toolName: 'redeemReward',
            input: JSON.stringify({
              rewardId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            }),
          },
        ],
        finishReason: { unified: 'tool-calls', raw: 'tool-calls' },
        usage: createUsage(),
        warnings: [],
      },
      {
        content: [
          {
            type: 'text',
            text: '¡Dale! Canjeaste Gaming session. Te quedan 10 puntos.',
          },
        ],
        finishReason: { unified: 'stop', raw: 'stop' },
        usage: createUsage(),
        warnings: [],
      },
    ),
  })

  const agent = createHabitQuestAgent({
    model,
    domainService: {
      completeOnboarding: async () => { throw new Error('not used') },
      generateDailyPlan: async () => { throw new Error('not used') },
      logCheckIn: async () => { throw new Error('not used') },
      completePlanItem: async () => { throw new Error('not used') },
      redeemReward: async (input) => {
        redeemCalls.push({ rewardId: input.rewardId })
        return {
          ok: true,
          data: {
            rewardId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            rewardName: 'Gaming session',
            walletTransactionId: 'wallet-2',
            remainingPoints: 10,
          },
        }
      },
      getTodaySummary: async () => { throw new Error('not used') },
      updatePreferences: async () => { throw new Error('not used') },
    },
  })

  const result = await agent.generate({
    prompt: 'Quiero canjear mi recompensa de gaming (reward-1).',
  })

  assert.equal(redeemCalls.length, 1)
  assert.equal(redeemCalls[0]?.rewardId, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
  assert.match(result.text, /gaming session|canjeaste|10 puntos/i)
})
