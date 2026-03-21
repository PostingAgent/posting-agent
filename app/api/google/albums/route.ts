// app/api/google/albums/route.ts
// GET /api/google/albums
// Returns the user's Google Photos albums so they can pick one to watch.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID ?? '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })
    const data = await res.json()
    return data.access_token ?? null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get the stored tokens
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('google_access_token, google_refresh_token')
    .eq('id', user.id)
    .single()

  if (!profile?.google_access_token) {
    return NextResponse.json({ error: 'Google not connected' }, { status: 400 })
  }

  let token = profile.google_access_token

  // Try fetching albums with current token
  let res = await fetch(
    'https://photoslibrary.googleapis.com/v1/albums?pageSize=50',
    { headers: { Authorization: `Bearer ${token}` } }
  )

  // If token expired, refresh it and retry
  if (res.status === 401 && profile.google_refresh_token) {
    const newToken = await refreshAccessToken(profile.google_refresh_token)
    if (newToken) {
      token = newToken
      // Save the new token to the database
      await supabase
        .from('user_profiles')
        .update({ google_access_token: newToken })
        .eq('id', user.id)

      // Retry the request with the new token
      res = await fetch(
        'https://photoslibrary.googleapis.com/v1/albums?pageSize=50',
        { headers: { Authorization: `Bearer ${token}` } }
      )
    }
  }

  const data = await res.json()
  if (data.error) {
    return NextResponse.json({ error: data.error.message }, { status: res.status })
  }

  return NextResponse.json({ albums: data.albums ?? [] })
}