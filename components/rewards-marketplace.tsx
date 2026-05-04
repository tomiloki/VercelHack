'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { ActivityCard } from './activity-card'
import { AddActivityDialog } from './add-activity-dialog'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Gift, MessageCircle, Sparkles } from 'lucide-react'

type RewardsMarketplaceProps = {
  onAskCoach?: (message: string) => void
}

export function RewardsMarketplace({ onAskCoach }: RewardsMarketplaceProps) {
  const { getAllActivities, getTodayProgress, canUseTreat } = useAppStore()

  const allActivities = getAllActivities()
  const rewards = allActivities.filter((a) => a.type === 'treat')
  const progress = getTodayProgress()
  const availablePoints = Math.max(0, progress.positivePoints - progress.treatPointsUsed)

  const sortedRewards = useMemo(() => {
    return [...rewards].sort((a, b) => {
      const aAffordable = availablePoints >= a.points
      const bAffordable = availablePoints >= b.points
      if (aAffordable && !bAffordable) return -1
      if (!aAffordable && bAffordable) return 1
      return a.points - b.points
    })
  }, [rewards, availablePoints])

  const affordableCount = sortedRewards.filter((r) => availablePoints >= r.points).length

  const handleAskCoach = (rewardName: string, rewardPoints: number) => {
    const deficit = rewardPoints - availablePoints
    onAskCoach?.(
      `I want to redeem "${rewardName}" (${rewardPoints} pts) but I only have ${availablePoints} pts. I need ${deficit} more. What positive actions could I do today to get there?`,
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-foreground">Personal rewards</h2>
          <p className="text-sm text-muted-foreground">
            {affordableCount > 0
              ? `${affordableCount} reward${affordableCount > 1 ? 's' : ''} ready to redeem · ${availablePoints} pts available`
              : `${availablePoints} pts available · keep earning to unlock rewards`}
          </p>
        </div>
        <AddActivityDialog defaultType="treat" triggerLabel="Add reward" />
      </div>

      <Card className="border-treat/25 bg-treat/10 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-treat/15 text-treat">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-medium text-foreground">Intentional rewards</h3>
            <p className="text-sm text-muted-foreground">
              Not restriction — intention. Enjoy what you choose, backed by what you built today.
            </p>
          </div>
        </div>
      </Card>

      {sortedRewards.length === 0 ? (
        <Card className="p-8 text-center">
          <Gift className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="font-medium text-foreground">No rewards yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Add your first personal reward to get started.</p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedRewards.map((reward) => {
            const canUse = availablePoints >= reward.points
            const deficit = reward.points - availablePoints
            return (
              <motion.div key={reward.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-1">
                <ActivityCard activity={reward} completedCount={0} />
                {!canUse && onAskCoach && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAskCoach(reward.name, reward.points)}
                    className="h-auto w-full justify-start gap-2 rounded-xl border border-dashed border-treat/30 py-2 text-xs font-medium text-treat/70 hover:border-treat/60 hover:bg-treat/5 hover:text-treat"
                  >
                    <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                    {deficit} pts to go — ask coach how to unlock
                  </Button>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </section>
  )
}
