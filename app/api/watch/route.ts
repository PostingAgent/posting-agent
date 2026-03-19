// app/api/watch/route.ts
//
// GET /api/watch
// Called by a cron job every 5 minutes (configured in vercel.json)
// For each user who has a connected Google Photos folder, it checks for
// new photos since the last check, generates captions, and creates post records.

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { GoogleMediaItem } from '@/types'

// Verify this request is from our cron job, not a random visitor
// Vercel sets this header automatically for cron routes
function verifyCronSecret(request: Request) {
  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(request: Request) {
  // In production, only allow cron job to call this
  if (process.env.NODE_ENV === 'production' && !verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createAdminClient()

  // Get all users who have connected a Google Photos folder
  const { data: users, error } = await supabase
    .from('user_profiles')
    .select('id, trade, caption_tone, auto_post, google_access_token, google_refresh_token, google_folder_id')
    .not('google_folder_id', 'is', null)
    .not('google_access_token', 'is', null)

  if (error || !users) {
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 })
  }

  let totalNew = 0
  const results = []

  for (const user of users) {
    try {
      // Refresh the Google access token if needed
      const accessToken = await refreshGoogleToken(user, supabase)
      if (!accessToken) continue

      // Find out when we last checked this user's folder
      const { data: lastPost } = await supabase
        .from('posts')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      // Look back 24 hours if no posts exist yet, otherwise since last check
      const since = lastPost?.created_at
        ? new Date(lastPost.created_at)
        : new Date(Date.now() - 24 * 60 * 60 * 1000)

      // Fetch new media items from the Google Photos album
      const newItems = await fetchNewPhotos(
        accessToken,
        user.google_folder_id,
        since
      )

      if (newItems.length === 0) continue

      // For each new photo, generate a caption and create a post record
      for (const item of newItems) {
        await processPhoto(item, user, supabase)
        totalNew++
      }

      results.push({ userId: user.id, newPhotos: newItems.length })
    } catch (err) {
      console.error(`Error processing user ${user.id}:`, err)
    }
  }

  return NextResponse.json({
    processed: users.length,
    newPhotosFound: totalNew,
    results,
  })
}

// Refresh the Google OAuth access token using the refresh token
async function refreshGoogleToken(user: { id: string, google_refresh_token: string }, supabase: ReturnType<typeof createAdminClient> extends Promise<infer T> ? T : never) {
  if (!user.google_refresh_token) return null

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: user.google_refresh_token,
        grant_type: 'refresh_token',
      }),
    })

    const data = await res.json()
    if (data.access_token) {
      // Save the new access token
      await supabase
        .from('user_profiles')
        .update({ google_access_token: data.access_token })
        .eq('id', user.id)
      return data.access_token
    }
  } catch (err) {
    console.error('Token refresh failed:', err)
  }
  return null
}

// Fetch photos added to the album since a given date
async function fetchNewPhotos(
  accessToken: string,
  albumId: string,
  since: Date
): Promise<GoogleMediaItem[]> {
  const res = await fetch('https://photoslibrary.googleapis.com/v1/mediaItems:search', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      albumId,
      pageSize: 20,
      filters: {
        dateFilter: {
          ranges: [{
            startDate: {
              year: since.getFullYear(),
              month: since.getMonth() + 1,
              day: since.getDate(),
            },
            endDate: {
              year: new Date().getFullYear(),
              month: new Date().getMonth() + 1,
              day: new Date().getDate(),
            },
          }],
        },
      },
    }),
  })

  const data = await res.json()
  return (data.mediaItems ?? []).filter((item: GoogleMediaItem) =>
    // Only process photos (not videos) for now
    item.mimeType?.startsWith('image/')
  )
}

// Process a single photo: upload to Supabase Storage, generate caption, create post record
async function processPhoto(
  item: GoogleMediaItem,
  user: {
    id: string
    trade: string
    caption_tone: string
    auto_post: boolean
    google_folder_id: string
  },
  supabase: ReturnType<typeof createAdminClient> extends Promise<infer T> ? T : never
) {
  // Check we haven't already processed this photo
  const { data: existing } = await supabase
    .from('posts')
    .select('id')
    .eq('google_media_id', item.id)
    .single()

  if (existing) return  // Already processed, skip

  // Download the photo from Google and upload to Supabase Storage
  // We store a copy so we're not dependent on Google Photos URLs expiring
  const imageRes = await fetch(`${item.baseUrl}=w1200-h1200`)
  const imageBuffer = await imageRes.arrayBuffer()

  const fileName = `${user.id}/${Date.now()}-${item.filename}`
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('post-images')
    .upload(fileName, imageBuffer, {
      contentType: item.mimeType,
      upsert: false,
    })

  if (uploadError) {
    console.error('Upload error:', uploadError)
    return
  }

  // Get the public URL for this image
  const { data: { publicUrl } } = supabase.storage
    .from('post-images')
    .getPublicUrl(uploadData.path)

  // Call our caption generation API
  const captionRes = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/generate-caption`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl: publicUrl,
        trade: user.trade,
        tone: user.caption_tone,
      }),
    }
  )

  const { caption, hashtags } = await captionRes.json()

  // Default platforms — all 5
  const platforms = ['instagram', 'facebook', 'tiktok', 'linkedin', 'x']

  // Create the post record
  // Status depends on auto_post setting:
  // - auto_post = true  → "scheduled" (will post automatically)
  // - auto_post = false → "pending_review" (user must approve)
  await supabase.from('posts').insert({
    user_id: user.id,
    image_url: publicUrl,
    caption,
    hashtags,
    platforms,
    status: user.auto_post ? 'scheduled' : 'pending_review',
    scheduled_for: user.auto_post ? getOptimalPostTime() : null,
    google_media_id: item.id,
  })
}

// Pick the best time to post — 9am tomorrow by default
// In a future version this will use per-platform analytics
function getOptimalPostTime(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(9, 0, 0, 0)
  return tomorrow.toISOString()
}
