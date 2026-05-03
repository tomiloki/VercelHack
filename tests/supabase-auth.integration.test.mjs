import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const ROOT_DIR = process.cwd()
const ENV_PATH = resolve(ROOT_DIR, '.env.local')
const OUTPUT_PATH = resolve(ROOT_DIR, 'tests', '.last-supabase-test-users.json')

function parseEnvFile(filePath) {
  const content = readFileSync(filePath, 'utf8')
  const values = {}

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()

    if (!line || line.startsWith('#')) continue

    const separatorIndex = line.indexOf('=')
    if (separatorIndex === -1) continue

    const key = line.slice(0, separatorIndex).trim()
    let value = line.slice(separatorIndex + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    values[key] = value
  }

  return values
}

function createAnonymousSupabaseClient() {
  const env = parseEnvFile(ENV_PATH)
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  assert.ok(url, 'Falta NEXT_PUBLIC_SUPABASE_URL en .env.local')
  assert.ok(publishableKey, 'Falta NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env.local')

  return createClient(url, publishableKey)
}

async function signInAnonymous(client) {
  const { data, error } = await client.auth.signInAnonymously()
  assert.ifError(error)
  assert.ok(data.user, 'Supabase no devolvió user en signInAnonymously')
  return data.user
}

async function fetchOwnProfile(client, userId) {
  const { data, error } = await client
    .from('profiles')
    .select('id, user_id, display_name, timezone, coach_tone')
    .eq('user_id', userId)
    .single()

  assert.ifError(error)
  assert.ok(data, 'No se encontró el profile para el usuario autenticado')
  return data
}

test('anonymous auth bootstraps profile and RLS isolates each profile', async () => {
  const cleanupIds = []

  const clientA = createAnonymousSupabaseClient()
  const userA = await signInAnonymous(clientA)
  cleanupIds.push(userA.id)

  const profileA = await fetchOwnProfile(clientA, userA.id)
  assert.equal(profileA.user_id, userA.id)
  assert.equal(profileA.display_name, 'Demo user')
  assert.equal(profileA.timezone, 'America/Santiago')
  assert.equal(profileA.coach_tone, 'collaborative')

  const clientB = createAnonymousSupabaseClient()
  const userB = await signInAnonymous(clientB)
  cleanupIds.push(userB.id)

  const profileB = await fetchOwnProfile(clientB, userB.id)
  assert.equal(profileB.user_id, userB.id)

  const { data: forbiddenProfileFromA, error: forbiddenProfileErrorFromA } = await clientA
    .from('profiles')
    .select('id, user_id')
    .eq('user_id', userB.id)
    .maybeSingle()

  assert.ifError(forbiddenProfileErrorFromA)
  assert.equal(forbiddenProfileFromA, null, 'RLS permitió que user A leyera el profile de user B')

  const { data: forbiddenProfileFromB, error: forbiddenProfileErrorFromB } = await clientB
    .from('profiles')
    .select('id, user_id')
    .eq('user_id', userA.id)
    .maybeSingle()

  assert.ifError(forbiddenProfileErrorFromB)
  assert.equal(forbiddenProfileFromB, null, 'RLS permitió que user B leyera el profile de user A')

  const impossibleUserId = randomUUID()
  const { data: impossibleProfile, error: impossibleProfileError } = await clientA
    .from('profiles')
    .select('id, user_id')
    .eq('user_id', impossibleUserId)
    .maybeSingle()

  assert.ifError(impossibleProfileError)
  assert.equal(impossibleProfile, null)

  writeFileSync(OUTPUT_PATH, JSON.stringify({ userIds: cleanupIds }, null, 2))

  const { error: signOutErrorA } = await clientA.auth.signOut()
  assert.ifError(signOutErrorA)

  const { error: signOutErrorB } = await clientB.auth.signOut()
  assert.ifError(signOutErrorB)
})
