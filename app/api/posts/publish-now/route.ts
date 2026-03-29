// app/api/posts/publish-now/route.ts
//
// POST /api/posts/publish-now
// Immediately publishes a single post to all selected platforms.
// Requires authentication — the user must own the post.

import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Post, Platform } from '@/types'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { postId, caption } = await request.json()

  if (!postId) {
    return NextResponse.json({ error: 'postId is required' }, { status: 400 })
  }

  const admin = await createAdminClient()

  // Fetch the post — verify it belongs to this user
  const { data: post } = await admin
    .from('posts')
    .select('*')
    .eq('id', postId)
    .eq('user_id', user.id)
    .single()

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  // Update caption if edited, and set status to scheduled
  await admin
    .from('posts')
    .update({
      caption: caption ?? post.caption,
      status: 'scheduled',
      scheduled_for: new Date().toISOString(),
    })
    .eq('id', postId)

  // Get the user's social platform tokens
  const { data: tokens } = await admin
    .from('social_tokens')
    .select('*')
    .eq('user_id', user.id)

  const tokenMap: Record<string, string> = {}
  tokens?.forEach((t: { platform: string; access_token: string }) => {
    tokenMap[t.platform] = t.access_token
  })

  const fullCaption = `${caption ?? post.caption}\n\n${post.hashtags?.join(' ')}`

  let success = true

  for (const platform of (post.platforms as Platform[])) {
    const accessToken = tokenMap[platform]
    if (!accessToken) {
      console.log(`No token for ${platform}, skipping`)
      continue
    }

    try {
      await publishToPlatform(platform, fullCaption, post.image_url, accessToken)
    } catch (err) {
      console.error(`Failed to post to ${platform}:`, err)
      success = false
    }
  }

  if (success) {
    await admin
      .from('posts')
      .update({ status: 'posted', posted_at: new Date().toISOString() })
      .eq('id', postId)
  } else {
    await admin
      .from('posts')
      .update({ status: 'failed' })
      .eq('id', postId)
  }

  return NextResponse.json({ success, postId })
}

// ── Platform publishing (same logic as cron publish route) ───────────────────

async function publishToPlatform(
  platform: Platform,
  caption: string,
  imageUrl: string,
  accessToken: string
) {
  switch (platform) {
    case 'instagram':
      await postToInstagram(caption, imageUrl, accessToken)
      break
    case 'facebook':
      await postToFacebook(caption, imageUrl, accessToken)
      break
    case 'linkedin':
      console.log('LinkedIn posting coming in Beta 2')
      break
    case 'tiktok':
      console.log('TikTok posting coming in Beta 2')
      break
    case 'x':
      console.log('X posting coming in Beta 2')
      break
  }
}

async function postToInstagram(caption: string, imageUrl: string, accessToken: string) {
  const meRes = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}`
  )
  const meData = await meRes.json()
  const pageId = meData.data?.[0]?.id
  if (!pageId) throw new Error('No Instagram page found')

  const igRes = await fetch(
    `https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${accessToken}`
  )
  const igData = await igRes.json()
  const igAccountId = igData.instagram_business_account?.id
  if (!igAccountId) throw new Error('No Instagram Business account linked to page')

  const containerRes = await fetch(
    `https://graph.facebook.com/v19.0/${igAccountId}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imageUrl, caption, access_token: accessToken }),
    }
  )
  const containerData = await containerRes.json()
  if (!containerData.id) throw new Error(`Instagram container error: ${JSON.stringify(containerData)}`)

  const publishRes = await fetch(
    `https://graph.facebook.com/v19.0/${igAccountId}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: containerData.id, access_token: accessToken }),
    }
  )
  const publishData = await publishRes.json()
  if (!publishData.id) throw new Error(`Instagram publish error: ${JSON.stringify(publishData)}`)
}

async function postToFacebook(caption: string, imageUrl: string, accessToken: string) {
  const meRes = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}`
  )
  const meData = await meRes.json()
  const page = meData.data?.[0]
  if (!page) throw new Error('No Facebook page found')

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${page.id}/photos`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: imageUrl, caption, access_token: page.access_token }),
    }
  )
  const data = await res.json()
  if (!data.id) throw new Error(`Facebook post error: ${JSON.stringify(data)}`)
}
