import { createHabitQuestAgent } from '@/lib/ai/habitquest-agent'
import { createHabitQuestDomainService } from '@/lib/ai/habitquest-domain-service'
import {
  formatDailyPlanMarkdown,
  formatGenericCoachMarkdown,
  formatTodaySummaryMarkdown,
  isPlanRequest,
  isSummaryRequest,
} from '@/lib/ai/chat-fallback'
import { createAdminClient } from '@/lib/supabase/admin'

const gatewayModel = process.env.HABITQUEST_AGENT_MODEL ?? 'openai/gpt-5.4'

const SUPPORTED_BOT_ADAPTERS = ['generic', 'telegram', 'whatsapp'] as const
const THREAD_CHANNELS = ['telegram', 'whatsapp', 'slack', 'other'] as const

export type SupportedBotAdapter = (typeof SUPPORTED_BOT_ADAPTERS)[number]
export type ConversationChannel = (typeof THREAD_CHANNELS)[number]

export type NormalizedBotEvent = {
  adapter: SupportedBotAdapter
  channel: ConversationChannel
  externalThreadId: string
  externalUserId: string | null
  profileId: string | null
  message: string
  occurredAt: string
  displayName: string | null
  metadata: Record<string, unknown>
}

export type MappedProfile = {
  id: string
  display_name: string | null
  timezone: string
  coach_tone: string
}

export type ConversationThreadRecord = {
  id: string
  profileId: string
  channel: ConversationChannel
  externalThreadId: string
  externalUserId: string | null
  state: Record<string, unknown>
  lastMessageAt: string | null
}

export type ConversationThreadRepository = {
  findThreadByChannelAndExternalThreadId: (
    channel: ConversationChannel,
    externalThreadId: string,
  ) => Promise<ConversationThreadRecord | null>
  findLatestThreadByChannelAndExternalUserId: (
    channel: ConversationChannel,
    externalUserId: string,
  ) => Promise<ConversationThreadRecord | null>
  findProfileById: (profileId: string) => Promise<MappedProfile | null>
  createThread: (input: {
    profileId: string
    channel: ConversationChannel
    externalThreadId: string
    externalUserId?: string | null
    state?: Record<string, unknown>
    lastMessageAt?: string | null
  }) => Promise<ConversationThreadRecord>
  updateThreadActivity: (
    threadId: string,
    updates: {
      externalThreadId?: string
      externalUserId?: string | null
      state?: Record<string, unknown>
      lastMessageAt?: string | null
    },
  ) => Promise<ConversationThreadRecord>
}

export type ResolvedConversationContext = {
  thread: ConversationThreadRecord
  profile: MappedProfile
}

type BotAgentResult = {
  reply: string
  mode: 'agent' | 'fallback'
}

function asObject(input: unknown) {
  return typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : null
}

function asString(input: unknown) {
  return typeof input === 'string' ? input : null
}

function asNumber(input: unknown) {
  return typeof input === 'number' && Number.isFinite(input) ? input : null
}

function requireAdapter(adapter: string): SupportedBotAdapter {
  if ((SUPPORTED_BOT_ADAPTERS as readonly string[]).includes(adapter)) {
    return adapter as SupportedBotAdapter
  }

  throw new Error(`Unsupported bot adapter "${adapter}". Supported adapters: ${SUPPORTED_BOT_ADAPTERS.join(', ')}.`)
}

function resolveChannel(adapter: SupportedBotAdapter): ConversationChannel {
  if (adapter === 'telegram') return 'telegram'
  if (adapter === 'whatsapp') return 'whatsapp'
  return 'other'
}

function normalizeGenericEvent(payload: Record<string, unknown>): Omit<NormalizedBotEvent, 'adapter' | 'channel'> {
  const externalThreadId = asString(payload.externalThreadId) ?? asString(payload.threadId)
  const externalUserId = asString(payload.externalUserId) ?? asString(payload.userId)
  const profileId = asString(payload.profileId)
  const message = asString(payload.message) ?? asString(payload.text)
  const occurredAt = asString(payload.occurredAt) ?? asString(payload.timestamp) ?? new Date().toISOString()
  const displayName = asString(payload.displayName)

  if (!externalThreadId) {
    throw new Error('Bot event is missing externalThreadId.')
  }

  if (!message?.trim()) {
    throw new Error('Bot event is missing a text message.')
  }

  return {
    externalThreadId,
    externalUserId,
    profileId,
    message: message.trim(),
    occurredAt,
    displayName,
    metadata: payload,
  }
}

