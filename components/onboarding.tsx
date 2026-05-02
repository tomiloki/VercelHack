'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { GOALS, ACTIVITY_SUGGESTIONS, DEFAULT_ACTIVITIES } from '@/lib/types'
import { useAppStore } from '@/lib/store'
import { Check, ChevronRight, Sparkles, Target, Gift, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Onboarding() {
  const [step, setStep] = useState(0)
  const [selectedGoals, setSelectedGoals] = useState<string[]>([])
  const { setOnboarded, setSelectedGoals: saveGoals } = useAppStore()

  const toggleGoal = (goalId: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goalId) ? prev.filter((goal) => goal !== goalId) : [...prev, goalId],
    )
  }

  const handleComplete = () => {
    saveGoals(selectedGoals)
    setOnboarded(true)
  }

  const suggestedActivities = selectedGoals
    .flatMap((goal) => ACTIVITY_SUGGESTIONS[goal] || [])
    .filter((value, index, array) => array.indexOf(value) === index)
    .slice(0, 6)
    .map((id) => DEFAULT_ACTIVITIES.find((activity) => activity.id === id))
    .filter(Boolean)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 md:p-8">
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-xl space-y-8 text-center"
          >
            <div className="space-y-4">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10"
              >
                <Sparkles className="h-10 w-10 text-primary" />
              </motion.div>
              <h1 className="text-balance font-serif text-4xl font-semibold text-foreground md:text-5xl">
                Welcome to HabitQuest
              </h1>
              <p className="text-pretty text-lg leading-relaxed text-muted-foreground">
                A conversational wellbeing coach that helps you plan the day, complete positive actions,
                and unlock conscious personal rewards.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-left">
              <Card className="border-positive/20 bg-positive/10 p-4">
                <Target className="mb-3 h-6 w-6 text-positive" />
                <h3 className="font-medium text-foreground">Positive actions</h3>
                <p className="text-sm text-muted-foreground">Earn points with small useful steps.</p>
              </Card>
              <Card className="border-treat/20 bg-treat/10 p-4">
                <Gift className="mb-3 h-6 w-6 text-treat" />
                <h3 className="font-medium text-foreground">Personal rewards</h3>
                <p className="text-sm text-muted-foreground">Use earned points without guilt.</p>
              </Card>
            </div>

            <Button onClick={() => setStep(1)} size="lg" className="w-full px-8 md:w-auto">
              Start setup
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="goals"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-2xl space-y-6"
          >
            <div className="space-y-2 text-center">
              <h2 className="font-serif text-3xl font-semibold text-foreground">What do you want to improve?</h2>
              <p className="text-muted-foreground">Pick a few areas. The coach uses them to suggest your first plan.</p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {GOALS.map((goal) => (
                <motion.button
                  key={goal.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => toggleGoal(goal.id)}
                  className={cn(
                    'relative flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-all',
                    selectedGoals.includes(goal.id) ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50',
                  )}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                    {goal.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-foreground">{goal.name}</h3>
                    <p className="truncate text-sm text-muted-foreground">{goal.description}</p>
                  </div>
                  {selectedGoals.includes(goal.id) && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary"
                    >
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button onClick={() => setStep(2)} disabled={selectedGoals.length === 0} className="flex-1">
                Continue
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="suggestions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-2xl space-y-6"
          >
            <div className="space-y-2 text-center">
              <h2 className="font-serif text-3xl font-semibold text-foreground">Your starter actions</h2>
              <p className="text-muted-foreground">These are demo suggestions. The agent will adapt them during the day.</p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {suggestedActivities.map(
                (activity, index) =>
                  activity && (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-positive/10 text-positive">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{activity.name}</h3>
                        <p className="text-sm text-positive">+{activity.points} pts</p>
                      </div>
                    </motion.div>
                  ),
              )}
            </div>

            <Card className="border-dashed bg-muted/50 p-4">
              <p className="text-center text-sm text-muted-foreground">
                The dashboard is only the companion view. The real loop starts when you talk to the coach.
              </p>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={handleComplete} className="flex-1">
                Open dashboard
                <MessageCircle className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
