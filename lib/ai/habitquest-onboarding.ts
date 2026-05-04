import { GOALS } from '@/lib/types'

export type HabitQuestOnboardingDraft = {
  displayName: string
  goalIds: string[]
  desiredActivities: string[]
  avoidPatterns: string[]
  availableMinutes: number | null
  desiredRewards: string[]
}

export type OnboardingSnapshot = {
  goalCount: number
  activityCount: number
  rewardCount: number
}

const GOAL_KEYWORDS: Record<string, string[]> = {
  energy: ['energ', 'activa', 'activo'],
  focus: ['foco', 'focus', 'concentr'],
  sleep: ['descanso', 'dorm', 'sueño', 'sleep'],
  stress: ['estrés', 'estres', 'stress', 'calma'],
  motivation: ['motiv', 'arrancar', 'empezar', 'momentum'],
  mood: ['ánimo', 'animo', 'mood', 'humor'],
  habits: ['hábito', 'habito', 'consisten', 'rutina'],
  balance: ['pantalla', 'scroll', 'digital', 'balance'],
}

function normalizeText(input: string) {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function uniqueNonEmpty(values: string[]) {
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value, index, array) => array.findIndex((candidate) => candidate.toLowerCase() === value.toLowerCase()) === index)
}

export function createEmptyOnboardingDraft(): HabitQuestOnboardingDraft {
  return {
    displayName: '',
    goalIds: [],
    desiredActivities: [],
    avoidPatterns: [],
    availableMinutes: null,
    desiredRewards: [],
  }
}

export function resolveGoalSelection(input: string) {
  const normalized = normalizeText(input)

  return GOALS.filter((goal) => {
    const goalName = normalizeText(goal.name)
    if (normalized.includes(goalName)) return true

    return (GOAL_KEYWORDS[goal.id] ?? []).some((keyword) => normalized.includes(normalizeText(keyword)))
  }).map((goal) => goal.id)
}

export function splitNaturalLanguageList(input: string) {
  return uniqueNonEmpty(
    input
      .split(/\r?\n|,|;|·|\u2022/g)
      .flatMap((item) => item.split(/\s+y\s+/i))
      .map((item) => item.replace(/^[-*]\s*/, '').trim()),
  )
}

export function parseAvailableMinutes(input: string) {
  const normalized = normalizeText(input)
  const numericMatch = normalized.match(/(\d{1,3})/)

  if (numericMatch) {
    return Number(numericMatch[1])
  }

  if (normalized.includes('media hora')) return 30
  if (normalized.includes('una hora')) return 60
  if (normalized.includes('hora y media')) return 90
  if (normalized.includes('dos horas')) return 120
  if (normalized.includes('poco tiempo')) return 15
  if (normalized.includes('poquito')) return 15

  return null
}

export function buildOnboardingPersistenceInput(draft: HabitQuestOnboardingDraft) {
  return {
    displayName: draft.displayName.trim() || null,
    goalIds: uniqueNonEmpty(draft.goalIds),
    customActivityNames: uniqueNonEmpty(draft.desiredActivities).slice(0, 5),
    customRewardNames: uniqueNonEmpty(draft.desiredRewards).slice(0, 5),
  }
}

export function buildOnboardingSummary(draft: HabitQuestOnboardingDraft) {
  const goalNames = draft.goalIds
    .map((goalId) => GOALS.find((goal) => goal.id === goalId)?.name)
    .filter((value): value is string => Boolean(value))

  const summaryLines = [
    draft.displayName ? `- Nombre: ${draft.displayName}` : null,
    goalNames.length ? `- Objetivos: ${goalNames.join(', ')}` : null,
    draft.desiredActivities.length ? `- Actividades deseadas: ${draft.desiredActivities.join(', ')}` : null,
    draft.avoidPatterns.length ? `- Patrones a moderar: ${draft.avoidPatterns.join(', ')}` : null,
    draft.availableMinutes ? `- Tiempo disponible: ${draft.availableMinutes} minutos` : null,
    draft.desiredRewards.length ? `- Recompensas: ${draft.desiredRewards.join(', ')}` : null,
  ].filter((value): value is string => Boolean(value))

  return summaryLines.join('\n')
}

export function isOnboardingComplete(snapshot: OnboardingSnapshot) {
  return snapshot.goalCount > 0 && snapshot.activityCount > 0 && snapshot.rewardCount > 0
}
