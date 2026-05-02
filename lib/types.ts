export type ActivityType = 'positive' | 'treat'

export interface Activity {
  id: string
  name: string
  icon: string
  type: ActivityType
  points: number // positive = + points, treats = - points cost
  duration?: number // in minutes
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
  // Positive activities
  { id: '1', name: 'Ejercicio', icon: '💪', type: 'positive', points: 30, duration: 30, category: 'Movimiento', description: 'Cualquier tipo de ejercicio físico' },
  { id: '2', name: 'Ducha fría', icon: '🚿', type: 'positive', points: 20, duration: 5, category: 'Bienestar', description: 'Activa tu sistema nervioso' },
  { id: '3', name: 'Meditar', icon: '🧘', type: 'positive', points: 25, duration: 10, category: 'Mente', description: 'Calma tu mente' },
  { id: '4', name: 'Tomar agua', icon: '💧', type: 'positive', points: 5, duration: 1, category: 'Salud', description: '1 vaso de agua' },
  { id: '5', name: 'Sin celular mañana', icon: '📵', type: 'positive', points: 35, duration: 60, category: 'Digital', description: 'Primera hora sin pantallas' },
  { id: '6', name: 'Caminar al sol', icon: '☀️', type: 'positive', points: 20, duration: 15, category: 'Naturaleza', description: 'Luz natural en la mañana' },
  { id: '7', name: 'Lectura', icon: '📚', type: 'positive', points: 15, duration: 20, category: 'Mente', description: 'Leer algo que te guste' },
  { id: '8', name: 'Dormir 8 horas', icon: '😴', type: 'positive', points: 40, category: 'Descanso', description: 'Descanso completo' },
  { id: '9', name: 'Comida saludable', icon: '🥗', type: 'positive', points: 20, category: 'Nutrición', description: 'Una comida balanceada' },
  { id: '10', name: 'Estiramientos', icon: '🙆', type: 'positive', points: 10, duration: 10, category: 'Movimiento', description: 'Flexibilidad y relajación' },
  { id: '11', name: 'Journaling', icon: '✍️', type: 'positive', points: 15, duration: 10, category: 'Mente', description: 'Escribe tus pensamientos' },
  { id: '12', name: 'Socializar', icon: '👋', type: 'positive', points: 25, duration: 30, category: 'Social', description: 'Conexión con otros' },

  // Treats (cost points to use)
  { id: '101', name: 'Videojuegos', icon: '🎮', type: 'treat', points: 30, duration: 60, category: 'Entretenimiento', description: 'Gaming controlado' },
  { id: '102', name: 'Redes sociales', icon: '📱', type: 'treat', points: 15, duration: 30, category: 'Digital', description: 'Scroll consciente' },
  { id: '103', name: 'Series/Películas', icon: '🎬', type: 'treat', points: 25, duration: 60, category: 'Entretenimiento', description: 'Un episodio o película' },
  { id: '104', name: 'Snack dulce', icon: '🍫', type: 'treat', points: 20, category: 'Comida', description: 'Un gustito dulce' },
  { id: '105', name: 'Comida rápida', icon: '🍔', type: 'treat', points: 35, category: 'Comida', description: 'Fast food ocasional' },
  { id: '106', name: 'YouTube/TikTok', icon: '📺', type: 'treat', points: 20, duration: 45, category: 'Digital', description: 'Videos de entretenimiento' },
  { id: '107', name: 'Compra capricho', icon: '🛍️', type: 'treat', points: 40, category: 'Compras', description: 'Algo que querías' },
  { id: '108', name: 'Dormir tarde', icon: '🌙', type: 'treat', points: 25, category: 'Descanso', description: 'Una noche de trasnochar' },
]

export const GOALS: UserGoal[] = [
  { id: 'energy', name: 'Más energía', description: 'Quiero sentirme con más vitalidad durante el día', icon: '⚡' },
  { id: 'focus', name: 'Mejor concentración', description: 'Necesito enfocarme más en mis tareas', icon: '🎯' },
  { id: 'sleep', name: 'Dormir mejor', description: 'Quiero mejorar la calidad de mi sueño', icon: '😴' },
  { id: 'stress', name: 'Reducir estrés', description: 'Me siento muy estresado/a últimamente', icon: '🧘' },
  { id: 'motivation', name: 'Más motivación', description: 'Me cuesta arrancar con mis proyectos', icon: '🚀' },
  { id: 'mood', name: 'Mejor ánimo', description: 'Quiero sentirme más positivo/a', icon: '😊' },
  { id: 'habits', name: 'Crear hábitos', description: 'Quiero ser más consistente con mis rutinas', icon: '📅' },
  { id: 'balance', name: 'Equilibrio digital', description: 'Paso mucho tiempo en pantallas', icon: '📵' },
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
