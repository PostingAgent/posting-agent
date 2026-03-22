// app/dashboard/connect/page.tsx
// Lets the user connect their Google Photos account and pick an album

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GoogleAlbum } from '@/types'

export default function ConnectPage() {
  const [profile, setProfile] = useState<{
    google_access_token: string | null
    google_folder_id: string | null
    auto_post: boolean
  } | null>(null)
  const [albums, setAlbums] = useState<GoogleAlbum[]>([])
  const [loadingAlbums, setLoadingAlbums] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('user_profiles')
      .select('google_access_token, google_folder_id, auto_post')
      .eq('id', user!.id)
      .single()
    setProfile(data)

    // If already connected, load their albums
    if (data?.google_access_token) {
      fetchAlbums()
    }
  }

  // Redirect user to Google OAuth to grant Photos access
  function connectGoogle() {
    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '',
      redirect_uri: `${window.location.origin}/api/google/callback`,
      response_type: 'code',
      scope: [
        'https://www.googleapis.com/auth/drive.readonly',
        'openid',
        'email',
      ].join(' '),
      access_type: 'offline',
      prompt: 'consent',
    })
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  }

  // Fetch the user's Google Photos albums via our API route
  async function fetchAlbums() {
    setLoadingAlbums(true)
    const res = await fetch('/api/google/albums')
    const data = await res.json()
    setAlbums(data.albums ?? [])
    setLoadingAlbums(false)
  }

  // Save the selected folder + auto_post preference
  async function saveSettings(folderId: string, autoPost: boolean) {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase
      .from('user_profiles')
      .update({ google_folder_id: folderId, auto_post: autoPost })
      .eq('id', user!.id)

    setProfile(prev => prev ? { ...prev, google_folder_id: folderId, auto_post: autoPost } : prev)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Connect your photo folder</h1>
      <p className="text-sm text-gray-500 mb-8">
        Posting Agent watches this folder. Every new photo triggers an AI caption and a post.
      </p>

      {/* Step 1: Connect Google */}
      <div className="card mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Step 1 — Connect Google Photos</h2>
            <p className="text-xs text-gray-500 mt-1">
              We only read your photos — we never modify or delete anything.
            </p>
          </div>
          {profile?.google_access_token ? (
            <span className="text-xs bg-green-50 text-green-700 font-medium px-3 py-1.5 rounded-full">
              Connected ✓
            </span>
          ) : (
            <button onClick={connectGoogle} className="btn-primary flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#fff" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
              </svg>
              Connect Google Photos
            </button>
          )}
        </div>
      </div>

      {/* Step 2: Pick album */}
      {profile?.google_access_token && (
        <div className="card mb-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Step 2 — Pick a folder</h2>
          <p className="text-xs text-gray-500 mb-4">
            Create an album in Google Photos called something like &quot;Job Photos&quot; — then select it here.
            Any photo you add to it will be automatically posted.
          </p>

          {loadingAlbums ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
              Loading your albums...
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {albums.map(album => (
                <button
                  key={album.id}
                  onClick={() => saveSettings(album.id, profile?.auto_post ?? false)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                    profile?.google_folder_id === album.id
                      ? 'border-brand-600 bg-brand-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {album.coverPhotoBaseUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`${album.coverPhotoBaseUrl}=w48-h48-c`}
                      alt={album.title}
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{album.title}</p>
                    <p className="text-xs text-gray-400">{album.mediaItemsCount} photos</p>
                  </div>
                  {profile?.google_folder_id === album.id && (
                    <span className="text-brand-600 text-sm">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Auto-post setting */}
      {profile?.google_folder_id && (
        <div className="card mb-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Step 3 — Posting mode</h2>
          <div className="space-y-3">
            {[
              {
                value: false,
                label: 'Notify mode (recommended)',
                desc: "You'll get a notification to review and approve each post before it goes live.",
              },
              {
                value: true,
                label: 'Auto mode',
                desc: 'Posts go live automatically with no input from you. Best once you trust the AI captions.',
              },
            ].map(option => (
              <label
                key={String(option.value)}
                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                  profile?.auto_post === option.value
                    ? 'border-brand-600 bg-brand-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="auto_post"
                  checked={profile?.auto_post === option.value}
                  onChange={() => saveSettings(profile.google_folder_id!, option.value)}
                  className="mt-0.5 accent-brand-600"
                />
                <div>
                  <p className="text-sm font-medium text-gray-800">{option.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{option.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {saving && <p className="text-sm text-gray-400">Saving...</p>}
      {saved && <p className="text-sm text-green-600 font-medium">Saved ✓</p>}
    </div>
  )
}
