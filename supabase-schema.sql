-- ============================================================
-- POSTING AGENT — Beta 1 Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================


-- ── 1. User profiles ──────────────────────────────────────
-- Extends Supabase's built-in auth.users table
-- One row per user

create table public.user_profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  email                text not null,
  business_name        text default '',
  trade                text default 'General Contractor',
  caption_tone         text default 'professional'
                         check (caption_tone in ('professional', 'casual', 'bold')),
  auto_post            boolean default false,
  google_access_token  text,
  google_refresh_token text,
  google_folder_id     text,
  api_key              text unique,   -- API key for iOS Shortcut uploads
  created_at           timestamptz default now()
);

-- Row Level Security: users can only see/edit their own profile
alter table public.user_profiles enable row level security;

create policy "Users can view own profile"
  on public.user_profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.user_profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.user_profiles for insert
  with check (auth.uid() = id);


-- ── 2. Posts ──────────────────────────────────────────────
-- One row per social post (image + caption + status)

create table public.posts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.user_profiles(id) on delete cascade,
  image_url        text not null,
  caption          text not null default '',
  hashtags         text[] default '{}',
  platforms        text[] default '{}',
  status           text not null default 'pending_review'
                     check (status in ('pending_review', 'approved', 'scheduled', 'posted', 'failed')),
  scheduled_for    timestamptz,
  posted_at        timestamptz,
  google_media_id  text unique,   -- prevents processing same photo twice
  created_at       timestamptz default now()
);

-- Index for fast queries by user + status
create index posts_user_status on public.posts(user_id, status);
create index posts_scheduled on public.posts(status, scheduled_for)
  where status = 'scheduled';

-- RLS: users can only see their own posts
alter table public.posts enable row level security;

create policy "Users can view own posts"
  on public.posts for select
  using (auth.uid() = user_id);

create policy "Users can update own posts"
  on public.posts for update
  using (auth.uid() = user_id);

create policy "Users can insert own posts"
  on public.posts for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own posts"
  on public.posts for delete
  using (auth.uid() = user_id);


-- ── 3. Social tokens ──────────────────────────────────────
-- Stores platform OAuth tokens (Instagram, Facebook, etc.)
-- One row per user per platform

create table public.social_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.user_profiles(id) on delete cascade,
  platform     text not null
                 check (platform in ('instagram', 'facebook', 'tiktok', 'linkedin', 'x')),
  access_token text not null,
  refresh_token text,
  expires_at   timestamptz,
  ig_user_id   text,            -- Instagram business account ID
  page_id      text,            -- Facebook page ID
  created_at   timestamptz default now(),
  unique (user_id, platform)
);

alter table public.social_tokens enable row level security;

create policy "Users can manage own tokens"
  on public.social_tokens for all
  using (auth.uid() = user_id);


-- ── 4. Storage bucket ─────────────────────────────────────
-- Public bucket to store uploaded job photos
-- (Run this separately or create via Supabase dashboard)

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict do nothing;

create policy "Anyone can view post images"
  on storage.objects for select
  using (bucket_id = 'post-images');

create policy "Authenticated users can upload"
  on storage.objects for insert
  with check (bucket_id = 'post-images' and auth.role() = 'authenticated');

create policy "Users can delete own images"
  on storage.objects for delete
  using (bucket_id = 'post-images' and auth.uid()::text = (storage.foldername(name))[1]);


-- ── 5. Auto-create profile on signup ──────────────────────
-- When a new user signs up via Supabase Auth, automatically
-- create a row in user_profiles using their metadata

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, email, business_name, trade)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'business_name', ''),
    coalesce(new.raw_user_meta_data->>'trade', 'General Contractor')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
