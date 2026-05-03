import { createServerClient, type SetAllCookies } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { requireSupabaseEnv } from './env'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  })

  const { url, publishableKey } = requireSupabaseEnv()

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll: ((cookiesToSet, headers) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))

        response = NextResponse.next({
          request,
        })

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value)
        })
      }) satisfies SetAllCookies,
    },
  })

  await supabase.auth.getClaims()

  return response
}
