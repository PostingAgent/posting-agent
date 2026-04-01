// app/dashboard/review/page.tsx
// Shows all posts from the last 30 days with regenerate caption, tone picker, and photo filters

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Post, Platform, PostStatus } from '@/types'

const PLATFORM_COLORS: Record<Platform, string> = {
  instagram: 'bg-pink-500',
  facebook:  'bg-blue-600',
  tiktok:    'bg-black',
  linkedin:  'bg-blue-700',
  x:         'bg-gray-900',
}

const STATUS_LABELS: Record<PostStatus, { label: string; color: string }> = {
  pending_review: { label: 'Pending review', color: 'bg-yellow-100 text-yellow-700' },
  approved:       { label: 'Approved',       color: 'bg-blue-100 text-blue-700' },
  scheduled:      { label: 'Scheduled',      color: 'bg-purple-100 text-purple-700' },
  posted:         { label: 'Posted',         color: 'bg-green-100 text-green-700' },
  failed:         { label: 'Failed',         color: 'bg-red-100 text-red-700' },
}

const TONES = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'bold', label: 'Bold' },
]

const PHOTO_FILTERS = [
  { value: 'none', label: 'Original', css: '' },
  { value: 'bw', label: 'B&W', css: 'grayscale(100%)' },
  { value: 'warm', label: 'Warm', css: 'sepia(30%) saturate(120%) brightness(105%)' },
  { value: 'cool', label: 'Cool', css: 'saturate(80%) hue-rotate(15deg) brightness(105%)' },
  { value: 'vivid', label: 'Vivid', css: 'saturate(150%) contrast(110%)' },
  { value: 'fade', label: 'Fade', css: 'contrast(90%) brightness(110%) saturate(80%)' },
]

type FilterStatus = PostStatus

