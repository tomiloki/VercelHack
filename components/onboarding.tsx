'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Bot, ChevronRight, Clock3, Gift, MessageCircle, Sparkles, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  buildOnboardingPersistenceInput,
  buildOnboardingSummary,
  createEmptyOnboardingDraft,
  parseAvailableMinutes,
  resolveGoalSelection,
  splitNaturalLanguageList,
  type HabitQuestOnboardingDraft,
} from '@/lib/ai/habitquest-onboarding'
import { GOALS } from '@/lib/types'

type OnboardingStep = 'displayName' | 'goals' | 'activities' | 'patterns' | 'time' | 'rewards' | 'review'

type ChatMessage = {
  role: 'assistant' | 'user'
  text: string
}

const STEP_PROMPTS: Record<Exclude<OnboardingStep, 'review'>, string> = {
  displayName:
    'Hola. Soy HabitQuest. Antes de planificar nada, decime cómo querés que te llame.',
  goals:
    'Buenísimo. Ahora contame qué querés mejorar. Podés escribirlo en tus palabras o tocar algunos objetivos sugeridos.',
  activities:
    'Dale. ¿Qué actividades positivas te gustaría hacer más seguido? Escribilas separadas por coma.',
  patterns:
    '¿Qué patrones te gustaría moderar un poco? Ejemplo: scroll infinito, dormir tarde, picoteo, etc.',
  time:
    '¿Cuánto tiempo real tenés por día para invertir en estas acciones? Decímelo simple: 15, 30, 45, 60 minutos...',
  rewards:
    'Último paso: ¿qué recompensas personales te gustaría desbloquear? Ejemplo: un episodio, gaming, un café especial.',
}

function isSkipAnswer(input: string) {
  return /^(no|ninguna|ninguno|nada|skip|paso)$/i.test(input.trim())
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="ml-auto max-w-[85%] rounded-3xl rounded-br-md bg-primary px-4 py-3 text-sm text-primary-foreground shadow-sm">
      {text}
    </div>
  )
}

function AssistantBubble({ text }: { text: string }) {
  return (
    <div className="max-w-[90%] rounded-3xl rounded-bl-md border border-border bg-card px-4 py-3 text-sm text-foreground shadow-sm">
      {text}
    </div>
  )
}

type OnboardingProps = {
  onCompleted: () => void
}

