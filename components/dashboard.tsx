'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { BalanceMeter } from './balance-meter'
import { ActivityCard } from './activity-card'
import { AddActivityDialog } from './add-activity-dialog'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Activity, DEFAULT_ACTIVITIES } from '@/lib/types'
import { RotateCcw, Settings, Sparkles, Zap } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function Dashboard() {
  const { 
    getTodayProgress, 
    getAllActivities, 
    customActivities,
    removeCustomActivity,
    resetDay,
    setOnboarded
  } = useAppStore()
  
  const [activeTab, setActiveTab] = useState<'positive' | 'treats'>('positive')
  
  const progress = getTodayProgress()
  const allActivities = getAllActivities()
  
  const positiveActivities = allActivities.filter(a => a.type === 'positive')
  const treatActivities = allActivities.filter(a => a.type === 'treat')

  // Group activities by category
  const groupByCategory = (activities: Activity[]) => {
    return activities.reduce((acc, activity) => {
      const cat = activity.category
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(activity)
      return acc
    }, {} as Record<string, Activity[]>)
  }

  const getCompletedCount = (activityId: string) => {
    return progress.completedActivities.filter(c => c.activityId === activityId).length
  }

  const positiveByCategory = groupByCategory(positiveActivities)
  const treatsByCategory = groupByCategory(treatActivities)

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-serif font-semibold text-lg text-foreground">BalanceFlow</h1>
              <p className="text-xs text-muted-foreground">Tu bienestar, tu ritmo</p>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={resetDay}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reiniciar día
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setOnboarded(false)}>
                Volver a configurar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Balance meter */}
        <BalanceMeter />

        {/* Activities tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'positive' | 'treats')}>
          <div className="flex items-center justify-between gap-4 mb-4">
            <TabsList className="grid grid-cols-2 w-full max-w-xs">
              <TabsTrigger value="positive" className="gap-2">
                <Zap className="w-4 h-4" />
                Positivas
              </TabsTrigger>
              <TabsTrigger value="treats" className="gap-2">
                <Sparkles className="w-4 h-4" />
                Gustitos
              </TabsTrigger>
            </TabsList>
            
            <AddActivityDialog />
          </div>

          <TabsContent value="positive" className="space-y-6">
            {Object.entries(positiveByCategory).map(([category, activities]) => (
              <motion.div
                key={category}
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="space-y-3"
              >
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {category}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {activities.map(activity => (
                    <motion.div key={activity.id} variants={itemVariants}>
                      <ActivityCard
                        activity={activity}
                        completedCount={getCompletedCount(activity.id)}
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </TabsContent>

          <TabsContent value="treats" className="space-y-6">
            {/* Info card for treats */}
            <Card className="p-4 bg-treat/5 border-treat/20">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-treat/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-treat" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Sistema de gustitos</h3>
                  <p className="text-sm text-muted-foreground">
                    Gana puntos con actividades positivas y úsalos aquí. 
                    No es prohibir, es equilibrar. ¡Disfruta con consciencia!
                  </p>
                </div>
              </div>
            </Card>

            {Object.entries(treatsByCategory).map(([category, activities]) => (
              <motion.div
                key={category}
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="space-y-3"
              >
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {category}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {activities.map(activity => (
                    <motion.div key={activity.id} variants={itemVariants}>
                      <ActivityCard
                        activity={activity}
                        completedCount={getCompletedCount(activity.id)}
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </TabsContent>
        </Tabs>

        {/* Custom activities section */}
        {customActivities.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-border">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Tus actividades personalizadas
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {customActivities
                .filter(a => a.type === activeTab || (activeTab === 'positive' && a.type === 'positive') || (activeTab === 'treats' && a.type === 'treat'))
                .map(activity => (
                <motion.div
                  key={activity.id}
                  variants={itemVariants}
                  initial="hidden"
                  animate="show"
                >
                  <ActivityCard
                    activity={activity}
                    completedCount={getCompletedCount(activity.id)}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Today's activity log */}
        {progress.completedActivities.length > 0 && (
          <Card className="p-4">
            <h3 className="font-medium text-foreground mb-3">Actividades de hoy</h3>
            <div className="space-y-2">
              {progress.completedActivities.slice().reverse().map((completed) => {
                const activity = allActivities.find(a => a.id === completed.activityId)
                if (!activity) return null
                
                return (
                  <div 
                    key={completed.id}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span className="text-lg">{activity.icon}</span>
                    <span className="flex-1 text-foreground">{activity.name}</span>
                    <span className={activity.type === 'positive' ? 'text-positive' : 'text-treat'}>
                      {activity.type === 'positive' ? '+' : '-'}{activity.points} pts
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(completed.completedAt).toLocaleTimeString('es-CL', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                )
              })}
            </div>
          </Card>
        )}
      </main>
    </div>
  )
}
