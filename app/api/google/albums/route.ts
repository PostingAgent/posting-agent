import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function refreshAccessToken(refreshToken: string): Promise<any> {
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
    console.log('Refresh response:', JSON.stringify(data))
    return data.access_token ? data : null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('google_access_token, google_refresh_token')
    .eq('id', user.id)
    .single()

  if (!profile?.google_access_token) {
    return NextResponse.json({ error: 'Google not connected' }, { status: 400 })
  }

  if (profile.google_refresh_token) {
    const refreshed = await refreshAccessToken(profile.google_refresh_token)
    if (refreshed) {
      console.log('Refreshed token scope:', refreshed.scope)

      await supabase
        .from('user_profiles')
        .update({ google_access_token: refreshed.access_token })
        .eq('id', user.id)

      const res = await fetch(
        'https://photoslibrary.googleapis.com/v1/albums?pageSize=50',
        { headers: { Authorization: `Bearer ${refreshed.access_token}` } }
      )
      const data = await res.json()
      console.log('Photos API status:', res.status)

      if (data.error) {
        return NextResponse.json({ error: data.error.message, scope: refreshed.scope }, { status: res.status })
      }
      return NextResponse.json({ albums: data.albums ?? [] })
    }
  }

  const res = await fetch(
    'https://photoslibrary.googleapis.com/v1/albums?pageSize=50',
    { headers: { Authorization: `Bearer ${profile.google_access_token}` } }
  )
  const data = await res.json()
  if (data.error) {
    return NextResponse.json({ error: data.error.message }, { status: res.status })
  }
  return NextResponse.json({ albums: data.albums ?? [] })
}
```
