import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createBotEntrypoint,
  createConversationThreadResolver,
  normalizeIncomingBotEvent,
  type ConversationThreadRepository,
  type NormalizedBotEvent,
} from '../lib/ai/habitquest-bot'

function createEvent(overrides: Partial<NormalizedBotEvent> = {}): NormalizedBotEvent {
  return {
    adapter: 'telegram',
    channel: 'telegram',
    externalThreadId: 'thread-1',
    externalUserId: 'user-1',
    profileId: 'profile-1',
    message: 'Hola bot',
    occurredAt: '2026-05-04T12:00:00.000Z',
    displayName: 'Tomi',
    metadata: {},
    ...overrides,
  }
}

test('normalizes a Telegram update into a shared bot event', () => {
  const normalized = normalizeIncomingBotEvent('telegram', {
    update_id: 10,
    message: {
      message_id: 99,
      date: 1_777_891_200,
      text: 'Planificame el día',
      chat: {
        id: 123456,
      },
      from: {
        id: 987654,
        first_name: 'Tomi',
        username: 'tomiloki',
      },
    },
  })

  assert.equal(normalized.channel, 'telegram')
  assert.equal(normalized.externalThreadId, '123456')
  assert.equal(normalized.externalUserId, '987654')
  assert.equal(normalized.message, 'Planificame el día')
  assert.equal(normalized.displayName, 'Tomi')
})

test('creates a new conversation thread when the adapter sends an explicit profile mapping', async () => {
  let createdThreadInput: { profileId: string } | null = null

  const repository: ConversationThreadRepository = {
    findThreadByChannelAndExternalThreadId: async () => null,
    findLatestThreadByChannelAndExternalUserId: async () => null,
    findProfileById: async (profileId) => ({
      id: profileId,
      display_name: 'Tomi',
      timezone: 'America/Santiago',
      coach_tone: 'collaborative',
    }),
    createThread: async (input) => {
      createdThreadInput = { profileId: input.profileId }

      return {
        id: 'thread-db-1',
        profileId: input.profileId,
        channel: input.channel,
        externalThreadId: input.externalThreadId,
        externalUserId: input.externalUserId ?? null,
        state: input.state ?? {},
        lastMessageAt: input.lastMessageAt ?? null,
      }
    },
    updateThreadActivity: async () => {
      throw new Error('not used')
    },
  }

  const resolveConversation = createConversationThreadResolver({ repository })
  const resolved = await resolveConversation(createEvent())

  assert.ok(createdThreadInput)
  assert.equal(createdThreadInput.profileId, 'profile-1')
  assert.equal(resolved.thread.id, 'thread-db-1')
  assert.equal(resolved.profile.id, 'profile-1')
})

test('reuses an existing thread mapping when the adapter already has a known external user', async () => {
  let touchedThreadId: string | null = null

  const repository: ConversationThreadRepository = {
    findThreadByChannelAndExternalThreadId: async () => null,
    findLatestThreadByChannelAndExternalUserId: async () => ({
      id: 'thread-db-2',
      profileId: 'profile-2',
      channel: 'telegram',
      externalThreadId: 'thread-previous',
      externalUserId: 'user-1',
      state: {},
      lastMessageAt: '2026-05-03T10:00:00.000Z',
    }),
    findProfileById: async (profileId) => ({
      id: profileId,
      display_name: 'Caro',
      timezone: 'America/Santiago',
      coach_tone: 'calm',
    }),
    createThread: async () => {
      throw new Error('not used')
    },
    updateThreadActivity: async (threadId, updates) => {
      touchedThreadId = threadId

      return {
        id: threadId,
        profileId: 'profile-2',
        channel: 'telegram',
        externalThreadId: updates.externalThreadId ?? 'thread-previous',
        externalUserId: updates.externalUserId ?? 'user-1',
        state: updates.state ?? {},
        lastMessageAt: updates.lastMessageAt ?? null,
      }
    },
  }

  const resolveConversation = createConversationThreadResolver({ repository })
  const resolved = await resolveConversation(createEvent({ profileId: null, externalThreadId: 'thread-new' }))

  assert.equal(touchedThreadId, 'thread-db-2')
  assert.equal(resolved.thread.externalThreadId, 'thread-new')
  assert.equal(resolved.profile.display_name, 'Caro')
})

test('requires either an existing thread mapping or an explicit profile id on first contact', async () => {
  const repository: ConversationThreadRepository = {
    findThreadByChannelAndExternalThreadId: async () => null,
    findLatestThreadByChannelAndExternalUserId: async () => null,
    findProfileById: async () => null,
    createThread: async () => {
      throw new Error('not used')
    },
    updateThreadActivity: async () => {
      throw new Error('not used')
    },
  }

  const resolveConversation = createConversationThreadResolver({ repository })

  await assert.rejects(
    () => resolveConversation(createEvent({ profileId: null })),
    (error: unknown) => {
      assert.equal(error instanceof Error, true)
      assert.match((error as Error).message, /profile mapping/i)
      return true
    },
  )
})

test('bot entrypoint keeps adapter parsing separate from the agent core runner', async () => {
  let receivedMessage = ''
  let receivedProfileId = ''

  const handleBotRequest = createBotEntrypoint({
    resolveConversation: async (event) => ({
      thread: {
        id: 'thread-db-3',
        profileId: 'profile-3',
        channel: event.channel,
        externalThreadId: event.externalThreadId,
        externalUserId: event.externalUserId,
        state: {},
        lastMessageAt: event.occurredAt,
      },
      profile: {
        id: 'profile-3',
        display_name: 'Luz',
        timezone: 'America/Santiago',
        coach_tone: 'direct',
      },
    }),
    runAgent: async ({ event, context }) => {
      receivedMessage = event.message
      receivedProfileId = context.profile.id

      return {
        reply: 'Dale, arranquemos con un paso corto.',
        mode: 'fallback',
      }
    },
  })

  const response = await handleBotRequest('generic', {
    message: 'Hola bot',
    externalThreadId: 'thread-3',
    externalUserId: 'user-3',
    profileId: 'profile-3',
  })

  assert.equal(receivedMessage, 'Hola bot')
  assert.equal(receivedProfileId, 'profile-3')
  assert.equal(response.reply, 'Dale, arranquemos con un paso corto.')
  assert.equal(response.thread.profileId, 'profile-3')
})
