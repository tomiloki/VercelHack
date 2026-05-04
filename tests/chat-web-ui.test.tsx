import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createChatPostHandler, POST } from '../app/api/chat/route'
import {
  extractLatestUserText,
  formatDailyPlanMarkdown,
  formatGenericCoachMarkdown,
  isPlanRequest,
} from '../lib/ai/chat-fallback'

test('chat route exports a POST handler', () => {
  assert.equal(typeof POST, 'function')
})

test('chat panel uses AI Elements markdown rendering and sends messages to /api/chat', () => {
  const source = readFileSync(new URL('../components/chat-panel.tsx', import.meta.url), 'utf8')

  assert.match(source, /MessageResponse/)
  assert.match(source, /DefaultChatTransport\(\{ api: '\/api\/chat' \}\)/)
  assert.match(source, /PromptInputTextarea/)
})

test('fallback helpers detect planning prompts and format markdown replies', () => {
  assert.equal(isPlanRequest('Armame un plan simple para hoy'), true)
  assert.equal(
    extractLatestUserText([
      {
        id: '1',
        role: 'assistant',
        parts: [{ type: 'text', text: 'Hola' }],
      },
      {
        id: '2',
        role: 'user',
        parts: [{ type: 'text', text: 'Quiero un plan concreto para hoy' }],
      },
    ]),
    'Quiero un plan concreto para hoy',
  )

  const planMarkdown = formatDailyPlanMarkdown({
    planId: 'plan-1',
    planDate: '2026-05-03',
    status: 'active',
    agentSummary: 'Plan corto y concreto.',
    items: [
      {
        id: 'item-1',
        title: 'Caminar 15 minutos',
        durationMinutes: 15,
        points: 20,
        position: 1,
        status: 'pending',
        rationale: 'Sube energía sin fricción.',
      },
    ],
  })

  assert.match(planMarkdown, /## Plan de hoy/)
  assert.match(planMarkdown, /1\.\s+\*\*Caminar 15 minutos\*\*/)
  assert.match(planMarkdown, /20 pts/)
  assert.match(planMarkdown, /15 min/)
  assert.match(formatGenericCoachMarkdown('Tengo poca energía'), /## Próximo paso/)
})

function extractAssistantTextFromEventStream(body: string) {
  return body
    .split('\n')
    .filter((line) => line.startsWith('data: {'))
    .map((line) => line.slice('data: '.length))
    .map((payload) => JSON.parse(payload) as { type?: string; delta?: string })
    .filter((event) => event.type === 'text-delta')
    .map((event) => event.delta ?? '')
    .join('')
}

test('chat route streams an ordered daily plan end to end when planning data is available', async () => {
  const handler = createChatPostHandler({
    gatewayApiKey: undefined,
    createDomainService: () => ({
      completeOnboarding: async () => {
        throw new Error('not used')
      },
      generateDailyPlan: async () => ({
        ok: true,
        data: {
          planId: 'plan-1',
          planDate: '2026-05-04',
          status: 'active',
          agentSummary: 'Plan corto y concreto para hoy.',
          items: [
            {
              id: 'item-1',
              title: 'Caminar 15 minutos',
              durationMinutes: 15,
              points: 20,
              position: 1,
              status: 'pending',
              rationale: 'Sube energía sin fricción.',
            },
            {
              id: 'item-2',
              title: 'Tomar agua',
              durationMinutes: 1,
              points: 5,
              position: 2,
              status: 'pending',
              rationale: 'Te da un arranque simple.',
            },
          ],
        },
      }),
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
    }),
  })

  const response = await handler(
    new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            id: 'msg-1',
            role: 'user',
            parts: [{ type: 'text', text: 'Armame un plan simple para hoy' }],
          },
        ],
      }),
    }),
  )

  assert.match(response.headers.get('content-type') ?? '', /text\/event-stream/)

  const body = await response.text()
  const assistantText = extractAssistantTextFromEventStream(body)

  assert.match(assistantText, /## Plan de hoy/)
  assert.match(assistantText, /1\.\s+\*\*Caminar 15 minutos\*\* · 20 pts · 15 min/)
  assert.match(assistantText, /2\.\s+\*\*Tomar agua\*\* · 5 pts · 1 min/)
  assert.match(assistantText, /Sube energía sin fricción\./)
  assert.doesNotMatch(assistantText, /\b\d{1,2}:\d{2}\b/)
})
