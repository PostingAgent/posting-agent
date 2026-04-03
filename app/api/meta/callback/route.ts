import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')

  if (error || !code) {
    console.error('Meta OAuth error:', error)
    return NextResponse.redirect(new URL('/dashboard/connect?error=meta_denied', request.url))
  }

  const tokenRes = await fetch(
    'https://graph.facebook.com/v21.0/oauth/access_token?' +
    new URLSearchParams({
     client_id: process.env.META_APP_ID || '',
      client_secret: process.env.META_APP_SECRET || '',
      redirect_uri: (process.env.NEXT_PUBLIC_APP_URL || '') + '/api/meta/callback',
      code,
    }),
    { method: 'GET' }
  )

  const tokenData = await tokenRes.json()

  if (!tokenData.access_token) {
    console.error('Meta token exchange failed:', tokenData)
    return NextResponse.redirect(new URL('/dashboard/connect?error=meta_token_failed', request.url))
  }

  const longRes = await fetch(
    'https://graph.facebook.com/v21.0/oauth/access_token?' +
    new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: process.env.META_APP_ID || "",
      client_secret: process.env.META_APP_SECRET || "",
      fb_exchange_token: tokenData.access_token,
    }),
    { method: 'GET' }
  )

  const longData = await longRes.json()
  const accessToken = longData.access_token || tokenData.access_token
  const expiresIn = longData.expires_in || 5184000

  const pagesRes = await fetch(
    'https://graph.facebook.com/v21.0/me/accounts?access_token=' + accessToken
  )
  const pagesData = await pagesRes.json()

  let igUserId = null
  let pageToken = null

  if (pagesData.data && pagesData.data.length > 0) {
    const page = pagesData.data[0]
    pageToken = page.access_token
    const igRes = await fetch(
      'https://graph.facebook.com/v21.0/' + page.id + '?fields=instagram_business_account&access_token=' + pageToken
    )
    const igData = await igRes.json()
    igUserId = igData.instagram_business_account ? igData.instagram_business_account.id : null
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

  if (igUserId) {
    await supabase.from('social_tokens').upsert({
      user_id: user.id,
      platform: 'instagram',
      access_token: pageToken || accessToken,
      ig_user_id: igUserId,
      expires_at: expiresAt,
    }, { onConflict: 'user_id,platform' })
  }

  if (pageToken && pagesData.data?.[0]) {
    await supabase.from('social_tokens').upsert({
      user_id: user.id,
      platform: 'facebook',
      access_token: pageToken,
      page_id: pagesData.data[0].id,
      expires_at: expiresAt,
    }, { onConflict: 'user_id,platform' })
  }

  return NextResponse.redirect(new URL('/dashboard/connect?meta_connected=true', request.url))
}
