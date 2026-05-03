import { AppShell } from '@/components/app-shell'
import { AuthCard } from '@/components/auth-card'
import { getAuthContext } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const auth = await getAuthContext()

  if (!auth.isConfigured || !auth.user || !auth.profile) {
    return <AuthCard isConfigured={auth.isConfigured} />
  }

  return (
    <AppShell
      profileId={auth.profile.id}
      displayName={auth.profile.display_name ?? auth.user.email ?? 'Demo user'}
    />
  )
}
