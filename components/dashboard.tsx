'use client'

import { useState, useTransition } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { BalanceMeter } from './balance-meter'
import { ActivityCard } from './activity-card'
import { AddActivityDialog } from './add-activity-dialog'
import { ChatPanel } from './chat-panel'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Activity } from '@/lib/types'
import type { TodaySummaryData } from '@/lib/ai/habitquest-domain-service'
import type { UserActivityItem } from '@/app/api/activities/route'
import {
  Bot,
  CalendarCheck,
  CheckCircle2,
  Gift,
  ListChecks,
  Lock,
  MessageCircle,
  Settings,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

function toActivityShape(item: UserActivityItem): Activity {
  return {
    id: item.id,
    name: item.name,
    icon: item.category.toLowerCase(),
    type: item.type,
    points: item.points,
    duration: item.durationMinutes ?? undefined,
    category: item.category,
    description: item.description ?? undefined,
  }
}

type DashboardProps = {
  profileId: string
  displayName: string
  initialSummary: TodaySummaryData | null
  initialActivities: UserActivityItem[]
}

export function Dashboard({ profileId, displayName, initialSummary, initialActivities }: DashboardProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'positive' | 'treats'>('positive')
  const [isPending, startTransition] = useTransition()

  const scrollToCoachChat = () => {
    document.getElementById('coach-chat')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  const planItems = (initialSummary?.items ?? []).filter((item) => item.status !== 'replaced')
  const completedItemsCount = initialSummary?.completedItemsCount ?? 0
  const pendingItemsCount = initialSummary?.pendingItemsCount ?? 0
  const totalPlanItems = completedItemsCount + pendingItemsCount
  const completionRate = totalPlanItems > 0 ? Math.round((completedItemsCount / totalPlanItems) * 100) : 0

  const availablePoints = initialSummary?.availablePoints ?? 0
  const completedPoints = initialSummary?.completedPoints ?? 0
  const redeemedPoints = initialSummary?.redeemedPoints ?? 0

  const allActivities = initialActivities.map(toActivityShape)
  const positiveActivities = allActivities.filter((a) => a.type === 'positive')
  const treatActivities = allActivities.filter((a) => a.type === 'treat')

  const sortedRewards = [...treatActivities].sort((a, b) => {
    const aAffordable = availablePoints >= a.points
    const bAffordable = availablePoints >= b.points
    if (aAffordable && !bAffordable) return -1
    if (!aAffordable && bAffordable) return 1
    return a.points - b.points
  })

  const nextReward = treatActivities.find((r) => r.points <= availablePoints) ?? treatActivities[0]
  const affordableRewards = sortedRewards.filter((r) => availablePoints >= r.points)

  const groupByCategory = (activities: Activity[]) =>
    activities.reduce(
      (acc, activity) => {
        if (!acc[activity.category]) acc[activity.category] = []
        acc[activity.category].push(activity)
        return acc
      },
      {} as Record<string, Activity[]>,
    )

  const positiveByCategory = groupByCategory(positiveActivities)
  const treatsByCategory = groupByCategory(treatActivities)

  const handleCompletePlanItem = (planItemId: string) => {
    startTransition(async () => {
      await fetch('/api/today/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planItemId }),
      })
      router.refresh()
    })
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-serif text-xl font-semibold leading-none text-foreground">HabitQuest</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                {displayName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button className="hidden gap-2 sm:inline-flex" size="sm" onClick={scrollToCoachChat}>
              <MessageCircle className="h-4 w-4" />
              Hablar con el coach
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open settings">
                  <Settings className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>Cerrar sesión</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        {/* Hero + plan progress */}
        <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <Card className="relative overflow-hidden border-primary/15 bg-gradient-to-br from-primary/12 via-card to-treat/10 p-6">
            <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative max-w-3xl">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-background/70 px-3 py-1 text-xs font-medium text-primary shadow-sm">
                <Bot className="h-3.5 w-3.5" />
                Tu coach personal
              </p>
              <h2 className="font-serif text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
                Manejá el día con un coach, no con otra lista rígida.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                HabitQuest convierte tus objetivos de bienestar en un plan diario flexible. Completá acciones
                positivas, ganás puntos y desbloqueás tus recompensas favoritas.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button className="gap-2" onClick={scrollToCoachChat}>
                  <MessageCircle className="h-4 w-4" />
                  Hacer check-in
                </Button>
                <Button variant="outline" className="gap-2 bg-background/60">
                  <CalendarCheck className="h-4 w-4" />
                  Ver el plan de hoy
                </Button>
              </div>
            </div>
          </Card>

          <Card className="border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Progreso del plan</p>
                <p className="mt-1 text-3xl font-bold text-foreground">{completionRate}%</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-positive/10 text-positive">
                <ListChecks className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${completionRate}%` }}
                  className="h-full rounded-full bg-positive"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {completedItemsCount} acciones completadas hoy. Próxima recompensa:{' '}
                <span className="font-medium text-foreground">{nextReward?.name ?? 'elegí una'}</span>
              </p>
            </div>
          </Card>
        </section>

        {/* Wallet + today's plan */}
        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <BalanceMeter
            availablePoints={availablePoints}
            completedPoints={completedPoints}
            redeemedPoints={redeemedPoints}
          />

          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-primary">Hoy</p>
                <h2 className="font-serif text-2xl font-semibold text-foreground">Plan del coach</h2>
                <p className="text-sm text-muted-foreground">
                  {initialSummary?.agentSummary ?? 'Acciones por duración. Sin horarios fijos.'}
                </p>
              </div>
              <Target className="h-6 w-6 text-primary" />
            </div>

            {planItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                <p className="text-sm text-muted-foreground">Todavía no hay plan para hoy.</p>
                <Button size="sm" variant="outline" onClick={scrollToCoachChat}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Pedile al coach que planifique tu día
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {planItems.map((item, index) => {
                  const done = item.status === 'completed'
                  return (
                    <button
                      key={item.id}
                      disabled={done || isPending}
                      onClick={() => !done && handleCompletePlanItem(item.id)}
                      className="flex w-full items-start gap-3 rounded-2xl border border-border bg-background/60 p-3 text-left transition hover:border-primary/40 hover:bg-primary/5 disabled:cursor-default disabled:opacity-70"
                    >
                      <div className={done ? 'mt-0.5 text-positive' : 'mt-0.5 text-muted-foreground'}>
                        {done ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full border text-xs">{index + 1}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-foreground">{item.title}</p>
                          <span className="rounded-full bg-positive/10 px-2 py-0.5 text-xs font-medium text-positive">
                            +{item.points} pts
                          </span>
                          {item.durationMinutes && (
                            <span className="text-xs text-muted-foreground">{item.durationMinutes} min</span>
                          )}
                        </div>
                        {item.rationale && <p className="mt-1 text-sm text-muted-foreground">{item.rationale}</p>}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </Card>
        </section>

        {/* Latest check-in */}
        {initialSummary?.recentCheckIn && (
          <section>
            <Card className="border-primary/15 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <MessageCircle className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-primary">Último check-in · {initialSummary.recentCheckIn.intent}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{initialSummary.recentCheckIn.message}</p>
                </div>
              </div>
            </Card>
          </section>
        )}

        {/* Rewards snapshot — availability based on wallet */}
        {sortedRewards.length > 0 && (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl font-semibold text-foreground">Tus recompensas</h2>
                <p className="text-sm text-muted-foreground">
                  {affordableRewards.length > 0
                    ? `${affordableRewards.length} recompensa${affordableRewards.length > 1 ? 's' : ''} lista${affordableRewards.length > 1 ? 's' : ''} para canjear · ${availablePoints} pts disponibles`
                    : `${availablePoints} pts disponibles · seguí sumando para desbloquear recompensas`}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-treat/10 text-treat">
                <Gift className="h-5 w-5" />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sortedRewards.map((reward) => {
                const canAfford = availablePoints >= reward.points
                const deficit = reward.points - availablePoints
                return (
                  <motion.div
                    key={reward.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-1"
                  >
                    <ActivityCard activity={reward} availablePoints={availablePoints} />
                    {!canAfford && (
                      <div className="flex items-center gap-1.5 rounded-xl border border-dashed border-treat/30 px-3 py-2 text-xs font-medium text-treat/70">
                        <Lock className="h-3.5 w-3.5 shrink-0" />
                        Faltan {deficit} pts — preguntale al coach cómo ganarlos
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </section>
        )}

        {/* Coach chat */}
        <section>
          <ChatPanel displayName={displayName} />
        </section>

        {/* Full marketplace */}
        <section>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'positive' | 'treats')}>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-serif text-2xl font-semibold text-foreground">Catálogo de acciones</h2>
                <p className="text-sm text-muted-foreground">
                  Sumá puntos con acciones positivas. Canjeá recompensas cuando estés listo.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <TabsList className="grid w-full grid-cols-2 sm:w-[280px]">
                  <TabsTrigger value="positive" className="gap-2">
                    <Zap className="h-4 w-4" />
                    Acciones
                  </TabsTrigger>
                  <TabsTrigger value="treats" className="gap-2">
                    <Gift className="h-4 w-4" />
                    Recompensas
                  </TabsTrigger>
                </TabsList>
                <AddActivityDialog />
              </div>
            </div>

            <TabsContent value="positive" className="space-y-6">
              {Object.entries(positiveByCategory).map(([category, activities]) => (
                <motion.div key={category} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{category}</h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {activities.map((activity) => (
                      <ActivityCard key={activity.id} activity={activity} availablePoints={availablePoints} />
                    ))}
                  </div>
                </motion.div>
              ))}
            </TabsContent>

            <TabsContent value="treats" className="space-y-6">
              <Card className="border-treat/25 bg-treat/10 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-treat/15 text-treat">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">Personal rewards</h3>
                    <p className="text-sm text-muted-foreground">
                      Not restriction. Intention. Use points you earned to enjoy a reward consciously.
                    </p>
                  </div>
                </div>
              </Card>

              {Object.entries(treatsByCategory).map(([category, activities]) => (
                <motion.div key={category} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{category}</h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {activities.map((activity) => (
                      <ActivityCard key={activity.id} activity={activity} availablePoints={availablePoints} />
                    ))}
                  </div>
                </motion.div>
              ))}
            </TabsContent>
          </Tabs>
        </section>
      </main>
    </div>
  )
}