function normalizeTelegramEvent(payload: Record<string, unknown>): Omit<NormalizedBotEvent, 'adapter' | 'channel'> {
  const message = asObject(payload.message)

  if (!message) {
    throw new Error('Telegram update does not contain a message payload.')
  }

  const chat = asObject(message.chat)
  const from = asObject(message.from)
  const threadId = asNumber(chat?.id)
  const userId = asNumber(from?.id)
  const text = asString(message.text)
  const displayName = asString(from?.first_name) ?? asString(from?.username)
  const occurredAt = asNumber(message.date)
    ? new Date((message.date as number) * 1000).toISOString()
    : new Date().toISOString()

  if (!threadId) {
    throw new Error('Telegram update is missing chat.id.')
  }

  if (!text?.trim()) {
    throw new Error('Telegram update is missing message.text.')
  }

  return {
    externalThreadId: String(threadId),
    externalUserId: userId ? String(userId) : null,
    profileId: asString(message.profileId) ?? asString(payload.profileId),
    message: text.trim(),
    occurredAt,
    displayName,
    metadata: payload,
  }
}

function normalizeWhatsAppEvent(payload: Record<string, unknown>): Omit<NormalizedBotEvent, 'adapter' | 'channel'> {
  const entry = Array.isArray(payload.entry) ? asObject(payload.entry[0]) : null
  const change = entry && Array.isArray(entry.changes) ? asObject(entry.changes[0]) : null
  const value = asObject(change?.value)
  const incomingMessage = value && Array.isArray(value.messages) ? asObject(value.messages[0]) : asObject(payload.message)
  const text = asObject(incomingMessage?.text)
  const messageBody = asString(text?.body) ?? asString(incomingMessage?.body) ?? asString(payload.message)
  const externalUserId = asString(incomingMessage?.from) ?? asString(payload.externalUserId)
  const occurredAtRaw = asString(incomingMessage?.timestamp) ?? asString(payload.timestamp)
  const profileId = asString(payload.profileId)
  const firstContact = value && Array.isArray(value.contacts) ? asObject(value.contacts[0]) : null
  const displayName = asString(asObject(firstContact?.profile)?.name) ?? asString(payload.displayName)

  if (!externalUserId) {
    throw new Error('WhatsApp payload is missing the sender id.')
  }

  if (!messageBody?.trim()) {
    throw new Error('WhatsApp payload is missing a text message.')
  }

  const occurredAt = occurredAtRaw ? new Date(Number(occurredAtRaw) * 1000).toISOString() : new Date().toISOString()

  return {
    externalThreadId: externalUserId,
    externalUserId,
    profileId,
    message: messageBody.trim(),
    occurredAt,
    displayName,
    metadata: payload,
  }
}

export function normalizeIncomingBotEvent(adapter: string, payload: unknown): NormalizedBotEvent {
  const resolvedAdapter = requireAdapter(adapter)
  const input = asObject(payload)

  if (!input) {
    throw new Error('Bot payload must be a JSON object.')
  }

  const normalized =
    resolvedAdapter === 'telegram'
      ? normalizeTelegramEvent(input)
      : resolvedAdapter === 'whatsapp'
        ? normalizeWhatsAppEvent(input)
        : normalizeGenericEvent(input)

  return {
    adapter: resolvedAdapter,
    channel: resolveChannel(resolvedAdapter),
    ...normalized,
  }
}

function mapThreadRecord(row: Record<string, unknown>): ConversationThreadRecord {
  return {
    id: String(row.id),
    profileId: String(row.profile_id),
    channel: row.channel as ConversationChannel,
    externalThreadId: String(row.external_thread_id),
    externalUserId: asString(row.external_user_id),
    state: asObject(row.state) ?? {},
    lastMessageAt: asString(row.last_message_at),
  }
}

