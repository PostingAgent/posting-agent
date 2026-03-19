// app/api/google/albums/route.ts
// GET /api/google/albums
// Returns the user's Google Photos albums so they can pick one to watch.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get the stored access token
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('google_access_token')
    .eq('id', user.id)
    .single()

  if (!profile?.google_access_token) {
    return NextResponse.json({ error: 'Google not connected' }, { status: 400 })
  }

  // Fetch albums from Google Photos API
  const res = await fetch(
    'https://photoslibrary.googleapis.com/v1/albums?pageSize=50',
    {
      headers: { Authorization: `Bearer ${profile.google_access_token}` },
    }
  )

  const data = await res.json()

  if (data.error) {
    return NextResponse.json({ error: data.error.message }, { status: 400 })
  }

  return NextResponse.json({ albums: data.albums ?? [] })
}
