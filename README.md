# Posting Agent — Beta 1

Automated social media posting for independent contractors.
Drop a photo → AI writes the caption → posts to Instagram, Facebook, TikTok, LinkedIn & X.

---

## What's in Beta 1

- User signup / login (Supabase Auth)
- Google Photos folder connection
- AI caption generation (Claude API)
- Post review & approval dashboard
- Auto-post or notify mode
- Instagram + Facebook publishing (Meta Graph API)
- Cron-based folder watcher (every 5 min)
- Cron-based post publisher (every 15 min)

---

## Setup — follow these steps in order

### Step 1 — Prerequisites

Make sure you have:
- Node.js 20+ installed → https://nodejs.org
- A code editor (VS Code recommended) → https://code.visualstudio.com

### Step 2 — Install dependencies

```bash
cd posting-agent
npm install
```

### Step 3 — Create a Supabase project

1. Go to https://supabase.com and sign up (free)
2. Click "New project", give it a name, pick a region near you
3. Once created, go to **SQL Editor** → paste the entire contents of `supabase-schema.sql` → click Run
4. Go to **Settings → API** and copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key

### Step 4 — Get an Anthropic API key

1. Go to https://console.anthropic.com
2. Create an account and go to API Keys
3. Create a new key and copy it

### Step 5 — Set up Google OAuth

1. Go to https://console.cloud.google.com
2. Create a new project called "Posting Agent"
3. Go to **APIs & Services → Library** → enable "Photos Library API"
4. Go to **APIs & Services → Credentials** → Create OAuth 2.0 Client ID
5. Application type: Web application
6. Authorized redirect URIs: `http://localhost:3000/api/google/callback`
7. Copy your Client ID and Client Secret

### Step 6 — Configure environment variables

```bash
cp .env.local.example .env.local
```

Then open `.env.local` and fill in all the values from the steps above.

### Step 7 — Run the app locally

```bash
npm run dev
```

Open http://localhost:3000 — you should see the landing page.

---

## Deploy to Vercel (go live)

1. Push this folder to a GitHub repo
2. Go to https://vercel.com → Import project → select your repo
3. Add all your environment variables from `.env.local` in Vercel's dashboard
4. Add your production URL to Google OAuth's allowed redirect URIs:
   `https://your-app.vercel.app/api/google/callback`
5. Deploy — Vercel will automatically run the cron jobs

---

## How the automation works

1. Every 5 minutes, `/api/watch` runs and checks each user's Google Photos folder for new images
2. New images are downloaded and stored in Supabase Storage
3. Each image is sent to Claude with a prompt tailored to the user's trade + tone
4. Claude returns a caption + 6 hashtags
5. A post record is created in the database:
   - **Notify mode**: status = `pending_review` → user gets prompted to approve in the app
   - **Auto mode**: status = `scheduled` → goes straight to the publisher
6. Every 15 minutes, `/api/posts/publish` runs and posts anything that's scheduled and due
7. Posts are published to Instagram and Facebook via the Meta Graph API

---

## Beta 2 roadmap

- [ ] LinkedIn posting
- [ ] TikTok posting
- [ ] X (Twitter) posting
- [ ] iCloud Photos support
- [ ] Smart scheduling (post at peak times per platform)
- [ ] Stripe payments / subscription tiers
- [ ] Email notifications when new posts are ready
- [ ] Analytics (reach, engagement per post)
