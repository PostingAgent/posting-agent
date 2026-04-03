// app/api/posts/publish-now/route.ts
//
// POST /api/posts/publish-now
// Immediately publishes a single post to all selected platforms.
// Requires authentication — the user must own the post.

import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { postToInstagram, postToFacebook, getTokenMap } from '@/lib/publish'

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

  // Get the user's social platform tokens (with auto-refresh)
  const { tokenMap, igUserId, pageId } = await getTokenMap(user.id, admin)

  const fullCaption = `${caption ?? post.caption}\n\n${post.hashtags?.join(' ')}`

  let success = false
  let errorMessage = ''

  // Try Instagram
  const igToken = tokenMap['instagram']
  if (igToken && igUserId) {
    try {
      await postToInstagram(fullCaption, post.image_url, igToken, igUserId)
      success = true
    } catch (err: any) {
      console.error('Failed to post to Instagram:', err)
      errorMessage = err.message || 'Instagram publish failed'
    }
  } else {
    errorMessage = 'No Instagram account connected'
  }

  // Try Facebook (independent of Instagram)
  const fbToken = tokenMap['facebook']
  if (fbToken && pageId) {
    try {
      await postToFacebook(fullCaption, post.image_url, fbToken, pageId)
      success = true // success if either platform works
    } catch (err: any) {
      console.error('Failed to post to Facebook:', err)
      if (!success) errorMessage += '. Facebook: ' + (err.message || 'failed')
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

  return NextResponse.json({ success, postId, error: errorMessage || undefined })
}
