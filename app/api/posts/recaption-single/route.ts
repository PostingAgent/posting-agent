// app/api/posts/recaption-single/route.ts
//
// POST /api/posts/recaption-single
// Regenerates caption for a single post, with optional tone override.

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { postId, tone: toneOverride } = await req.json()
  if (!postId) {
    return NextResponse.json({ error: 'Missing postId' }, { status: 400 })
  }

  const admin = await createAdminClient()

  // Get user profile for trade/tone
  const { data: profile } = await admin
    .from('user_profiles')
    .select('trade, caption_tone')
    .eq('id', user.id)
    .single()

  const trade = profile?.trade ?? 'General Contractor'
  const tone = toneOverride || profile?.caption_tone || 'professional'

  // Get the post
  const { data: post } = await admin
    .from('posts')
    .select('*')
    .eq('id', postId)
    .eq('user_id', user.id)
    .single()

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  const toneGuide: Record<string, string> = {
    professional: 'Use a professional, informative tone. Focus on quality, craftsmanship, and reliability.',
    casual: 'Use a friendly, conversational tone. Sound like a real person, not a corporation.',
    bold: 'Use an energetic, bold tone. Be confident and promotional. Use emojis sparingly.',
  }

  try {
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

    return NextResponse.json({ caption: newCaption, hashtags })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
