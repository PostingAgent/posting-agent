# PostingAgent

AI-powered social media posting for independent contractors (plumbers, barbers, electricians, stylists, etc.).

## Stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend:** Next.js API routes (serverless on Vercel)
- **Database:** Supabase (PostgreSQL + Auth + Storage)
- **AI:** Claude API (sonnet) for caption generation with vision
- **Social APIs:** Meta Graph API v21.0 (Instagram + Facebook)
- **Hosting:** Vercel with cron jobs

## Commands

- `npm run dev` — local dev server
- `npm run build` — production build (also used to type-check)
- No test suite yet

## Key Directories

```
app/
  dashboard/          — Main app pages (dashboard, review, connect, settings)
  api/
    posts/publish/    — Cron: publishes scheduled posts (every 15 min)
    posts/publish-now/ — Manual instant publish
    posts/recaption-single/ — Regenerate caption with tone override
    watch/            — Cron: checks Google Drive for new photos (every 5 min)
    meta/callback/    — Meta OAuth callback
    google/           — Google OAuth + album listing
  auth/               — Login/signup pages
components/           — Shared React components
lib/
  publish.ts          — Shared IG/FB posting + Meta token refresh
  supabase/           — Supabase client helpers (browser + server)
  trades.tsx          — Trade categories with icons
types/                — TypeScript type definitions
```

## Database

Schema is in `supabase-schema.sql`. Three main tables:
- `user_profiles` — user settings, Google tokens, trade/tone preferences
- `posts` — image_url, caption, hashtags, status, platforms, scheduled_for
- `social_tokens` — OAuth tokens per platform (ig_user_id, page_id, expires_at)

## How It Works

1. User connects Google Photos folder via OAuth
2. User connects Instagram/Facebook via Meta OAuth
3. `watch` cron finds new photos, downloads them, Claude generates captions
4. User reviews/edits in dashboard (tap-to-expand cards, photo filters, tone picker)
5. Posts publish to Instagram & Facebook on schedule or via "Post now"

## Current Status — Beta 1

- Instagram and Facebook posting: live
- TikTok, LinkedIn, X: stubbed for Beta 2 — don't implement yet
- Meta token auto-refresh: implemented in `lib/publish.ts`

## Environment Variables

All secrets are in `.env.local` (never commit). Required:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `META_APP_ID`, `META_APP_SECRET`
- `ANTHROPIC_API_KEY`
- `NEXT_PUBLIC_APP_URL`
- `CRON_SECRET`
