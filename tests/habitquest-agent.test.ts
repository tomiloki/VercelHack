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
  assert.match(HABITQUEST_AGENT_INSTRUCTIONS, /Never promise medical outcomes, hormone regulation, cures, diagnoses, or treatment results\./i)
  assert.match(HABITQUEST_AGENT_INSTRUCTIONS, /use the available domain tools/i)
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
