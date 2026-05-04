'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Activity } from '@/lib/types'
import { useAppStore } from '@/lib/store'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  Check,
  Clock,
  Dumbbell,
  Gift,
  HeartPulse,
  Leaf,
  Lock,
  Moon,
  Play,
  Smartphone,
  Sparkles,
  Sun,
  Zap,
} from 'lucide-react'

interface ActivityCardProps {
  activity: Activity
  completedCount?: number
  availablePoints?: number
}

function ActivityIcon({ activity }: { activity: Activity }) {
  const className = 'h-5 w-5'

  if (activity.type === 'treat') {
    if (activity.category === 'Digital') return <Smartphone className={className} />
    if (activity.category === 'Entertainment') return <Play className={className} />
    return <Gift className={className} />
  }

  if (activity.category === 'Movement') return <Dumbbell className={className} />
  if (activity.category === 'Nature') return <Sun className={className} />
  if (activity.category === 'Rest') return <Moon className={className} />
  if (activity.category === 'Digital') return <Smartphone className={className} />
  if (activity.category === 'Health' || activity.category === 'Nutrition') return <HeartPulse className={className} />
  return <Leaf className={className} />
}

export function ActivityCard({ activity, completedCount = 0, availablePoints = 0 }: ActivityCardProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const { completeActivity } = useAppStore()

  const isPositive = activity.type === 'positive'
  const canUse = isPositive || availablePoints >= activity.points

  const handleComplete = () => {
    if (!canUse) return

    setIsAnimating(true)
    completeActivity(activity.id, activity.duration)
    setTimeout(() => setIsAnimating(false), 600)
  }

  return (
    <motion.div whileHover={{ y: canUse ? -3 : 0 }} whileTap={{ scale: canUse ? 0.98 : 1 }}>
      <Card
        className={cn(
          'group relative h-full overflow-hidden p-4 transition-all',
          canUse ? 'cursor-pointer shadow-sm hover:shadow-md' : 'cursor-not-allowed opacity-65',
          isPositive
            ? 'border-positive/20 bg-card hover:border-positive/40 hover:bg-positive/5'
            : 'border-treat/25 bg-card hover:border-treat/50 hover:bg-treat/5',
          isAnimating && (isPositive ? 'ring-2 ring-positive' : 'ring-2 ring-treat'),
        )}
        onClick={handleComplete}
      >
        {isAnimating && (
          <motion.div
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className={cn('absolute inset-0 rounded-lg', isPositive ? 'bg-positive/20' : 'bg-treat/20')}
          />
        )}

        <div className="relative flex items-start gap-3">
          <div
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
              isPositive ? 'bg-positive/10 text-positive' : 'bg-treat/10 text-treat',
            )}
          >
            <ActivityIcon activity={activity} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-medium text-foreground">{activity.name}</h3>
              {completedCount > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  <Check className="h-3 w-3" />
                  {completedCount}x
                </span>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-3">
              <span className={cn('flex items-center gap-1 text-sm font-semibold', isPositive ? 'text-positive' : 'text-treat')}>
                {isPositive ? <Zap className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                {isPositive ? '+' : '-'}{activity.points} pts
              </span>

              {activity.duration && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {activity.duration} min
                </span>
              )}
            </div>

            {activity.description && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{activity.description}</p>}
          </div>

          {!isPositive && !canUse && (
            <div className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              {activity.points - availablePoints} pts
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  )
}
