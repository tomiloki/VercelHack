import { createServerClient, type SetAllCookies } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { requireSupabaseEnv } from './env'

export async function createClient() {
  const cookieStore = await cookies()
  const { url, publishableKey } = requireSupabaseEnv()

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll: ((cookiesToSet, _headers) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Server Components can read cookies but may not always be able to persist them.
        }
      }) satisfies SetAllCookies,
    },
  })
}
