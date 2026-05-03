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
  assert.match(HABITQUEST_AGENT_INSTRUCTIONS, /use the available domain tools or explicitly request them/i)
})

test('agent can request a domain action through the tool loop', async () => {
  const handledRequests: Array<{ action: string; reason: string }> = []

  const model = new MockLanguageModelV3({
    doGenerate: mockValues(
      {
        content: [
          {
            type: 'tool-call',
            toolCallId: 'call-1',
            toolName: 'request_domain_action',
            input: JSON.stringify({
              action: 'plan_today',
              reason: 'The user asked for help planning today.',
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
    handleDomainAction: async (request) => {
      handledRequests.push(request)

      return {
        status: 'requested',
        action: request.action,
        reason: request.reason,
      }
    },
  })

  const result = await agent.generate({
    prompt: 'Planificame el día con algo simple y sostenible.',
  })

  assert.equal(model.doGenerateCalls.length, 2)
  assert.equal(handledRequests.length, 1)
  assert.deepEqual(handledRequests[0], {
    action: 'plan_today',
    reason: 'The user asked for help planning today.',
  })
  assert.match(result.text, /plan simple/i)
})
