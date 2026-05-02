'use client'

import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { Card } from '@/components/ui/card'
import { Flame, Gift, Sparkles, TrendingUp, Zap } from 'lucide-react'

export function BalanceMeter() {
  const { getTodayProgress, getStreak } = useAppStore()
  const progress = getTodayProgress()
  const streak = getStreak()

  const availablePoints = Math.max(0, progress.positivePoints - progress.treatPointsUsed)
  const totalEarned = progress.positivePoints
  const totalSpent = progress.treatPointsUsed
  const maxDisplay = Math.max(120, totalEarned + 40)
  const earnedPercent = Math.min(100, (totalEarned / maxDisplay) * 100)
  const spentPercent = Math.min(100, (totalSpent / maxDisplay) * 100)

  return (
    <Card className="relative overflow-hidden border-primary/15 bg-card/90 p-6 shadow-sm">
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-treat/10 blur-3xl" />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Wallet de bienestar
          </p>
          <h2 className="font-serif text-2xl font-semibold text-foreground">Tu balance de hoy</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Puntos ganados por acciones positivas y usados en recompensas conscientes.
          </p>
        </div>

        {streak > 0 && (
          <div className="flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1.5 text-accent">
            <Flame className="h-4 w-4" />
            <span className="text-sm font-semibold">{streak} dias</span>
          </div>
        )}
      </div>

      <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-positive/20 bg-positive/10 p-4">
          <div className="flex items-center gap-2 text-positive">
            <Zap className="h-5 w-5" />
            <span className="text-sm font-medium">Ganados</span>
          </div>
          <p className="mt-2 text-3xl font-bold text-foreground">{totalEarned}</p>
        </div>

        <div className="rounded-2xl border border-treat/25 bg-treat/10 p-4">
          <div className="flex items-center gap-2 text-treat">
            <Gift className="h-5 w-5" />
            <span className="text-sm font-medium">Usados</span>
          </div>
          <p className="mt-2 text-3xl font-bold text-foreground">{totalSpent}</p>
        </div>

        <div className="rounded-2xl border border-border bg-background/70 p-4">
          <div className="flex items-center gap-2 text-foreground">
            <TrendingUp className="h-5 w-5" />
            <span className="text-sm font-medium">Disponibles</span>
          </div>
          <p className="mt-2 text-3xl font-bold text-foreground">{availablePoints}</p>
        </div>
      </div>

      <div className="relative mt-6 space-y-2">
        <div className="relative h-4 overflow-hidden rounded-full bg-muted">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${earnedPercent}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="absolute inset-y-0 left-0 rounded-full bg-positive/30"
          />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${spentPercent}%` }}
            transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
            className="absolute inset-y-0 left-0 rounded-full bg-treat/50"
          />
          {availablePoints > 0 && earnedPercent > spentPercent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="absolute inset-y-0 rounded-full bg-positive"
              style={{ left: `${spentPercent}%`, width: `${earnedPercent - spentPercent}%` }}
            />
          )}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0 pts</span>
          <span>{maxDisplay} pts</span>
        </div>
      </div>

      <div className="relative mt-5 rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">
        {availablePoints >= 30
          ? 'Buen ritmo: ya tenes margen para elegir una recompensa sin culpa.'
          : totalEarned > 0
            ? 'Vas bien. Una accion corta mas puede desbloquear el proximo premio.'
            : 'Arranca con una accion pequena. El objetivo es movimiento, no perfeccion.'}
      </div>
    </Card>
  )
}
