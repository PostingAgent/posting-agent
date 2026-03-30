// app/api/posts/recaption/route.ts
//
// GET /api/posts/recaption
// Regenerates captions for all pending_review posts using the updated prompt.

import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = await createAdminClient()

  // Get user profile for trade/tone
  const { data: profile } = await admin
    .from('user_profiles')
    .select('trade, caption_tone')
    .eq('id', user.id)
    .single()

  const trade = profile?.trade ?? 'General Contractor'
  const tone = profile?.caption_tone ?? 'professional'

  // Get all pending_review posts
  const { data: posts } = await admin
    .from('posts')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'pending_review')
    .order('created_at', { ascending: false })

  if (!posts || posts.length === 0) {
    return NextResponse.json({ message: 'No pending posts to recaption' })
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  const toneGuide: Record<string, string> = {
    professional: 'Use a professional, informative tone. Focus on quality, craftsmanship, and reliability.',
    casual: 'Use a friendly, conversational tone. Sound like a real person, not a corporation.',
    bold: 'Use an energetic, bold tone. Be confident and promotional. Use emojis sparingly.',
  }

  const results = []

  for (const post of posts) {
    try {
      // Fetch the image and convert to base64
      const imageRes = await fetch(post.image_url)
      const buffer = await imageRes.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      const mediaType = (imageRes.headers.get('content-type') ?? 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
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

Good examples for a contractor:
- "Full bathroom gut and rebuild. Customer wanted modern but warm — went with large format tile and a floating vanity. DM us for a free estimate."
- "New deck build, western red cedar. Took about a week start to finish. Link in bio if you need outdoor work done."
- "Replaced all the knob-and-tube in this 1920s bungalow. Not glamorous but the homeowner can sleep easier now. Hit us up for a quote."

Then on a new line write exactly 6 relevant hashtags starting with #.

Format your response as:
CAPTION: [the caption here]
HASHTAGS: [#tag1 #tag2 #tag3 #tag4 #tag5 #tag6]`,
              },
            ],
          },
        ],
      })

      const text = message.content[0].type === 'text' ? message.content[0].text : ''
      const captionMatch = text.match(/CAPTION:\s*([\s\S]+?)(?=\nHASHTAGS:|$)/)
      const hashtagsMatch = text.match(/HASHTAGS:\s*([\s\S]+)/)

      const newCaption = captionMatch?.[1]?.trim() ?? text.split('\n')[0]
      const hashtagsRaw = hashtagsMatch?.[1]?.trim() ?? ''
      const hashtags = hashtagsRaw
        .split(/\s+/)
        .filter((t: string) => t.startsWith('#'))
        .slice(0, 6)

      // Update the post
      await admin
        .from('posts')
        .update({ caption: newCaption, hashtags })
        .eq('id', post.id)

      results.push({
        id: post.id,
        old_caption: post.caption,
        new_caption: newCaption,
        hashtags,
      })
    } catch (err: any) {
      results.push({ id: post.id, error: err.message })
    }
  }

  return NextResponse.json({ recaptioned: results.length, results })
}
