'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { BalanceMeter } from './balance-meter'
import { ActivityCard } from './activity-card'
import { AddActivityDialog } from './add-activity-dialog'
import { useAppStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Activity } from '@/lib/types'
import {
  Bot,
  CalendarCheck,
  CheckCircle2,
  Gift,
  ListChecks,
  MessageCircle,
  RotateCcw,
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

type PlannedActivity = {
  activityId: string
  label: string
  note: string
  activity: Activity
}

const demoPlan = [
  { activityId: '6', label: 'Morning light walk', note: 'Start with movement and fresh air.' },
  { activityId: '3', label: '10 minute meditation', note: 'Lower noise before deep work.' },
  { activityId: '7', label: 'Reading block', note: 'One calm input before screens.' },
  { activityId: '10', label: 'Stretch reset', note: 'Small recovery action to close the day.' },
]

type DashboardProps = {
  profileId: string
  displayName: string
}

export function Dashboard({ profileId, displayName }: DashboardProps) {
  const router = useRouter()
  const { getTodayProgress, getAllActivities, customActivities, resetDay, setOnboarded, completeActivity } = useAppStore()
  const [activeTab, setActiveTab] = useState<'positive' | 'treats'>('positive')

  const progress = getTodayProgress()
  const allActivities = getAllActivities()
  const positiveActivities = allActivities.filter((activity) => activity.type === 'positive')
  const treatActivities = allActivities.filter((activity) => activity.type === 'treat')
  const availablePoints = Math.max(0, progress.positivePoints - progress.treatPointsUsed)
  const completedIds = new Set(progress.completedActivities.map((completed) => completed.activityId))

  const plannedActivities = demoPlan
    .map((item) => ({ ...item, activity: allActivities.find((activity) => activity.id === item.activityId) }))
    .filter((item): item is PlannedActivity => Boolean(item.activity))

  const completionRate = plannedActivities.length
    ? Math.round((plannedActivities.filter((item) => completedIds.has(item.activity.id)).length / plannedActivities.length) * 100)
    : 0

  const nextReward = useMemo(
    () => treatActivities.find((reward) => reward.points <= availablePoints) ?? treatActivities[0],
    [availablePoints, treatActivities],
  )

  const getCompletedCount = (activityId: string) => {
    return progress.completedActivities.filter((completed) => completed.activityId === activityId).length
  }

  const groupByCategory = (activities: Activity[]) => {
    return activities.reduce(
      (acc, activity) => {
        if (!acc[activity.category]) acc[activity.category] = []
        acc[activity.category].push(activity)
        return acc
      },
      {} as Record<string, Activity[]>,
    )
  }

  const positiveByCategory = groupByCategory(positiveActivities)
  const treatsByCategory = groupByCategory(treatActivities)

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setOnboarded(false)
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
                {displayName} · profile {profileId.slice(0, 8)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button className="hidden gap-2 sm:inline-flex" size="sm">
              <MessageCircle className="h-4 w-4" />
              Talk to coach
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open settings">
                  <Settings className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={resetDay}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset demo day
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setOnboarded(false)}>Back to onboarding</DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>Sign out demo user</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <Card className="relative overflow-hidden border-primary/15 bg-gradient-to-br from-primary/12 via-card to-treat/10 p-6">
            <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative max-w-3xl">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-background/70 px-3 py-1 text-xs font-medium text-primary shadow-sm">
                <Bot className="h-3.5 w-3.5" />
                Agent-first MVP
              </p>
              <h2 className="font-serif text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
                Manage today with a coach, not another rigid checklist.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                HabitQuest turns wellbeing goals into a flexible daily plan. Complete small positive actions,
                earn points, and unlock personal rewards with intention.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button className="gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Start check-in
                </Button>
                <Button variant="outline" className="gap-2 bg-background/60">
                  <CalendarCheck className="h-4 w-4" />
                  View today's plan
                </Button>
              </div>
            </div>
          </Card>

          <Card className="border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Plan progress</p>
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
                {progress.completedActivities.length} completions logged today. Next reward:{' '}
                <span className="font-medium text-foreground">{nextReward?.name ?? 'choose one'}</span>
              </p>
            </div>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <BalanceMeter />

          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-primary">Today</p>
                <h2 className="font-serif text-2xl font-semibold text-foreground">Coach plan</h2>
                <p className="text-sm text-muted-foreground">Duration-based actions. No fixed schedule.</p>
              </div>
              <Target className="h-6 w-6 text-primary" />
            </div>

            <div className="space-y-3">
              {plannedActivities.map((item, index) => {
                const done = completedIds.has(item.activity.id)
                return (
                  <button
                    key={item.activity.id}
                    onClick={() => !done && completeActivity(item.activity.id, item.activity.duration)}
                    className="flex w-full items-start gap-3 rounded-2xl border border-border bg-background/60 p-3 text-left transition hover:border-primary/40 hover:bg-primary/5"
                  >
                    <div className={done ? 'mt-0.5 text-positive' : 'mt-0.5 text-muted-foreground'}>
                      {done ? <CheckCircle2 className="h-5 w-5" /> : <span className="flex h-5 w-5 items-center justify-center rounded-full border text-xs">{index + 1}</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">{item.label}</p>
                        <span className="rounded-full bg-positive/10 px-2 py-0.5 text-xs font-medium text-positive">
                          +{item.activity.points} pts
                        </span>
                        {item.activity.duration && (
                          <span className="text-xs text-muted-foreground">{item.activity.duration} min</span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{item.note}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </Card>
        </section>

        <section>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'positive' | 'treats')}>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-serif text-2xl font-semibold text-foreground">Action marketplace</h2>
                <p className="text-sm text-muted-foreground">
                  Earn with positive actions. Redeem personal rewards when your wallet is ready.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <TabsList className="grid w-full grid-cols-2 sm:w-[280px]">
                  <TabsTrigger value="positive" className="gap-2">
                    <Zap className="h-4 w-4" />
                    Actions
                  </TabsTrigger>
                  <TabsTrigger value="treats" className="gap-2">
                    <Gift className="h-4 w-4" />
                    Rewards
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
                      <ActivityCard key={activity.id} activity={activity} completedCount={getCompletedCount(activity.id)} />
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
                      <ActivityCard key={activity.id} activity={activity} completedCount={getCompletedCount(activity.id)} />
                    ))}
                  </div>
                </motion.div>
              ))}
            </TabsContent>
          </Tabs>
        </section>

        {customActivities.length > 0 && (
          <Card className="p-5">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Custom items</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {customActivities
                .filter((activity) => activity.type === activeTab)
                .map((activity) => (
                  <ActivityCard key={activity.id} activity={activity} completedCount={getCompletedCount(activity.id)} />
                ))}
            </div>
          </Card>
        )}
      </main>
    </div>
  )
}
