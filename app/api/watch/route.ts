// app/api/watch/route.ts
// Cron job: checks each user's Google Photos album for new images,
// generates AI captions, and creates post records.

import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface PhotoItem {
  id: string
  filename: string
  mimeType: string
  baseUrl: string
  mediaMetadata?: {
    creationTime?: string
  }
}

export async function GET() {
  const supabase = createAdminClient(supabaseUrl, supabaseServiceKey)

  // Get all users who have connected a Google Photos album
  const { data: users, error } = await supabase
    .from('user_profiles')
    .select('id, trade, caption_tone, auto_post, google_access_token, google_refresh_token, google_folder_id')
    .not('google_folder_id', 'is', null)
    .not('google_access_token', 'is', null)

  if (error || !users?.length) {
    return NextResponse.json({ message: 'No users to process', error: error?.message })
  }

  const results: any[] = []

  for (const user of users) {
    try {
      // Refresh the token first
      let accessToken = user.google_access_token
      if (user.google_refresh_token) {
        const newToken = await refreshGoogleToken(user, supabase)
        if (newToken) accessToken = newToken
      }

      // Fetch new photos from the album
      const newItems = await fetchNewPhotos(accessToken, user.google_folder_id, user.id, supabase)

      results.push({ userId: user.id, newItems: newItems.length })

      // Process each new photo
      for (const item of newItems) {
        await processPhoto(item, user, supabase)
      }
    } catch (err: any) {
      console.error(`Error processing user ${user.id}:`, err)
      results.push({ userId: user.id, error: err.message })
    }
  }

  return NextResponse.json({ processed: results })
}

// Refresh the Google OAuth access token using the refresh token
async function refreshGoogleToken(user: { id: string; google_refresh_token: string }, supabase: any) {
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

// Fetch new photos from a Google Photos album
async function fetchNewPhotos(
  accessToken: string,
  albumId: string,
  userId: string,
  supabase: any
): Promise<PhotoItem[]> {
  const res = await fetch('https://photoslibrary.googleapis.com/v1/mediaItems:search', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      albumId: albumId,
      pageSize: 20,
    }),
  })

  const data = await res.json()

  if (data.error) {
    console.error('Google Photos API error:', data.error)
    return []
  }

  const items: PhotoItem[] = data.mediaItems ?? []

  // Filter out photos we've already processed
  const newItems: PhotoItem[] = []
  for (const item of items) {
    const { data: existing } = await supabase
      .from('posts')
      .select('id')
      .eq('google_media_id', item.id)
      .single()

    if (!existing) {
      newItems.push(item)
    }
  }

  return newItems
}

// Process a single photo: download, upload to Supabase Storage, generate caption, create post
async function processPhoto(
  item: PhotoItem,
  user: {
    id: string
    trade: string
    caption_tone: string
    auto_post: boolean
    google_folder_id: string
  },
  supabase: any
) {
  // Download the photo from Google Photos (baseUrl + =d for full resolution download)
  const imageRes = await fetch(`${item.baseUrl}=d`)
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

  // Generate AI caption using base64 image
  const caption = await generateCaption(imageBuffer, item.mimeType, user.trade, user.caption_tone)

  // Create the post record
  await supabase.from('posts').insert({
    user_id: user.id,
    image_url: publicUrl,
    caption: caption.text,
    hashtags: caption.hashtags,
    google_media_id: item.id,
    status: user.auto_post ? 'scheduled' : 'pending_review',
    scheduled_for: user.auto_post ? new Date(Date.now() + 5 * 60 * 1000).toISOString() : null,
  })
}

// Use Claude to generate a caption for the photo
async function generateCaption(
  imageBuffer: ArrayBuffer,
  mimeType: string,
  trade: string,
  tone: string
): Promise<{ text: string; hashtags: string[] }> {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

    // Convert image to base64
    const base64 = Buffer.from(imageBuffer).toString('base64')
    const mediaType = mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            {
              type: 'text',
              text: `You are a social media manager for a ${trade} business. Write a short, engaging social media caption for this job site photo. Tone: ${tone || 'professional but friendly'}.

Return your response in this exact format:
CAPTION: [your caption here]
HASHTAGS: [comma-separated list of 6 relevant hashtags without the # symbol]`,
            },
          ],
        },
      ],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

   const captionMatch = responseText.match(/CAPTION:\s*([\s\S]+?)(?=\nHASHTAGS:|\n\n|$)/)
    const hashtagMatch = responseText.match(/HASHTAGS:\s*([\s\S]+)/)

    return {
      text: captionMatch?.[1]?.trim() ?? responseText,
      hashtags: hashtagMatch?.[1]?.split(',').map((h: string) => h.trim()) ?? [],
    }
  } catch (err) {
    console.error('Caption generation error:', err)
    return {
      text: `Another great day on the job! #${trade}`,
      hashtags: [trade, 'contractor', 'qualitywork', 'jobsite', 'beforeandafter', 'localservice'],
    }
  }
}