export function Onboarding({ onCompleted }: OnboardingProps) {
  const router = useRouter()
  const [draft, setDraft] = useState<HabitQuestOnboardingDraft>(createEmptyOnboardingDraft)
  const [step, setStep] = useState<OnboardingStep>('displayName')
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: STEP_PROMPTS.displayName,
    },
  ])

  const selectedGoals = draft.goalIds
  const canSubmit = input.trim().length > 0 || (step === 'goals' && selectedGoals.length > 0)

  const goalSuggestions = useMemo(
    () => GOALS.map((goal) => ({ id: goal.id, label: goal.name, description: goal.description })),
    [],
  )

  const handleGoalToggle = (goalId: string) => {
    setDraft((current) => ({
      ...current,
      goalIds: current.goalIds.includes(goalId)
        ? current.goalIds.filter((candidate) => candidate !== goalId)
        : [...current.goalIds, goalId],
    }))
  }

  const pushAssistantPrompt = (next: Exclude<OnboardingStep, 'review'>) => {
    setMessages((current) => [...current, { role: 'assistant', text: STEP_PROMPTS[next] }])
  }

  const moveToReview = (updatedDraft: HabitQuestOnboardingDraft) => {
    setStep('review')
    setMessages((current) => [
      ...current,
      {
        role: 'assistant',
        text: `Perfecto. Te resumo lo que entendí:\n${buildOnboardingSummary(updatedDraft)}\n\nSi te cierra, completo el onboarding y te abro el dashboard.`,
      },
    ])
  }

  const handleConversationStep = () => {
    const userText =
      step === 'goals' && !input.trim().length && selectedGoals.length
        ? selectedGoals
            .map((goalId) => GOALS.find((goal) => goal.id === goalId)?.name)
            .filter((value): value is string => Boolean(value))
            .join(', ')
        : input.trim()

    if (!userText) return

    setError(null)
    setMessages((current) => [...current, { role: 'user', text: userText }])
    setInput('')

    if (step === 'displayName') {
      setDraft((current) => ({ ...current, displayName: userText }))
      setStep('goals')
      pushAssistantPrompt('goals')
      return
    }

    if (step === 'goals') {
      const resolvedGoalIds = Array.from(new Set([...selectedGoals, ...resolveGoalSelection(userText)]))

      if (!resolvedGoalIds.length) {
        setMessages((current) => [
          ...current,
          {
            role: 'assistant',
            text: 'Todavía no pude mapear esos objetivos. Elegí alguno sugerido o decímelo más concreto, por ejemplo: foco, descanso, menos estrés.',
          },
        ])
        return
      }

      setDraft((current) => ({ ...current, goalIds: resolvedGoalIds }))
      setStep('activities')
      pushAssistantPrompt('activities')
      return
    }

    if (step === 'activities') {
      const desiredActivities = isSkipAnswer(userText) ? [] : splitNaturalLanguageList(userText)
      const updatedDraft = { ...draft, desiredActivities }

      setDraft(updatedDraft)
      setStep('patterns')
      pushAssistantPrompt('patterns')
      return
    }

    if (step === 'patterns') {
      const avoidPatterns = isSkipAnswer(userText) ? [] : splitNaturalLanguageList(userText)
      const updatedDraft = { ...draft, avoidPatterns }

      setDraft(updatedDraft)
      setStep('time')
      pushAssistantPrompt('time')
      return
    }

    if (step === 'time') {
      const availableMinutes = parseAvailableMinutes(userText)

      if (!availableMinutes) {
        setMessages((current) => [
          ...current,
          {
            role: 'assistant',
            text: 'Necesito un tiempo más concreto. Por ejemplo: 15, 30, 45 o 60 minutos por día.',
          },
        ])
        return
      }

      const updatedDraft = { ...draft, availableMinutes }
      setDraft(updatedDraft)
      setStep('rewards')
      pushAssistantPrompt('rewards')
      return
    }

    if (step === 'rewards') {
      const desiredRewards = isSkipAnswer(userText) ? [] : splitNaturalLanguageList(userText)
      const updatedDraft = { ...draft, desiredRewards }

      setDraft(updatedDraft)
      moveToReview(updatedDraft)
    }
  }

  const handleCompleteOnboarding = async () => {
    const payload = buildOnboardingPersistenceInput(draft)

    if (!payload.goalIds.length) {
      setError('Te falta al menos un objetivo para completar el onboarding.')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = (await response.json()) as { ok: boolean; error?: string }

      if (!response.ok || !result.ok) {
        setError(result.error ?? 'No pude guardar el onboarding.')
        return
      }

      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          text: 'Listo. Ya persistí tus objetivos, actividades iniciales y recompensas. Vamos al dashboard.',
        },
      ])

      router.refresh()
      onCompleted()
    } catch {
      setError('Hubo un problema al guardar el onboarding.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 md:px-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/12 via-card to-positive/10 p-6">
          <div className="flex h-full flex-col justify-between">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-background/75 px-3 py-1 text-xs font-medium text-primary">
                <Bot className="h-3.5 w-3.5" />
                Conversational onboarding
              </p>
              <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight text-foreground">
                El agente tiene que ser el producto.
              </h1>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                Acá no te hacemos clickear un formulario muerto. Primero hablamos, capturamos contexto útil y
                recién después persistimos objetivos, actividades y recompensas.
              </p>

              <div className="mt-6 space-y-3">
                <div className="flex items-start gap-3 rounded-2xl bg-background/70 p-4">
                  <Target className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Objetivos reales</p>
                    <p className="text-sm text-muted-foreground">Foco, descanso, estrés, energía, hábitos, balance digital.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl bg-background/70 p-4">
                  <Clock3 className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Tiempo disponible</p>
                    <p className="text-sm text-muted-foreground">Para sugerir pasos sostenibles en vez de humo aspiracional.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl bg-background/70 p-4">
                  <Gift className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Recompensas conscientes</p>
                    <p className="text-sm text-muted-foreground">Se guardan desde el onboarding para que el loop arranque completo.</p>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-6 text-sm text-muted-foreground">
              Alcance chico, pero con una base sana: conversación primero, persistencia real después.
            </p>
          </div>
        </Card>

        <Card className="border-border/80 p-4">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-border/70 pb-4">
            <div>
              <p className="text-sm font-medium text-foreground">Coach HabitQuest</p>
              <p className="text-sm text-muted-foreground">Respondé en lenguaje natural. El coach guía el setup.</p>
            </div>
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>

          <div className="space-y-3">
            {messages.map((message, index) => (
              <motion.div
                key={`${message.role}-${index}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
              >
                {message.role === 'user' ? <UserBubble text={message.text} /> : <AssistantBubble text={message.text} />}
              </motion.div>
            ))}
          </div>

          {step === 'goals' && (
            <div className="mt-4 flex flex-wrap gap-2">
              {goalSuggestions.map((goal) => {
                const selected = selectedGoals.includes(goal.id)
                return (
                  <Button
                    key={goal.id}
                    type="button"
                    variant={selected ? 'default' : 'outline'}
                    className="rounded-full"
                    onClick={() => handleGoalToggle(goal.id)}
                  >
                    {goal.label}
                  </Button>
                )
              })}
            </div>
          )}

          {step !== 'review' ? (
            <div className="mt-4 space-y-3">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.currentTarget.value)}
                placeholder={
                  step === 'displayName'
                    ? 'Ej: Tomi'
                    : step === 'goals'
                      ? 'Ej: quiero más foco y menos estrés'
                      : step === 'activities'
                        ? 'Ej: caminar 15 minutos, respirar profundo'
                        : step === 'patterns'
                          ? 'Ej: scroll infinito, acostarme tardísimo'
                          : step === 'time'
                            ? 'Ej: 30 minutos'
                            : 'Ej: un episodio, un café especial'
                }
                rows={3}
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {step === 'goals'
                    ? 'Podés escribir objetivos o combinarlos con los chips.'
                    : 'Si no aplica, escribí “no”.'}
                </p>
                <Button onClick={handleConversationStep} disabled={!canSubmit}>
                  Seguir
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <Card className="border-dashed bg-muted/50 p-4">
                <p className="text-sm font-medium text-foreground">Resumen final</p>
                <pre className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{buildOnboardingSummary(draft)}</pre>
              </Card>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Esto persiste objetivos, actividades iniciales y recompensas en Supabase.
                </p>
                <Button onClick={handleCompleteOnboarding} disabled={isSaving}>
                  {isSaving ? 'Guardando...' : 'Completar onboarding'}
                  <MessageCircle className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        </Card>
      </div>
    </div>
  )
}