export default function ReviewPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [posting, setPosting] = useState<string | null>(null)
  const [regenerating, setRegenerating] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterStatus>('pending_review')
  const [postTones, setPostTones] = useState<Record<string, string>>({})
  const [postFilters, setPostFilters] = useState<Record<string, string>>({})
  const [activeOverlay, setActiveOverlay] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadPosts()
  }, [])

  async function loadPosts() {
    const { data: { user } } = await supabase.auth.getUser()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', user!.id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })

    setPosts(data ?? [])
    setLoading(false)
  }

  const filteredPosts = posts.filter(p => p.status === filter)

  function updateCaption(postId: string, newCaption: string) {
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, caption: newCaption } : p
    ))
  }

  // Regenerate AI caption for a single post with optional tone override
  async function regenerateCaption(post: Post) {
    setRegenerating(post.id)
    try {
      const tone = postTones[post.id] // undefined = use profile default
      const res = await fetch('/api/posts/recaption-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, ...(tone && { tone }) }),
      })
      const result = await res.json()
      if (result.caption) {
        setPosts(prev => prev.map(p =>
          p.id === post.id
            ? { ...p, caption: result.caption, hashtags: result.hashtags ?? p.hashtags }
            : p
        ))
      }
    } catch {
      alert('Failed to regenerate caption. Try again.')
    }
    setRegenerating(null)
  }

  async function approvePost(post: Post) {
    setSaving(post.id)
    const { error } = await supabase
      .from('posts')
      .update({
        caption: post.caption,
        status: 'scheduled',
        scheduled_for: getDefaultScheduleTime(),
      })
      .eq('id', post.id)

    if (!error) {
      setPosts(prev => prev.map(p =>
        p.id === post.id ? { ...p, status: 'scheduled' as PostStatus } : p
      ))
    }
    setSaving(null)
  }

  async function postNow(post: Post) {
    setPosting(post.id)
    try {
      const res = await fetch('/api/posts/publish-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, caption: post.caption }),
      })
      const result = await res.json()
      if (result.success) {
        setPosts(prev => prev.map(p =>
          p.id === post.id ? { ...p, status: 'posted' as PostStatus } : p
        ))
      } else {
        alert('Publishing failed — check your connected accounts and try again.')
      }
    } catch {
      alert('Something went wrong. Please try again.')
    }
    setPosting(null)
  }

  async function rejectPost(postId: string) {
    setSaving(postId)
    await supabase.from('posts').delete().eq('id', postId)
    setPosts(prev => prev.filter(p => p.id !== postId))
    setSaving(null)
  }

  function getDefaultScheduleTime() {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9, 0, 0, 0)
    return tomorrow.toISOString()
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Review posts</h1>
            <p className="text-sm text-gray-500">All posts from the last 30 days.</p>
          </div>
          <button
            onClick={async () => {
              setChecking(true)
              await fetch('/api/watch')
              window.location.reload()
            }}
            disabled={checking}
            className="btn-primary"
          >
            {checking ? 'Checking...' : 'Check for new photos'}
          </button>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {(['pending_review', 'posted', 'approved', 'scheduled', 'failed'] as FilterStatus[]).map(status => {
            const count = posts.filter(p => p.status === status).length
            if (count === 0) return null
            const label = STATUS_LABELS[status].label
            return (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                  filter === status
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {filteredPosts.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-gray-400 text-sm">No posts to show.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredPosts.map(post => {
            const activeFilter = postFilters[post.id] ?? 'none'
            const filterCss = PHOTO_FILTERS.find(f => f.value === activeFilter)?.css ?? ''
            const isActionable = post.status === 'pending_review' || post.status === 'approved' || post.status === 'scheduled'

            return (
              <div key={post.id} className="card">
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
                  {/* Photo with tap/hover overlay */}
                  <div className="flex-shrink-0">
                    <div
                      className="relative w-full sm:w-40 h-48 sm:h-40 rounded-xl bg-gray-100 overflow-hidden cursor-pointer"
                      onClick={() => isActionable && setActiveOverlay(activeOverlay === post.id ? null : post.id)}
                    >
                      {post.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={post.image_url}
                          alt="job photo"
                          className="w-full h-full object-cover"
                          style={filterCss ? { filter: filterCss } : undefined}
                        />
                      )}

                      {/* Tap/click overlay with actions */}
                      {isActionable && activeOverlay === post.id && (
                        <div
                          className="absolute inset-0 bg-black/70 flex flex-col justify-between p-3"
                          onClick={e => e.stopPropagation()}
                        >
                          {/* Filters row */}
                          <div>
                            <p className="text-[10px] text-white/70 font-medium mb-1.5 uppercase tracking-wider">Filter</p>
                            <div className="flex gap-1 flex-wrap">
                              {PHOTO_FILTERS.map(f => (
                                <button
                                  key={f.value}
                                  onClick={() => setPostFilters(prev => ({ ...prev, [post.id]: f.value }))}
                                  className={`text-[10px] px-2 py-1 rounded-md transition-colors ${
                                    activeFilter === f.value
                                      ? 'bg-white text-gray-900'
                                      : 'bg-white/20 text-white hover:bg-white/30'
                                  }`}
                                >
                                  {f.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Regenerate + tone */}
                          <div>
                            <select
                              value={postTones[post.id] ?? ''}
                              onChange={e => setPostTones(prev => ({ ...prev, [post.id]: e.target.value }))}
                              className="w-full text-[11px] bg-white/20 text-white border-0 rounded-md px-2 py-1.5 mb-1.5 focus:outline-none focus:ring-1 focus:ring-white/50"
                            >
                              <option value="" className="text-gray-900">Default tone</option>
                              {TONES.map(t => (
                                <option key={t.value} value={t.value} className="text-gray-900">{t.label}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => regenerateCaption(post)}
                              disabled={regenerating === post.id}
                              className="w-full text-[11px] font-medium bg-white text-gray-900 rounded-md py-1.5 hover:bg-gray-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                            >
                              <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M2 8a6 6 0 0 1 10.3-4.2M14 8a6 6 0 0 1-10.3 4.2" strokeLinecap="round"/>
                                <path d="M12 1v3.5h-3.5M4 15v-3.5h3.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              {regenerating === post.id ? 'Regenerating...' : 'Regenerate'}
                            </button>
                          </div>

                          {/* Close button */}
                          <button
                            onClick={() => setActiveOverlay(null)}
                            className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40 transition-colors"
                          >
                            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M2 2l8 8M10 2l-8 8"/>
                            </svg>
                          </button>
                        </div>
                      )}

                      {/* Tap hint icon */}
                      {isActionable && activeOverlay !== post.id && (
                        <div className="absolute bottom-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-black/40 text-white">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                            <circle cx="8" cy="8" r="2"/>
                            <path d="M8 2v2M8 12v2M2 8h2M12 8h2"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Caption editor + controls */}
                  <div className="flex-1 min-w-0">
                    {/* Status + platform badges */}
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_LABELS[post.status].color}`}>
                        {STATUS_LABELS[post.status].label}
                      </span>
                      {post.platforms?.map((p: Platform) => (
                        <span
                          key={p}
                          className={`${PLATFORM_COLORS[p]} text-white text-xs px-2 py-0.5 rounded-full capitalize`}
                        >
                          {p}
                        </span>
                      ))}
                      <span className="text-xs text-gray-400 ml-auto">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Caption */}
                    {post.status === 'posted' || post.status === 'failed' ? (
                      <p className="text-sm text-gray-800 bg-gray-50 rounded-lg p-3 leading-relaxed">
                        {post.caption}
                      </p>
                    ) : (
                      <textarea
                        className="w-full text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-brand-400 leading-relaxed"
                        rows={4}
                        value={post.caption}
                        onChange={e => updateCaption(post.id, e.target.value)}
                      />
                    )}

                    {/* Hashtags */}
                    {post.hashtags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {post.hashtags.map((tag: string) => (
                          <span
                            key={tag}
                            className="text-xs bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}


                    {/* Action buttons */}
                    {isActionable && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        <button
                          onClick={() => postNow(post)}
                          disabled={posting === post.id || saving === post.id}
                          className="btn-primary disabled:opacity-50"
                        >
                          {posting === post.id ? 'Posting...' : 'Post now'}
                        </button>
                        {post.status === 'pending_review' && (
                          <button
                            onClick={() => approvePost(post)}
                            disabled={saving === post.id || posting === post.id}
                            className="btn-secondary disabled:opacity-50"
                          >
                            {saving === post.id ? 'Saving...' : 'Schedule for later'}
                          </button>
                        )}
                        <button
                          onClick={() => rejectPost(post.id)}
                          disabled={saving === post.id || posting === post.id}
                          className="btn-secondary disabled:opacity-50"
                        >
                          Discard
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
