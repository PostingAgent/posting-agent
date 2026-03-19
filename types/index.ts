// ─── Database row types (mirrors your Supabase tables) ───────────────────────

export type UserProfile = {
  id: string                  // matches auth.users.id
  email: string
  trade: string               // e.g. "plumber", "electrician"
  business_name: string
  caption_tone: 'professional' | 'casual' | 'bold'
  auto_post: boolean          // true = post automatically, false = notify first
  google_access_token: string | null
  google_refresh_token: string | null
  google_folder_id: string | null   // the specific album they picked
  created_at: string
}

export type Post = {
  id: string
  user_id: string
  image_url: string           // stored in Supabase Storage
  caption: string
  hashtags: string[]
  platforms: Platform[]
  status: PostStatus
  scheduled_for: string | null   // ISO date string
  posted_at: string | null
  google_media_id: string | null  // original Google Photos media item ID
  created_at: string
}

export type Platform = 'instagram' | 'facebook' | 'tiktok' | 'linkedin' | 'x'

export type PostStatus =
  | 'pending_review'   // AI generated, waiting for user approval
  | 'approved'         // user approved, waiting to be scheduled
  | 'scheduled'        // queued for posting
  | 'posted'           // successfully published
  | 'failed'           // something went wrong

// ─── API response types ───────────────────────────────────────────────────────

export type GenerateCaptionResponse = {
  caption: string
  hashtags: string[]
}

export type WatchFolderResponse = {
  newPhotosFound: number
  jobsQueued: number
}

// ─── Google Photos types ──────────────────────────────────────────────────────

export type GoogleMediaItem = {
  id: string
  baseUrl: string
  filename: string
  mimeType: string
  mediaMetadata: {
    creationTime: string
    width: string
    height: string
  }
}

export type GoogleAlbum = {
  id: string
  title: string
  productUrl: string
  coverPhotoBaseUrl: string
  mediaItemsCount: string
}
