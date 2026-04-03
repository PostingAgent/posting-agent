// app/api/posts/upload-shortcut/route.ts
//
// POST /api/posts/upload-shortcut
// Upload endpoint for iOS Shortcuts. Authenticates via API key
// stored in user_profiles.api_key (instead of browser session).
// Accepts multipart form data with one or more 'photo' fields.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key')
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing API key' }, { status: 401 })
  }

  const admin = await createAdminClient()

  // Look up user by API key
  const { data: profile } = await admin
    .from('user_profiles')
    .select('id, trade, caption_tone, auto_post')
    .eq('api_key', apiKey)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
  }

  const formData = await req.formData()
  const photos = formData.getAll('photo') as File[]

  if (photos.length === 0) {
    return NextResponse.json({ error: 'No photos provided' }, { status: 400 })
  }

  const trade = profile.trade ?? 'General Contractor'
  const tone = profile.caption_tone ?? 'professional'
  const results: { success: boolean; caption?: string }[] = []

  for (const file of photos) {
    try {
      const buffer = await file.arrayBuffer()
      const ext = file.name?.split('.').pop() || 'jpg'
      const fileName = `${profile.id}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`

      const { data: uploadData, error: uploadError } = await admin.storage
        .from('post-images')
        .upload(fileName, buffer, {
          contentType: file.type || 'image/jpeg',
          upsert: false,
        })

      if (uploadError) {
        results.push({ success: false })
        continue
      }

      const { data: { publicUrl } } = admin.storage
        .from('post-images')
        .getPublicUrl(uploadData.path)

      const caption = await generateCaption(buffer, file.type || 'image/jpeg', trade, tone)

      await admin.from('posts').insert({
        user_id: profile.id,
        image_url: publicUrl,
        caption: caption.text,
        hashtags: caption.hashtags,
        platforms: ['instagram', 'facebook'],
        status: profile.auto_post ? 'scheduled' : 'pending_review',
        scheduled_for: profile.auto_post ? new Date(Date.now() + 5 * 60 * 1000).toISOString() : null,
      })

      results.push({ success: true, caption: caption.text })
    } catch {
      results.push({ success: false })
    }
  }

  const succeeded = results.filter(r => r.success).length
  return NextResponse.json({
    uploaded: succeeded,
    failed: results.length - succeeded,
    message: `${succeeded} photo${succeeded !== 1 ? 's' : ''} uploaded and captioned.`,
  })
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
