'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, ShieldCheck, UserRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

type AuthCardProps = {
  isConfigured: boolean
}

export function AuthCard({ isConfigured }: AuthCardProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAnonymousSignIn = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInAnonymously()

      if (signInError) {
        throw signInError
      }

      router.refresh()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo iniciar la demo.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-xl border-primary/15 bg-card p-8 shadow-sm">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10 text-primary">
          <Sparkles className="h-7 w-7" />
        </div>

        <h1 className="font-serif text-4xl font-semibold text-foreground">HabitQuest</h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground">
          Tu coach personal de bienestar. Armamos un plan realista para tu día, completás acciones positivas,
          ganás puntos y desbloqueás recompensas que vos elegiste.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-background/70 p-4">
            <UserRound className="mb-2 h-5 w-5 text-primary" />
            <p className="font-medium text-foreground">Sin registro complicado</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Comenzás en segundos. Sin formularios, sin contraseña.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background/70 p-4">
            <ShieldCheck className="mb-2 h-5 w-5 text-primary" />
            <p className="font-medium text-foreground">Tu historial seguro</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tu plan, tus puntos y tus recompensas se guardan automáticamente.
            </p>
          </div>
        </div>

        {isConfigured ? (
          <div className="mt-8 space-y-3">
            <Button onClick={handleAnonymousSignIn} disabled={isLoading} size="lg" className="w-full">
              {isLoading ? 'Iniciando...' : 'Probar HabitQuest'}
            </Button>
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
            <p className="font-medium text-foreground">Servicio no disponible</p>
            <p className="mt-2 text-sm text-muted-foreground">
              HabitQuest no está disponible en este momento. Por favor intentá más tarde.
            </p>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      </Card>
    </div>
  )
}
