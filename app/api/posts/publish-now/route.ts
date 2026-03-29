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
  let igUserId = ''
  let pageId = ''
  tokens?.forEach((t: any) => {
    tokenMap[t.platform] = t.access_token
    if (t.platform === 'instagram' && t.ig_user_id) igUserId = t.ig_user_id
    if (t.platform === 'facebook' && t.page_id) pageId = t.page_id
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
      await publishToPlatform(platform, fullCaption, post.image_url, accessToken, igUserId, pageId)
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

// ── Platform publishing (matches cron publish route logic) ───────────────────

async function publishToPlatform(
  platform: Platform,
  caption: string,
  imageUrl: string,
  accessToken: string,
  igUserId: string,
  pageId: string
) {
  switch (platform) {
    case 'instagram':
      await postToInstagram(caption, imageUrl, accessToken, igUserId)
      break
    case 'facebook':
      await postToFacebook(caption, imageUrl, accessToken, pageId)
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

async function postToInstagram(caption: string, imageUrl: string, accessToken: string, igUserId: string) {
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

async function postToFacebook(caption: string, imageUrl: string, accessToken: string, pageId: string) {
  if (!pageId) {
    console.log("No FB page ID found, skipping Facebook post")
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
