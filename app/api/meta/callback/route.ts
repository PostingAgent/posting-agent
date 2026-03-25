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

  // Exchange the code for a short-lived token
  const tokenRes = await fetch(
    'https://graph.facebook.com/v21.0/oauth/access_token?' +
    new URLSearchParams({
      client_id: process.env.META_APP_ID!,
      client_secret: process.env.META_APP_SECRET!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/meta/callback`,
      code,
    }),
    { method: 'GET' }
  )

  const tokenData = await tokenRes.json()

  if (!tokenData.access_token) {
    console.error('Meta token exchange failed:', tokenData)
    return NextResponse.redirect(new URL('/dashboard/connect?error=meta_token_failed', request.url))
  }

  // Exchange short-lived token for long-lived token (60 days)
  const longLivedRes = await fetch(
    'https://graph.facebook.com/v21.0/oauth/access_token?' +
    new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: process.env.META_APP_ID!,
      client_secret: process.env.META_APP_SECRET!,
      fb_exchange_token: tokenData.access_token,
    }),
    { method: 'GET' }
  )

  const longLivedData = await longLivedRes.json()
  const accessToken = longLivedData.access_token || tokenData.access_token
  const expiresIn = longLivedData.expires_in || 5184000

  // Get the user's Facebook Pages
  const pagesRes = await fetch(
    'https://graph.facebook.com/v21.0/me/accounts?access_token=' + accessToken
  )
  const pagesData = await pagesRes.json()

  // Get the Instagram Business Account ID linked to the Facebook Page
  let igUserId = null
  let pageToken = null

  if (pagesData.data && pagesData.data.length > 0) {
    const page = pagesData.data[0]
    pageToken = page.access_token

    const igRes = await fetch(
      `https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account&access_token=${pageToken}`
    )
    const igData = await igRes.json()
    igUserId = igData.instagram_business_account?.id || null
  }

  // Save tokens to Supabase
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!