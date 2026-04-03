// app/api/posts/upload/route.ts
//
// POST /api/posts/upload
// Accepts a photo upload from the user's device (camera or gallery),
// stores it in Supabase Storage, generates an AI caption, and creates a post.

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('photo') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No photo provided' }, { status: 400 })
  }

  const admin = await createAdminClient()

  // Get user profile for trade/tone
  const { data: profile } = await admin
    .from('user_profiles')
    .select('trade, caption_tone, auto_post')
    .eq('id', user.id)
    .single()

  const trade = profile?.trade ?? 'General Contractor'
  const tone = profile?.caption_tone ?? 'professional'

  // Upload to Supabase Storage
  const buffer = await file.arrayBuffer()
  const ext = file.name.split('.').pop() || 'jpg'
  const fileName = `${user.id}/${Date.now()}.${ext}`

  const { data: uploadData, error: uploadError } = await admin.storage
    .from('post-images')
    .upload(fileName, buffer, {
      contentType: file.type || 'image/jpeg',
      upsert: false,
    })

  if (uploadError) {
    console.error('Upload error:', uploadError)
    return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 })
  }

  const { data: { publicUrl } } = admin.storage
    .from('post-images')
    .getPublicUrl(uploadData.path)

  // Generate caption
  const caption = await generateCaption(buffer, file.type || 'image/jpeg', trade, tone)

  // Create post
  const { data: post, error: postError } = await admin.from('posts').insert({
    user_id: user.id,
    image_url: publicUrl,
    caption: caption.text,
    hashtags: caption.hashtags,
    platforms: ['instagram', 'facebook'],
    status: profile?.auto_post ? 'scheduled' : 'pending_review',
    scheduled_for: profile?.auto_post ? new Date(Date.now() + 5 * 60 * 1000).toISOString() : null,
  }).select().single()

  if (postError) {
    console.error('Post creation error:', postError)
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
  }

  return NextResponse.json({ post })
}

async function generateCaption(
  imageBuffer: ArrayBuffer,
  mimeType: string,
  trade: string,
  tone: string
): Promise<{ text: string; hashtags: string[] }> {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    const base64 = Buffer.from(imageBuffer).toString('base64')
    const mediaType = mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

    const toneGuide: Record<string, string> = {
      professional: 'Use a professional, informative tone. Focus on quality, craftsmanship, and reliability.',
      casual: 'Use a friendly, conversational tone. Sound like a real person, not a corporation.',
      bold: 'Use an energetic, bold tone. Be confident and promotional. Use emojis sparingly.',
    }

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
              text: `You write Instagram captions for a ${trade}. Write one for this job photo.

Voice rules — this is critical:
- Write like a real ${trade} texting a buddy about a job they just finished, not like a marketing agency
- Short, plain language. No buzzwords. No "stunning", "transformed", "dream", "premium", "expertise"
- Describe what was actually done and why — materials, challenges, what the customer wanted
- ${toneGuide[tone] ?? toneGuide.professional}
- 1-3 sentences. Shorter is better.
- End with a simple CTA like "DM for a quote" or "Link in bio" — not a sales pitch
- Do NOT start with the business name, Instagram handle, or a greeting
- No emojis unless the tone is "bold"

Return your response in this exact format:
CAPTION: [your caption here]
HASHTAGS: [#tag1 #tag2 #tag3 #tag4 #tag5 #tag6]`,
            },
          ],
        },
      ],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const captionMatch = text.match(/CAPTION:\s*([\s\S]+?)(?=\nHASHTAGS:|\n\n|$)/)
    const hashtagsMatch = text.match(/HASHTAGS:\s*([\s\S]+)/)

    return {
      text: captionMatch?.[1]?.trim() ?? text,
      hashtags: hashtagsMatch?.[1]?.trim().split(/\s+/).filter((h: string) => h.startsWith('#')).slice(0, 6) ?? [],
    }
  } catch (err) {
    console.error('Caption generation error:', err)
    return {
      text: `Another great day on the job! #${trade}`,
      hashtags: [`#${trade}`, '#contractor', '#qualitywork', '#jobsite', '#beforeandafter', '#localservice'],
    }
  }
}
