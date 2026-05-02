'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppStore } from '@/lib/store'
import { ActivityType } from '@/lib/types'
import { Plus, Sparkles, Zap } from 'lucide-react'

const ICONS = ['🏃', '🧘', '💪', '🚿', '📚', '🌅', '🥗', '💧', '🎮', '🍫', '📱', '🎬', '🛍️', '☕', '🎵', '🌿', '🧠', '❤️']

export function AddActivityDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('✨')
  const [type, setType] = useState<ActivityType>('positive')
  const [points, setPoints] = useState(20)
  const [duration, setDuration] = useState<number | undefined>(undefined)
  const [category, setCategory] = useState('')
  
  const { addCustomActivity } = useAppStore()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) return

    addCustomActivity({
      id: `custom-${Date.now()}`,
      name: name.trim(),
      icon,
      type,
      points,
      duration,
      category: category || (type === 'positive' ? 'Personal' : 'Entretenimiento'),
    })

    // Reset form
    setName('')
    setIcon('✨')
    setType('positive')
    setPoints(20)
    setDuration(undefined)
    setCategory('')
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Plus className="w-4 h-4" />
          Agregar actividad
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva actividad personalizada</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type selector */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('positive')}
              className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                type === 'positive' 
                  ? 'border-positive bg-positive/10' 
                  : 'border-border hover:border-positive/50'
              }`}
            >
              <Zap className={`w-5 h-5 ${type === 'positive' ? 'text-positive' : 'text-muted-foreground'}`} />
              <div className="text-left">
                <div className="font-medium text-sm text-foreground">Positiva</div>
                <div className="text-xs text-muted-foreground">Gana puntos</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setType('treat')}
              className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                type === 'treat' 
                  ? 'border-treat bg-treat/10' 
                  : 'border-border hover:border-treat/50'
              }`}
            >
              <Sparkles className={`w-5 h-5 ${type === 'treat' ? 'text-treat' : 'text-muted-foreground'}`} />
              <div className="text-left">
                <div className="font-medium text-sm text-foreground">Gustito</div>
                <div className="text-xs text-muted-foreground">Usa puntos</div>
              </div>
            </button>
          </div>

          {/* Icon selector */}
          <div className="space-y-2">
            <Label>Ícono</Label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={`w-10 h-10 text-xl rounded-lg border-2 transition-all ${
                    icon === i 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Respiración profunda"
              required
            />
          </div>

          {/* Points */}
          <div className="space-y-2">
            <Label htmlFor="points">
              {type === 'positive' ? 'Puntos que ganas' : 'Puntos que cuesta'}
            </Label>
            <Select value={points.toString()} onValueChange={(v) => setPoints(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 pts - Muy fácil</SelectItem>
                <SelectItem value="10">10 pts - Fácil</SelectItem>
                <SelectItem value="15">15 pts - Moderado</SelectItem>
                <SelectItem value="20">20 pts - Normal</SelectItem>
                <SelectItem value="25">25 pts - Un poco difícil</SelectItem>
                <SelectItem value="30">30 pts - Difícil</SelectItem>
                <SelectItem value="40">40 pts - Muy difícil</SelectItem>
                <SelectItem value="50">50 pts - Extremo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Duration (optional) */}
          <div className="space-y-2">
            <Label htmlFor="duration">Duración (opcional)</Label>
            <Select 
              value={duration?.toString() || ''} 
              onValueChange={(v) => setDuration(v ? Number(v) : undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sin duración específica" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sin duración</SelectItem>
                <SelectItem value="5">5 minutos</SelectItem>
                <SelectItem value="10">10 minutos</SelectItem>
                <SelectItem value="15">15 minutos</SelectItem>
                <SelectItem value="20">20 minutos</SelectItem>
                <SelectItem value="30">30 minutos</SelectItem>
                <SelectItem value="45">45 minutos</SelectItem>
                <SelectItem value="60">1 hora</SelectItem>
                <SelectItem value="90">1.5 horas</SelectItem>
                <SelectItem value="120">2 horas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full">
            Crear actividad
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
