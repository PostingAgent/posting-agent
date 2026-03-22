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

  let token = profile.google_access_token

  if (profile.google_refresh_token) {
    const refreshed = await refreshAccessToken(profile.google_refresh_token)
    if (refreshed) {
      token = refreshed.access_token
      await supabase.from('user_profiles').update({ google_access_token: token }).eq('id', user.id)
    }
  }

  // Use Google Drive API to list folders
  const res = await fetch(
    "https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.folder'+and+trashed=false&fields=files(id,name)&pageSize=50",
    { headers: { Authorization: 'Bearer ' + token } }
  )

  const data = await res.json()

  if (data.error) {
    return NextResponse.json({ error: data.error.message }, { status: res.status })
  }

  const albums = (data.files ?? []).map((f: any) => ({
    id: f.id,
    title: f.name,
    mediaItemsCount: null,
    coverPhotoBaseUrl: null,
  }))

  return NextResponse.json({ albums })
}
