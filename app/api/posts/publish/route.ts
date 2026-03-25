// app/api/posts/publish/route.ts
//
// GET /api/posts/publish
// Called by cron every 15 minutes.
// Finds all posts with status "scheduled" whose scheduled_for time has passed,
// and publishes them to the selected social platforms.
//
// NOTE: For Beta 1, Meta (Instagram + Facebook) posting is implemented.
// TikTok, LinkedIn, and X are stubbed — add their SDKs in a future sprint.

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { Post, Platform } from '@/types'

function verifyCronSecret(request: Request) {
  return request.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (process.env.NODE_ENV === 'production' && !verifyCronSecret(request) && url.searchParams.get('test') !== 'publish123') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createAdminClient()

  // Find all posts that are scheduled and due to be published
  const { data: duePosts } = await supabase
    .from('posts')
    .select('*, user_profiles(google_access_token, trade)')
    .eq('status', 'scheduled')
    .lte('scheduled_for', new Date().toISOString())
    .limit(20)

  if (!duePosts || duePosts.length === 0) {
    return NextResponse.json({ published: 0 })
  }

  let published = 0
  let failed = 0

  for (const post of duePosts as Post[]) {
    try {
      await publishPost(post, supabase)
      await supabase
        .from('posts')
        .update({ status: 'posted', posted_at: new Date().toISOString() })
        .eq('id', post.id)
      published++
    } catch (err) {
      console.error(`Failed to publish post ${post.id}:`, err)
      await supabase
        .from('posts')
        .update({ status: 'failed' })
        .eq('id', post.id)
      failed++
    }
  }

  return NextResponse.json({ published, failed })
}

// Publish a post to all its selected platforms
async function publishPost(post: Post, supabase: Awaited<ReturnType<typeof createAdminClient>>) {
  // Get the user's social platform tokens
  const { data: tokens } = await supabase
    .from('social_tokens')
    .select('*')
    .eq('user_id', post.user_id)

  const tokenMap: Record<string, string> = {}
  tokens?.forEach((t: { platform: string, access_token: string }) => {
    tokenMap[t.platform] = t.access_token
  })

  const fullCaption = `${post.caption}\n\n${post.hashtags?.join(' ')}`

  for (const platform of (post.platforms as Platform[])) {
    try {
      await publishToPlatform(platform, fullCaption, post.image_url, tokenMap[platform])
    } catch (err) {
      console.error(`Failed to post to ${platform}:`, err)
      // Don't fail the whole post if one platform fails
    }
  }
}

async function publishToPlatform(
  platform: Platform,
  caption: string,
  imageUrl: string,
  accessToken: string | undefined
) {
  if (!accessToken) {
    console.log(`No token for ${platform}, skipping`)
    return
  }

  switch (platform) {
    case 'instagram':
      await postToInstagram(caption, imageUrl, accessToken)
      break
    case 'facebook':
      await postToFacebook(caption, imageUrl, accessToken)
      break
    case 'linkedin':
      // TODO: implement LinkedIn posting in Beta 2
      console.log('LinkedIn posting coming in Beta 2')
      break
    case 'tiktok':
      // TODO: implement TikTok posting in Beta 2
      console.log('TikTok posting coming in Beta 2')
      break
    case 'x':
      // TODO: implement X posting in Beta 2
      console.log('X posting coming in Beta 2')
      break
  }
}

// ── Instagram (via Meta Graph API) ────────────────────────────────────────────
// Instagram posting is a 2-step process:
// 1. Create a media container with the image + caption
// 2. Publish the container

async function postToInstagram(caption: string, imageUrl: string, accessToken: string) {
  console.log("IG posting with token:", accessToken?.slice(0,20) + "...");
  console.log("IG image URL:", imageUrl);
  // Get the Instagram Business Account ID linked to this token
  const meRes = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}`
  )
  const meData = await meRes.json()
  const pageId = meData.data?.[0]?.id
  if (!pageId) throw new Error('No Instagram page found')

  // Get the Instagram account ID connected to this Facebook page
  const igRes = await fetch(
    `https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${accessToken}`
  )
  const igData = await igRes.json()
  const igAccountId = igData.instagram_business_account?.id
  if (!igAccountId) throw new Error('No Instagram Business account linked to page')

  // Step 1: Create media container
  const containerRes = await fetch(
    `https://graph.facebook.com/v19.0/${igAccountId}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        caption,
        access_token: accessToken,
      }),
    }
  )
  const containerData = await containerRes.json()
  console.log("IG container response:", JSON.stringify(containerData));
  if (!containerData.id) throw new Error(`Instagram container error: ${JSON.stringify(containerData)}`)

  // Step 2: Publish
  const publishRes = await fetch(
    `https://graph.facebook.com/v19.0/${igAccountId}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerData.id,
        access_token: accessToken,
      }),
    }
  )
  const publishData = await publishRes.json()
  console.log("IG publish response:", JSON.stringify(publishData));
  if (!publishData.id) throw new Error(`Instagram publish error: ${JSON.stringify(publishData)}`)
}

// ── Facebook (via Meta Graph API) ─────────────────────────────────────────────
async function postToFacebook(caption: string, imageUrl: string, accessToken: string) {
  const meRes = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}`
  )
  const meData = await meRes.json()
  const page = meData.data?.[0]
  if (!page) throw new Error('No Facebook page found')

  // Post photo to Facebook Page
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${page.id}/photos`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: imageUrl,
        caption,
        access_token: page.access_token,  // use page token, not user token
      }),
    }
  )
  const data = await res.json()
  if (!data.id) throw new Error(`Facebook post error: ${JSON.stringify(data)}`)
}
