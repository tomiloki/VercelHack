'use client'

import { useAppStore } from '@/lib/store'
import { Onboarding } from '@/components/onboarding'
import { Dashboard } from '@/components/dashboard'

type AppShellProps = {
  profileId: string
  displayName: string
}

export function AppShell({ profileId, displayName }: AppShellProps) {
  const { hasOnboarded } = useAppStore()

  if (!hasOnboarded) {
    return <Onboarding />
  }

  return <Dashboard profileId={profileId} displayName={displayName} />
}
