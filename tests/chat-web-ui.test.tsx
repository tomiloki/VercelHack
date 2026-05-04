import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { POST } from '../app/api/chat/route'
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
  assert.match(planMarkdown, /\*\*Caminar 15 minutos\*\*/)
  assert.match(formatGenericCoachMarkdown('Tengo poca energía'), /## Próximo paso/)
})
