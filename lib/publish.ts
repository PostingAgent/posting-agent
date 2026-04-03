// lib/publish.ts
// Shared helpers for publishing posts to Instagram and Facebook.

import { createAdminClient } from '@/lib/supabase/server'

// ── Meta token refresh ───────────────────────────────────────────────────────
// Long-lived tokens last ~60 days. Refresh if expiring within 7 days.

export async function refreshMetaTokenIfNeeded(
  token: { platform: string; access_token: string; expires_at: string | null; user_id: string },
  supabase: Awaited<ReturnType<typeof createAdminClient>>
): Promise<string> {
  if (!token.expires_at) return token.access_token

  const expiresAt = new Date(token.expires_at).getTime()
  const sevenDays = 7 * 24 * 60 * 60 * 1000
  if (expiresAt - Date.now() > sevenDays) return token.access_token

  try {
    const res = await fetch(
      'https://graph.facebook.com/v21.0/oauth/access_token?' +
      new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: process.env.META_APP_ID || '',
        client_secret: process.env.META_APP_SECRET || '',
        fb_exchange_token: token.access_token,
      })
    )
    const data = await res.json()
    if (data.access_token) {
      const newExpires = new Date(Date.now() + (data.expires_in || 5184000) * 1000).toISOString()
      await supabase
        .from('social_tokens')
        .update({ access_token: data.access_token, expires_at: newExpires })
        .eq('user_id', token.user_id)
        .eq('platform', token.platform)
      return data.access_token
    }
  } catch (err) {
    console.error(`Meta token refresh failed for ${token.platform}:`, err)
  }
  return token.access_token
}

// ── Instagram (via Meta Graph API) ───────────────────────────────────────────
// 2-step process: create media container, then publish it.

export async function postToInstagram(
  caption: string,
  imageUrl: string,
  accessToken: string,
  igUserId: string
) {
  if (!igUserId) throw new Error('No Instagram user ID found')

  const containerRes = await fetch(
    `https://graph.facebook.com/v21.0/${igUserId}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imageUrl, caption, access_token: accessToken }),
    }
  )
  const containerData = await containerRes.json()
  if (!containerData.id) throw new Error(`Instagram container error: ${JSON.stringify(containerData)}`)

  const publishRes = await fetch(
    `https://graph.facebook.com/v21.0/${igUserId}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: containerData.id, access_token: accessToken }),
    }
  )
  const publishData = await publishRes.json()
  if (!publishData.id) throw new Error(`Instagram publish error: ${JSON.stringify(publishData)}`)
}

// ── Facebook (via Meta Graph API) ────────────────────────────────────────────

export async function postToFacebook(
  caption: string,
  imageUrl: string,
  accessToken: string,
  pageId: string
) {
  if (!pageId) {
    console.log('No FB page ID found, skipping Facebook post')
    return
  }

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${pageId}/photos`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: imageUrl, caption, access_token: accessToken }),
    }
  )
  const data = await res.json()
  if (!data.id) throw new Error(`Facebook post error: ${JSON.stringify(data)}`)
}

// ── Token map helper ─────────────────────────────────────────────────────────

export interface TokenInfo {
  accessToken: string
  igUserId: string
  pageId: string
}

export async function getTokenMap(
  userId: string,
  supabase: Awaited<ReturnType<typeof createAdminClient>>
): Promise<{ tokenMap: Record<string, string>; igUserId: string; pageId: string }> {
  const { data: tokens } = await supabase
    .from('social_tokens')
    .select('*')
    .eq('user_id', userId)

  const tokenMap: Record<string, string> = {}
  let igUserId = ''
  let pageId = ''

  for (const t of tokens ?? []) {
    const refreshed = await refreshMetaTokenIfNeeded(t, supabase)
    tokenMap[t.platform] = refreshed
    if (t.platform === 'instagram' && t.ig_user_id) igUserId = t.ig_user_id
    if (t.platform === 'facebook' && t.page_id) pageId = t.page_id
  }

  return { tokenMap, igUserId, pageId }
}
