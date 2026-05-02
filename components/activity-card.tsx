'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Activity } from '@/lib/types'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Check, Clock, Lock, Sparkles, Zap } from 'lucide-react'

interface ActivityCardProps {
  activity: Activity
  isCompleted?: boolean
  completedCount?: number
}

export function ActivityCard({ activity, isCompleted = false, completedCount = 0 }: ActivityCardProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const { completeActivity, canUseTreat, getTodayProgress } = useAppStore()
  
  const isPositive = activity.type === 'positive'
  const canUse = isPositive || canUseTreat(activity.points)

  const handleComplete = () => {
    if (!canUse) return
    
    setIsAnimating(true)
    completeActivity(activity.id, activity.duration)
    
    setTimeout(() => setIsAnimating(false), 600)
  }

  const progress = getTodayProgress()
  const availablePoints = progress.positivePoints - progress.treatPointsUsed

  return (
    <motion.div
      whileHover={{ scale: canUse ? 1.02 : 1 }}
      whileTap={{ scale: canUse ? 0.98 : 1 }}
    >
      <Card 
        className={cn(
          "relative overflow-hidden p-4 transition-all cursor-pointer",
          isPositive 
            ? "bg-card hover:bg-positive/5 border-border hover:border-positive/30"
            : canUse 
              ? "bg-card hover:bg-treat/5 border-border hover:border-treat/30"
              : "bg-muted/50 border-border opacity-60 cursor-not-allowed",
          isAnimating && (isPositive ? "ring-2 ring-positive" : "ring-2 ring-treat")
        )}
        onClick={handleComplete}
      >
        {/* Completion animation */}
        {isAnimating && (
          <motion.div
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className={cn(
              "absolute inset-0 rounded-lg",
              isPositive ? "bg-positive/20" : "bg-treat/20"
            )}
          />
        )}

        <div className="flex items-start gap-3">
          <div className={cn(
            "flex items-center justify-center w-12 h-12 rounded-xl text-2xl",
            isPositive ? "bg-positive/10" : "bg-treat/10"
          )}>
            {activity.icon}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-foreground truncate">{activity.name}</h3>
              {completedCount > 0 && (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  <Check className="w-3 h-3" />
                  {completedCount}x
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3 mt-1">
              <span className={cn(
                "flex items-center gap-1 text-sm font-medium",
                isPositive ? "text-positive" : "text-treat"
              )}>
                {isPositive ? (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    +{activity.points}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    -{activity.points}
                  </>
                )}
              </span>
              
              {activity.duration && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {activity.duration} min
                </span>
              )}
            </div>

            {activity.description && (
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {activity.description}
              </p>
            )}
          </div>

          {!isPositive && !canUse && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Lock className="w-4 h-4" />
              <span>Necesitas {activity.points - availablePoints} pts más</span>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  )
}
