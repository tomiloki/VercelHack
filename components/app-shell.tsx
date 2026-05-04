'use client'

import { useState } from 'react'
import { Onboarding } from '@/components/onboarding'
import { Dashboard } from '@/components/dashboard'

type AppShellProps = {
  profileId: string
  displayName: string
  initialHasOnboarded: boolean
}

export function AppShell({ profileId, displayName, initialHasOnboarded }: AppShellProps) {
  const [hasOnboarded, setHasOnboarded] = useState(initialHasOnboarded)

  if (!hasOnboarded) {
    return <Onboarding onCompleted={() => setHasOnboarded(true)} />
  }

  return <Dashboard profileId={profileId} displayName={displayName} />
}
