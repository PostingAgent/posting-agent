// app/api/generate-caption/route.ts
//
// POST /api/generate-caption
// Body: { imageUrl: string, trade: string, tone: string }
// Returns: { caption: string, hashtags: string[] }
//
// This is called automatically by the folder watcher when a new photo appears.

import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// Fetch an image from a URL and convert it to base64
// (Claude API needs images as base64, not URLs)
async function imageUrlToBase64(url: string): Promise<{ base64: string; mediaType: string }> {
  const response = await fetch(url)
  const buffer = await response.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  const mediaType = response.headers.get('content-type') ?? 'image/jpeg'
  return { base64, mediaType }
}

export async function POST(request: NextRequest) {
  try {
    // Verify the user is logged in
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { imageUrl, trade, tone } = await request.json()

    if (!imageUrl || !trade) {
      return NextResponse.json({ error: 'imageUrl and trade are required' }, { status: 400 })
    }

    // Convert image to base64 so Claude can see it
    const { base64, mediaType } = await imageUrlToBase64(imageUrl)

    // Build the tone instruction
    const toneGuide = {
      professional: 'Use a professional, informative tone. Focus on quality, craftsmanship, and reliability.',
      casual: 'Use a friendly, conversational tone. Sound like a real person, not a corporation.',
      bold: 'Use an energetic, bold tone. Be confident and promotional. Use emojis sparingly.',
    }[tone as string] ?? 'Use a professional tone.'

    // Send to Claude with the image
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: base64,
              },
            },
            {
              type: 'text',
              text: `You write Instagram captions for a ${trade}. Write one for this job photo.

Voice rules — this is critical:
- Write like a real ${trade} texting a buddy about a job they just finished, not like a marketing agency
- Short, plain language. No buzzwords. No "stunning", "transformed", "dream", "premium", "expertise"
- Describe what was actually done and why — materials, challenges, what the customer wanted
- ${toneGuide}
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

    // Parse Claude's response
    const text = message.content[0].type === 'text' ? message.content[0].text : ''

    const captionMatch = text.match(/CAPTION:\s*([\s\S]+?)(?=\nHASHTAGS:|$)/)
    const hashtagsMatch = text.match(/HASHTAGS:\s*([\s\S]+)/)

    const caption = captionMatch?.[1]?.trim() ?? text.split('\n')[0]
    const hashtagsRaw = hashtagsMatch?.[1]?.trim() ?? ''
    const hashtags = hashtagsRaw
      .split(/\s+/)
      .filter((t: string) => t.startsWith('#'))
      .slice(0, 6)

    return NextResponse.json({ caption, hashtags })

  } catch (error) {
    console.error('Caption generation error:', error)
    return NextResponse.json({ error: 'Failed to generate caption' }, { status: 500 })
  }
}
