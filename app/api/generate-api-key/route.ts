// app/api/generate-api-key/route.ts
//
// POST /api/generate-api-key
// Generates a new API key for the current user (for iOS Shortcut).

import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = 'pa_' + randomBytes(24).toString('hex')

  const admin = await createAdminClient()
  await admin
    .from('user_profiles')
    .update({ api_key: apiKey })
    .eq('id', user.id)

  return NextResponse.json({ apiKey })
}