export function createSupabaseConversationThreadRepository(
  createClient: typeof createAdminClient = createAdminClient,
): ConversationThreadRepository {
  return {
    async findThreadByChannelAndExternalThreadId(channel, externalThreadId) {
      const client = createClient()
      const { data, error } = await client
        .from('conversation_threads')
        .select('id, profile_id, channel, external_thread_id, external_user_id, state, last_message_at')
        .eq('channel', channel)
        .eq('external_thread_id', externalThreadId)
        .maybeSingle()

      if (error) {
        throw new Error(`No pude leer el thread del adapter: ${error.message}`)
      }

      return data ? mapThreadRecord(data) : null
    },
    async findLatestThreadByChannelAndExternalUserId(channel, externalUserId) {
      const client = createClient()
      const { data, error } = await client
        .from('conversation_threads')
        .select('id, profile_id, channel, external_thread_id, external_user_id, state, last_message_at')
        .eq('channel', channel)
        .eq('external_user_id', externalUserId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        throw new Error(`No pude leer el thread por external_user_id: ${error.message}`)
      }

      return data ? mapThreadRecord(data) : null
    },
    async findProfileById(profileId) {
      const client = createClient()
      const { data, error } = await client
        .from('profiles')
        .select('id, display_name, timezone, coach_tone')
        .eq('id', profileId)
        .maybeSingle()

      if (error) {
        throw new Error(`No pude leer el profile para el adapter: ${error.message}`)
      }

      return data
    },
    async createThread(input) {
      const client = createClient()
      const { data, error } = await client
        .from('conversation_threads')
        .insert({
          profile_id: input.profileId,
          channel: input.channel,
          external_thread_id: input.externalThreadId,
          external_user_id: input.externalUserId ?? null,
          state: input.state ?? {},
          last_message_at: input.lastMessageAt ?? null,
        })
        .select('id, profile_id, channel, external_thread_id, external_user_id, state, last_message_at')
        .single()

      if (error || !data) {
        throw new Error(`No pude crear el thread del adapter: ${error?.message ?? 'sin respuesta'}`)
      }

      return mapThreadRecord(data)
    },
    async updateThreadActivity(threadId, updates) {
      const client = createClient()
      const payload: Record<string, unknown> = {}

      if (updates.externalThreadId) payload.external_thread_id = updates.externalThreadId
      if (updates.externalUserId !== undefined) payload.external_user_id = updates.externalUserId
      if (updates.state) payload.state = updates.state
      if (updates.lastMessageAt !== undefined) payload.last_message_at = updates.lastMessageAt

      const { data, error } = await client
        .from('conversation_threads')
        .update(payload)
        .eq('id', threadId)
        .select('id, profile_id, channel, external_thread_id, external_user_id, state, last_message_at')
        .single()

      if (error || !data) {
        throw new Error(`No pude actualizar el thread del adapter: ${error?.message ?? 'sin respuesta'}`)
      }

      return mapThreadRecord(data)
    },
  }
}

function buildThreadState(event: NormalizedBotEvent) {
  return {
    adapter: event.adapter,
    displayName: event.displayName,
    lastUserMessage: event.message,
  }
}

async function requireMappedProfile(repository: ConversationThreadRepository, profileId: string) {
  const profile = await repository.findProfileById(profileId)

  if (!profile) {
    throw new Error(`No existe el profile ${profileId} para asociar el adapter.`)
  }

  return profile
}

