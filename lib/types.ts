export type ActivityType = 'positive' | 'treat'

export interface Activity {
  id: string
  name: string
  icon: string
  type: ActivityType
  points: number
  duration?: number
  category: string
  description?: string
}

export interface CompletedActivity {
  id: string
  activityId: string
  completedAt: Date
  duration?: number
}

export interface UserGoal {
  id: string
  name: string
  description: string
  icon: string
}

export interface DailyProgress {
  date: string
  positivePoints: number
  treatPointsUsed: number
  completedActivities: CompletedActivity[]
}

export const DEFAULT_ACTIVITIES: Activity[] = [
  { id: '1', name: 'Move your body', icon: 'move', type: 'positive', points: 30, duration: 30, category: 'Movement', description: 'Any physical activity that activates your day' },
  { id: '2', name: 'Cold shower', icon: 'shower', type: 'positive', points: 20, duration: 5, category: 'Reset', description: 'A short reset to build energy and intention' },
  { id: '3', name: 'Meditation', icon: 'mind', type: 'positive', points: 25, duration: 10, category: 'Mind', description: 'Quiet time to lower noise and recover focus' },
  { id: '4', name: 'Drink water', icon: 'water', type: 'positive', points: 5, duration: 1, category: 'Health', description: 'One glass of water' },
  { id: '5', name: 'Screen-free morning', icon: 'phone', type: 'positive', points: 35, duration: 60, category: 'Digital', description: 'First hour without scrolling' },
  { id: '6', name: 'Walk outside', icon: 'sun', type: 'positive', points: 20, duration: 15, category: 'Nature', description: 'Natural light and a short walk' },
  { id: '7', name: 'Reading', icon: 'book', type: 'positive', points: 15, duration: 20, category: 'Mind', description: 'Read something useful or enjoyable' },
  { id: '8', name: 'Sleep 8 hours', icon: 'sleep', type: 'positive', points: 40, category: 'Rest', description: 'Protect a full night of recovery' },
  { id: '9', name: 'Balanced meal', icon: 'meal', type: 'positive', points: 20, category: 'Nutrition', description: 'One simple nourishing meal' },
  { id: '10', name: 'Stretching', icon: 'stretch', type: 'positive', points: 10, duration: 10, category: 'Movement', description: 'Mobility and release' },
  { id: '11', name: 'Journaling', icon: 'write', type: 'positive', points: 15, duration: 10, category: 'Mind', description: 'Write what is on your mind' },
  { id: '12', name: 'Connect with someone', icon: 'social', type: 'positive', points: 25, duration: 30, category: 'Social', description: 'A short intentional connection' },

  { id: '101', name: 'Gaming session', icon: 'game', type: 'treat', points: 30, duration: 60, category: 'Entertainment', description: 'A conscious gaming block' },
  { id: '102', name: 'Social media', icon: 'social', type: 'treat', points: 15, duration: 30, category: 'Digital', description: 'A bounded scroll break' },
  { id: '103', name: 'Series or movie', icon: 'movie', type: 'treat', points: 25, duration: 60, category: 'Entertainment', description: 'One episode or movie block' },
  { id: '104', name: 'Sweet snack', icon: 'snack', type: 'treat', points: 20, category: 'Food', description: 'A small personal treat' },
  { id: '105', name: 'Fast food', icon: 'food', type: 'treat', points: 35, category: 'Food', description: 'A planned casual meal' },
  { id: '106', name: 'YouTube or TikTok', icon: 'video', type: 'treat', points: 20, duration: 45, category: 'Digital', description: 'Entertainment videos with a limit' },
  { id: '107', name: 'Small purchase', icon: 'shop', type: 'treat', points: 40, category: 'Shopping', description: 'Something small you wanted' },
  { id: '108', name: 'Sleep late', icon: 'moon', type: 'treat', points: 25, category: 'Rest', description: 'A planned late night' },
]

export const GOALS: UserGoal[] = [
  { id: 'energy', name: 'More energy', description: 'I want to feel more active during the day', icon: 'E' },
  { id: 'focus', name: 'Better focus', description: 'I want to concentrate on what matters', icon: 'F' },
  { id: 'sleep', name: 'Better rest', description: 'I want to improve my sleep routine', icon: 'R' },
  { id: 'stress', name: 'Less stress', description: 'I want a calmer day-to-day rhythm', icon: 'C' },
  { id: 'motivation', name: 'More momentum', description: 'I want help getting started', icon: 'S' },
  { id: 'mood', name: 'Better mood', description: 'I want more positive daily inputs', icon: 'M' },
  { id: 'habits', name: 'Build habits', description: 'I want more consistency', icon: 'H' },
  { id: 'balance', name: 'Digital balance', description: 'I want more intentional screen time', icon: 'D' },
]

export const ACTIVITY_SUGGESTIONS: Record<string, string[]> = {
  energy: ['1', '2', '4', '6', '8', '9'],
  focus: ['3', '5', '7', '11', '2', '4'],
  sleep: ['8', '3', '10', '7', '6', '1'],
  stress: ['3', '10', '7', '6', '12', '11'],
  motivation: ['1', '6', '11', '12', '3', '2'],
  mood: ['1', '6', '12', '3', '9', '7'],
  habits: ['5', '4', '8', '3', '11', '1'],
  balance: ['5', '7', '6', '3', '12', '1'],
}
