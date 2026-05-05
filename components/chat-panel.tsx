'use client'

import { useMemo, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message'
import {
  PromptInput,
  type PromptInputMessage,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@/components/ai-elements/prompt-input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Bot, MessageCircle, Sparkles } from 'lucide-react'

const SUGGESTED_PROMPTS = [
  'Hagamos un check-in corto para arrancar el día.',
  'Armame un plan diario simple de 3 acciones.',
  'Tengo poca energía. ¿Cómo adapto el plan sin abandonarlo?',
]

type ChatPanelProps = {
  displayName: string
}

type RenderableToolPart = {
  type: string
  state?: string
}

function isRenderableToolPart(part: { type: string }): part is RenderableToolPart {
  return part.type.startsWith('tool-')
}

function formatToolLabel(partType: string) {
  return partType
    .replace(/^tool-/, '')
    .replaceAll(/[_-]/g, ' ')
    .trim()
}

export function ChatPanel({ displayName }: ChatPanelProps) {
  const [input, setInput] = useState('')
  const { messages, sendMessage, status, stop, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  })

  const isWorking = status === 'submitted' || status === 'streaming'
  const canSubmit = input.trim().length > 0 || isWorking

  const subtitle = useMemo(() => {
    if (isWorking) {
      return 'El coach está pensando una respuesta.'
    }

    return 'Hablá cuando quieras, el coach está disponible.'
  }, [isWorking])

  const handleSubmit = (message: PromptInputMessage) => {
    const text = message.text.trim()

    if (!text) {
      return
    }

    sendMessage({ text })
    setInput('')
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion)
  }

  return (
    <Card id="coach-chat" className="overflow-hidden border-primary/20 p-0">
      <div className="border-b border-border/70 bg-gradient-to-r from-primary/10 via-card to-positive/10 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-primary">
              <Bot className="h-3.5 w-3.5" />
              Coach chat
            </p>
            <h2 className="mt-3 font-serif text-2xl font-semibold text-foreground">Hablá con tu coach</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {displayName}, usá el chat para check-ins, plan diario y ajustes del día.
            </p>
          </div>

          <div className="hidden rounded-2xl bg-background/75 p-3 text-primary shadow-sm md:block">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_280px]">
        <div className="flex min-h-[520px] flex-col rounded-3xl border border-border bg-background/80 p-3">
          <div className="mb-3 flex items-center justify-between gap-3 px-2">
            <div>
              <p className="text-sm font-medium text-foreground">Coach HabitQuest</p>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
            <MessageCircle className="h-4 w-4 text-primary" />
          </div>

          <Conversation className="min-h-0 rounded-2xl border border-border/70 bg-card/70">
            <ConversationContent>
              {messages.length === 0 ? (
                <ConversationEmptyState
                  icon={<MessageCircle className="h-10 w-10" />}
                  title="Todavía no arrancó la conversación"
                  description="Mandá un mensaje y el coach te responde con formato legible, no markdown crudo."
                />
              ) : (
                messages.map((message) => (
                  <Message from={message.role} key={message.id}>
                    <MessageContent>
                      {message.parts.map((part, index) => {
                        if (part.type === 'text') {
                          return <MessageResponse key={`${message.id}-${index}`}>{part.text}</MessageResponse>
                        }

                        if (isRenderableToolPart(part)) {
                          return (
                            <div
                              key={`${message.id}-${index}`}
                              className="rounded-2xl border border-dashed border-primary/25 bg-primary/5 px-3 py-2 text-xs text-muted-foreground"
                            >
                              Tool: <span className="font-medium text-foreground">{formatToolLabel(part.type)}</span>
                              {part.state ? ` · ${part.state}` : ''}
                            </div>
                          )
                        }

                        return null
                      })}
                    </MessageContent>
                  </Message>
                ))
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          <PromptInput onSubmit={handleSubmit} className="mt-4">
            <PromptInputTextarea
              value={input}
              onChange={(event) => setInput(event.currentTarget.value)}
              placeholder="Ej: armame un plan corto para hoy"
            />
            <PromptInputFooter>
              <p className="px-2 text-xs text-muted-foreground">
                Enter envía · Shift+Enter agrega línea
              </p>
              <PromptInputSubmit
                status={status}
                onStop={stop}
                disabled={!canSubmit}
                aria-label={isWorking ? 'Frenar respuesta' : 'Enviar mensaje'}
              />
            </PromptInputFooter>
          </PromptInput>

          {error ? (
            <p className="mt-2 px-2 text-sm text-destructive">
              Hubo un error al hablar con el coach. Probá de nuevo.
            </p>
          ) : null}
        </div>

        <div className="space-y-3">
          <Card className="rounded-3xl border-border/80 p-4">
            <p className="text-sm font-medium text-foreground">Prompts sugeridos</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Atajos para probar rápido el flujo del coach.
            </p>
            <div className="mt-4 space-y-2">
              {SUGGESTED_PROMPTS.map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  className="h-auto w-full justify-start whitespace-normal rounded-2xl px-3 py-3 text-left"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </Card>

          <Card className="rounded-3xl border-border/80 p-4">
            <p className="text-sm font-medium text-foreground">¿Para qué sirve el chat?</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>• Pedile un plan para el día</li>
              <li>• Contale cómo te sentís y adaptá el plan</li>
              <li>• Marcá actividades completas y canjeá recompensas</li>
            </ul>
          </Card>
        </div>
      </div>
    </Card>
  )
}
