'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Activity, CompletedActivity, DailyProgress, DEFAULT_ACTIVITIES, UserGoal } from './types'

interface AppState {
  // User state
  hasOnboarded: boolean
  selectedGoals: string[]
  customActivities: Activity[]
  
  // Daily tracking
  dailyProgress: Record<string, DailyProgress>
  
  // Actions
  setOnboarded: (value: boolean) => void
  setSelectedGoals: (goals: string[]) => void
  addCustomActivity: (activity: Activity) => void
  removeCustomActivity: (id: string) => void
  
  completeActivity: (activityId: string, duration?: number) => void
  getTodayProgress: () => DailyProgress
  getAllActivities: () => Activity[]
  canUseTreat: (treatPoints: number) => boolean
  getStreak: () => number
  resetDay: () => void
}

const getTodayKey = () => new Date().toISOString().split('T')[0]

const createEmptyDayProgress = (): DailyProgress => ({
  date: getTodayKey(),
  positivePoints: 0,
  treatPointsUsed: 0,
  completedActivities: [],
})

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      hasOnboarded: false,
      selectedGoals: [],
      customActivities: [],
      dailyProgress: {},

      setOnboarded: (value) => set({ hasOnboarded: value }),
      
      setSelectedGoals: (goals) => set({ selectedGoals: goals }),
      
      addCustomActivity: (activity) => set((state) => ({
        customActivities: [...state.customActivities, activity]
      })),
      
      removeCustomActivity: (id) => set((state) => ({
        customActivities: state.customActivities.filter((a) => a.id !== id)
      })),

      completeActivity: (activityId, duration) => {
        const today = getTodayKey()
        const allActivities = get().getAllActivities()
        const activity = allActivities.find((a) => a.id === activityId)
        
        if (!activity) return

        set((state) => {
          const currentProgress = state.dailyProgress[today] || createEmptyDayProgress()
          
          const newCompleted: CompletedActivity = {
            id: crypto.randomUUID(),
            activityId,
            completedAt: new Date(),
            duration,
          }

          const updatedProgress: DailyProgress = {
            ...currentProgress,
            completedActivities: [...currentProgress.completedActivities, newCompleted],
            positivePoints: activity.type === 'positive' 
              ? currentProgress.positivePoints + activity.points 
              : currentProgress.positivePoints,
            treatPointsUsed: activity.type === 'treat'
              ? currentProgress.treatPointsUsed + activity.points
              : currentProgress.treatPointsUsed,
          }

          return {
            dailyProgress: {
              ...state.dailyProgress,
              [today]: updatedProgress,
            }
          }
        })
      },

      getTodayProgress: () => {
        const today = getTodayKey()
        return get().dailyProgress[today] || createEmptyDayProgress()
      },

      getAllActivities: () => {
        return [...DEFAULT_ACTIVITIES, ...get().customActivities]
      },

      canUseTreat: (treatPoints) => {
        const progress = get().getTodayProgress()
        const availablePoints = progress.positivePoints - progress.treatPointsUsed
        return availablePoints >= treatPoints
      },

      getStreak: () => {
        const progress = get().dailyProgress
        const dates = Object.keys(progress).sort().reverse()
        
        let streak = 0
        const today = new Date()
        
        for (let i = 0; i < dates.length; i++) {
          const checkDate = new Date(today)
          checkDate.setDate(today.getDate() - i)
          const dateKey = checkDate.toISOString().split('T')[0]
          
          if (progress[dateKey] && progress[dateKey].positivePoints > 0) {
            streak++
          } else if (i > 0) {
            break
          }
        }
        
        return streak
      },

      resetDay: () => {
        const today = getTodayKey()
        set((state) => ({
          dailyProgress: {
            ...state.dailyProgress,
            [today]: createEmptyDayProgress(),
          }
        }))
      },
    }),
    {
      name: 'habitquest-storage',
    }
  )
)
