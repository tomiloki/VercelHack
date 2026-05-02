'use client'

import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { Card } from '@/components/ui/card'
import { Flame, Sparkles, TrendingUp, Zap } from 'lucide-react'

export function BalanceMeter() {
  const { getTodayProgress, getStreak } = useAppStore()
  const progress = getTodayProgress()
  const streak = getStreak()
  
  const availablePoints = Math.max(0, progress.positivePoints - progress.treatPointsUsed)
  const totalEarned = progress.positivePoints
  const totalSpent = progress.treatPointsUsed
  
  // Calculate bar percentages
  const maxDisplay = Math.max(100, totalEarned + 20)
  const earnedPercent = (totalEarned / maxDisplay) * 100
  const spentPercent = (totalSpent / maxDisplay) * 100

  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-medium text-foreground">Tu balance de hoy</h2>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10">
            <Flame className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">{streak} días</span>
          </div>
        )}
      </div>

      {/* Main balance display */}
      <div className="flex items-center justify-center gap-8 my-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-positive">
            <Zap className="w-5 h-5" />
            <span className="text-3xl font-bold">{totalEarned}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Ganados</p>
        </div>
        
        <div className="w-px h-12 bg-border" />
        
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-treat">
            <Sparkles className="w-5 h-5" />
            <span className="text-3xl font-bold">{totalSpent}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Usados</p>
        </div>
        
        <div className="w-px h-12 bg-border" />
        
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-foreground">
            <TrendingUp className="w-5 h-5" />
            <span className="text-3xl font-bold">{availablePoints}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Disponibles</p>
        </div>
      </div>

      {/* Visual balance bar */}
      <div className="space-y-2">
        <div className="relative h-4 bg-muted rounded-full overflow-hidden">
          {/* Earned bar */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${earnedPercent}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute inset-y-0 left-0 bg-positive/30 rounded-full"
          />
          
          {/* Spent overlay */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${spentPercent}%` }}
            transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
            className="absolute inset-y-0 left-0 bg-treat/50 rounded-full"
          />
          
          {/* Available indicator */}
          {availablePoints > 0 && earnedPercent > spentPercent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="absolute inset-y-0 bg-positive rounded-full"
              style={{ 
                left: `${spentPercent}%`, 
                width: `${earnedPercent - spentPercent}%` 
              }}
            />
          )}
        </div>
        
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0</span>
          <span>{maxDisplay} pts</span>
        </div>
      </div>

      {/* Motivational message */}
      <div className="mt-4 p-3 rounded-lg bg-muted/50 text-center">
        {availablePoints === 0 && totalEarned === 0 ? (
          <p className="text-sm text-muted-foreground">
            ¡Empieza tu día con una actividad positiva! 🌟
          </p>
        ) : availablePoints >= 30 ? (
          <p className="text-sm text-foreground">
            ¡Excelente! Tienes suficientes puntos para darte un gustito 🎉
          </p>
        ) : availablePoints > 0 ? (
          <p className="text-sm text-muted-foreground">
            Sigue así, un poco más y podrás darte un gustito 💪
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Has usado todos tus puntos. ¡Gana más con actividades positivas! 🌱
          </p>
        )}
      </div>
    </Card>
  )
}
