'use client'

import { useAppStore } from '@/lib/store'
import { Onboarding } from '@/components/onboarding'
import { Dashboard } from '@/components/dashboard'

export default function Home() {
  const { hasOnboarded } = useAppStore()

  if (!hasOnboarded) {
    return <Onboarding />
  }

  return <Dashboard />
}
