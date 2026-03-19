// app/api/google/callback/route.ts
// After the user grants Google Photos access, Google redirects here with a code.
// We exchange it for access + refresh tokens and save them to the user's profile.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/dashboard/connect?error=no_code', request.url))
  }

  // Exchange the code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/google/callback`,
      grant_type: 'authorization_code',
    }),
  })

  const tokenData = await tokenRes.json()

  if (!tokenData.access_token) {
    console.error('Google token exchange failed:', tokenData)
    return NextResponse.redirect(new URL('/dashboard/connect?error=token_failed', request.url))
  }

  // Save tokens to the user's profile
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  await supabase
    .from('user_profiles')
    .update({
      google_access_token: tokenData.access_token,
      google_refresh_token: tokenData.refresh_token,
    })
    .eq('id', user.id)

  return NextResponse.redirect(new URL('/dashboard/connect?connected=true', request.url))
}
