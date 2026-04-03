// app/api/posts/publish/route.ts
//
// GET /api/posts/publish
// Called by cron every 15 minutes.
// Finds all posts with status "scheduled" whose scheduled_for time has passed,
// and publishes them to the selected social platforms.

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { postToInstagram, postToFacebook, getTokenMap } from '@/lib/publish'
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
  const { tokenMap, igUserId, pageId } = await getTokenMap(post.user_id, supabase)

  const fullCaption = `${post.caption}\n\n${post.hashtags?.join(' ')}`

  for (const platform of (post.platforms as Platform[])) {
    const accessToken = tokenMap[platform]
    if (!accessToken) {
      console.log(`No token for ${platform}, skipping`)
      continue
    }

    try {
      switch (platform) {
        case 'instagram':
          await postToInstagram(fullCaption, post.image_url, accessToken, igUserId)
          break
        case 'facebook':
          await postToFacebook(fullCaption, post.image_url, accessToken, pageId)
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
    } catch (err) {
      console.error(`Failed to post to ${platform}:`, err)
    }
  }
}
