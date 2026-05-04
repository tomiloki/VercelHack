import { createClient } from '@supabase/supabase-js'
import { requireSupabaseEnv } from './env'

export function requireSupabaseAdminEnv() {
  const { url } = requireSupabaseEnv()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY. Bot adapters need a server-side Supabase admin client.')
  }

  return {
    url,
    serviceRoleKey,
  }
}

export function createAdminClient() {
  const { url, serviceRoleKey } = requireSupabaseAdminEnv()

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
