'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { GOALS, ACTIVITY_SUGGESTIONS, DEFAULT_ACTIVITIES } from '@/lib/types'
import { useAppStore } from '@/lib/store'
import { Check, ChevronRight, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Onboarding() {
  const [step, setStep] = useState(0)
  const [selectedGoals, setSelectedGoals] = useState<string[]>([])
  const { setOnboarded, setSelectedGoals: saveGoals } = useAppStore()

  const toggleGoal = (goalId: string) => {
    setSelectedGoals(prev => 
      prev.includes(goalId) 
        ? prev.filter(g => g !== goalId)
        : [...prev, goalId]
    )
  }

  const handleComplete = () => {
    saveGoals(selectedGoals)
    setOnboarded(true)
  }

  const suggestedActivities = selectedGoals
    .flatMap(g => ACTIVITY_SUGGESTIONS[g] || [])
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 6)
    .map(id => DEFAULT_ACTIVITIES.find(a => a.id === id))
    .filter(Boolean)

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 md:p-8">
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-lg text-center space-y-8"
          >
            <div className="space-y-4">
              <motion.div 
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-4"
              >
                <Sparkles className="w-10 h-10 text-primary" />
              </motion.div>
              <h1 className="text-4xl md:text-5xl font-serif font-semibold text-foreground text-balance">
                Bienvenido a BalanceFlow
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed text-pretty">
                Gestiona tu bienestar hormonal con hábitos que te hacen bien. 
                Gana puntos con actividades positivas y úsalos para darte tus gustitos.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-left">
              <Card className="p-4 bg-positive/10 border-positive/20">
                <div className="text-2xl mb-2">✨</div>
                <h3 className="font-medium text-foreground">Actividades positivas</h3>
                <p className="text-sm text-muted-foreground">Gana puntos de bienestar</p>
              </Card>
              <Card className="p-4 bg-treat/10 border-treat/20">
                <div className="text-2xl mb-2">🎮</div>
                <h3 className="font-medium text-foreground">Gustitos controlados</h3>
                <p className="text-sm text-muted-foreground">Usa tus puntos ganados</p>
              </Card>
            </div>

            <Button 
              onClick={() => setStep(1)} 
              size="lg" 
              className="w-full md:w-auto px-8"
            >
              Comenzar
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
            className="max-w-2xl w-full space-y-6"
          >
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-serif font-semibold text-foreground">
                ¿Qué quieres mejorar?
              </h2>
              <p className="text-muted-foreground">
                Selecciona los aspectos que quieres trabajar. Puedes elegir varios.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {GOALS.map((goal) => (
                <motion.button
                  key={goal.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => toggleGoal(goal.id)}
                  className={cn(
                    "relative flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all",
                    selectedGoals.includes(goal.id)
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/50"
                  )}
                >
                  <span className="text-2xl">{goal.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground">{goal.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">{goal.description}</p>
                  </div>
                  {selectedGoals.includes(goal.id) && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                    >
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(0)}>
                Atrás
              </Button>
              <Button 
                onClick={() => setStep(2)} 
                disabled={selectedGoals.length === 0}
                className="flex-1"
              >
                Continuar
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
            className="max-w-2xl w-full space-y-6"
          >
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-serif font-semibold text-foreground">
                Actividades sugeridas para ti
              </h2>
              <p className="text-muted-foreground">
                Basado en tus objetivos, estas actividades te ayudarán a mejorar
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {suggestedActivities.map((activity, index) => activity && (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border"
                >
                  <span className="text-2xl">{activity.icon}</span>
                  <div>
                    <h3 className="font-medium text-foreground">{activity.name}</h3>
                    <p className="text-sm text-positive">+{activity.points} pts</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <Card className="p-4 bg-muted/50 border-dashed">
              <p className="text-sm text-muted-foreground text-center">
                💡 Podrás personalizar y agregar más actividades después
              </p>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)}>
                Atrás
              </Button>
              <Button onClick={handleComplete} className="flex-1">
                ¡Empezar a trackear!
                <Sparkles className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
