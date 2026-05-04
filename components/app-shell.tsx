'use client'

import { useState } from 'react'
import { Onboarding } from '@/components/onboarding'
import { Dashboard } from '@/components/dashboard'
import type { TodaySummaryData } from '@/lib/ai/habitquest-domain-service'
import type { UserActivityItem } from '@/app/api/activities/route'

type AppShellProps = {
  profileId: string
  displayName: string
  initialHasOnboarded: boolean
  initialSummary: TodaySummaryData | null
  initialActivities: UserActivityItem[]
}

export function AppShell({ profileId, displayName, initialHasOnboarded, initialSummary, initialActivities }: AppShellProps) {
  const [hasOnboarded, setHasOnboarded] = useState(initialHasOnboarded)

  if (!hasOnboarded) {
    return <Onboarding onCompleted={() => setHasOnboarded(true)} />
  }

  return (
    <Dashboard
      profileId={profileId}
      displayName={displayName}
      initialSummary={initialSummary}
      initialActivities={initialActivities}
    />
  )
}