export function createConversationThreadResolver({ repository }: { repository: ConversationThreadRepository }) {
  return async function resolveConversation(event: NormalizedBotEvent): Promise<ResolvedConversationContext> {
    const existingThread = await repository.findThreadByChannelAndExternalThreadId(event.channel, event.externalThreadId)

    if (existingThread) {
      if (event.profileId && event.profileId !== existingThread.profileId) {
        throw new Error('El external_thread_id ya está asociado a otro profile.')
      }

      const profile = await requireMappedProfile(repository, existingThread.profileId)
      const thread = await repository.updateThreadActivity(existingThread.id, {
        externalUserId: event.externalUserId,
        lastMessageAt: event.occurredAt,
        state: buildThreadState(event),
      })

      return { thread, profile }
    }

    if (event.externalUserId) {
      const reusedThread = await repository.findLatestThreadByChannelAndExternalUserId(event.channel, event.externalUserId)

      if (reusedThread) {
        const profile = await requireMappedProfile(repository, reusedThread.profileId)
        const thread = await repository.updateThreadActivity(reusedThread.id, {
          externalThreadId: event.externalThreadId,
          externalUserId: event.externalUserId,
          lastMessageAt: event.occurredAt,
          state: buildThreadState(event),
        })

        return { thread, profile }
      }
    }

    if (!event.profileId) {
      throw new Error('A profile mapping is required for the first message on a new external thread.')
    }

    const profile = await requireMappedProfile(repository, event.profileId)
    const thread = await repository.createThread({
      profileId: profile.id,
      channel: event.channel,
      externalThreadId: event.externalThreadId,
      externalUserId: event.externalUserId,
      lastMessageAt: event.occurredAt,
      state: buildThreadState(event),
    })

    return { thread, profile }
  }
}

function toBoundProfile(profile: MappedProfile) {
  const now = new Date().toISOString()

  return {
    ...profile,
    user_id: profile.id,
    created_at: now,
    updated_at: now,
  }
}

async function buildFallbackReply(message: string, context: ResolvedConversationContext) {
  const service = createHabitQuestDomainService({
    createClient: async () => createAdminClient(),
    getProfileContext: async () => ({
      isConfigured: true,
      profile: toBoundProfile(context.profile),
    }),
  })

  if (isPlanRequest(message)) {
    const result = await service.generateDailyPlan({
      focus: message,
      maxItems: 3,
    })

    if (result.ok) {
      return formatDailyPlanMarkdown(result.data)
    }
  }

  if (isSummaryRequest(message)) {
    const result = await service.getTodaySummary()

    if (result.ok) {
      return formatTodaySummaryMarkdown(result.data)
    }
  }

  return formatGenericCoachMarkdown(message)
}

export async function runHabitQuestBotAgent({
  event,
  context,
}: {
  event: NormalizedBotEvent
  context: ResolvedConversationContext
}): Promise<BotAgentResult> {
  const domainService = createHabitQuestDomainService({
    createClient: async () => createAdminClient(),
    getProfileContext: async () => ({
      isConfigured: true,
      profile: toBoundProfile(context.profile),
    }),
  })

  if (!process.env.AI_GATEWAY_API_KEY) {
    return {
      reply: await buildFallbackReply(event.message, context),
      mode: 'fallback',
    }
  }

  const agent = createHabitQuestAgent({
    model: gatewayModel,
    loadProfileContext: async () => ({
      isAuthenticated: true,
      profileId: context.profile.id,
      displayName: context.profile.display_name,
      timezone: context.profile.timezone,
      coachTone: context.profile.coach_tone,
    }),
    domainService,
  })

  const result = await agent.generate({
    prompt: event.message,
  })

  return {
    reply: result.text,
    mode: 'agent',
  }
}

export function createBotEntrypoint({
  resolveConversation,
  runAgent,
}: {
  resolveConversation: (event: NormalizedBotEvent) => Promise<ResolvedConversationContext>
  runAgent: (input: { event: NormalizedBotEvent; context: ResolvedConversationContext }) => Promise<BotAgentResult>
}) {
  return async function handleBotRequest(adapter: string, payload: unknown) {
    const event = normalizeIncomingBotEvent(adapter, payload)
    const context = await resolveConversation(event)
    const agentResult = await runAgent({ event, context })

    return {
      adapter: event.adapter,
      channel: event.channel,
      normalizedEvent: event,
      thread: context.thread,
      profile: {
        id: context.profile.id,
        displayName: context.profile.display_name,
        timezone: context.profile.timezone,
        coachTone: context.profile.coach_tone,
      },
      reply: agentResult.reply,
      mode: agentResult.mode,
    }
  }
}
