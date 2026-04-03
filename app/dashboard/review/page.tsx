// app/dashboard/review/page.tsx
// Shows all posts from the last 30 days with regenerate caption, tone picker, and photo filters

'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Post, Platform, PostStatus } from '@/types'
import UploadButton from '@/components/UploadButton'

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
  const [filter, setFilter] = useState<FilterStatus>('posted')
  const [postTones, setPostTones] = useState<Record<string, string>>({})
  const [postFilters, setPostFilters] = useState<Record<string, string>>({})
  const [selectedPost, setSelectedPost] = useState<string | null>(null)
  const [tonePickerOpen, setTonePickerOpen] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(20)

  const supabase = createClient()
  const tonePickerRef = useRef<HTMLDivElement>(null)

  // Close tone picker on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (tonePickerOpen && tonePickerRef.current && !tonePickerRef.current.contains(e.target as Node)) {
        setTonePickerOpen(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [tonePickerOpen])

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

  const allFiltered = posts.filter(p => p.status === filter)
  const filteredPosts = allFiltered.slice(0, filter === 'posted' ? visibleCount : 5)

  function updateCaption(postId: string, newCaption: string) {
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, caption: newCaption } : p
    ))
  }

  // Regenerate AI caption for a single post with optional tone override
  async function regenerateCaption(post: Post, toneOverride?: string) {
    setRegenerating(post.id)
    try {
      const tone = toneOverride || postTones[post.id] // undefined = use profile default
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
        alert(`Post failed: ${result.error || 'Check that your Instagram/Facebook is connected.'}`)
        setPosts(prev => prev.map(p =>
          p.id === post.id ? { ...p, status: 'failed' as PostStatus } : p
        ))
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

  // Save edits to an existing post (caption, hashtags)
  async function saveEdits(post: Post) {
    setSaving(post.id)
    await supabase
      .from('posts')
      .update({ caption: post.caption })
      .eq('id', post.id)
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
            <p className="text-sm text-gray-500">Select to edit</p>
          </div>
          <div className="flex gap-2">
            <UploadButton />
            <button
              onClick={async () => {
                setChecking(true)
                await fetch('/api/watch')
                window.location.reload()
              }}
              disabled={checking}
              className="btn-secondary"
            >
              {checking ? 'Checking...' : 'Check for new photos'}
            </button>
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {(['posted', 'pending_review', 'approved', 'scheduled', 'failed'] as FilterStatus[]).map(status => {
            const count = posts.filter(p => p.status === status).length
            if (count === 0 && status !== 'pending_review' && status !== 'failed') return null
            const label = STATUS_LABELS[status].label
            return (
              <button
                key={status}
                onClick={() => { setFilter(status); setVisibleCount(20); setSelectedPost(null) }}
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
        <div className="space-y-2">
          {filteredPosts.map((post) => {
            const isSelected = selectedPost === post.id
            const activeFilter = postFilters[post.id] ?? 'none'
            const filterCss = PHOTO_FILTERS.find(f => f.value === activeFilter)?.css ?? ''
            const isActionable = post.status === 'pending_review' || post.status === 'approved' || post.status === 'scheduled'

            return (
              <div key={post.id} className="card">
                {/* Compact row — always visible */}
                <div
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => setSelectedPost(isSelected ? null : post.id)}
                >
                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                    {post.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.image_url}
                        alt="job photo"
                        className="w-full h-full object-cover"
                        style={filterCss ? { filter: filterCss } : undefined}
                      />
                    )}
                  </div>

                  {/* Caption preview */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{post.caption}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(post.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Status badge */}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_LABELS[post.status].color}`}>
                    {STATUS_LABELS[post.status].label}
                  </span>

                  {/* Expand arrow */}
                  <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isSelected ? 'rotate-180' : ''}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M4 6l4 4 4-4"/>
                  </svg>
                </div>

                {/* Expanded edit view */}
                {isSelected && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
                      {/* Large photo + filters */}
                      <div className="flex-shrink-0">
                        <div className="w-full sm:w-48 h-48 rounded-xl bg-gray-100 overflow-hidden">
                          {post.image_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={post.image_url}
                              alt="job photo"
                              className="w-full h-full object-cover"
                              style={filterCss ? { filter: filterCss } : undefined}
                            />
                          )}
                        </div>

                        {/* Photo filters */}
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {PHOTO_FILTERS.map(f => (
                            <button
                              key={f.value}
                              onClick={() => setPostFilters(prev => ({ ...prev, [post.id]: f.value }))}
                              className={`text-[10px] px-2 py-1 rounded-md transition-colors ${
                                activeFilter === f.value
                                  ? 'bg-brand-600 text-white'
                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                              }`}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Caption + controls */}
                      <div className="flex-1 min-w-0">
                        {/* Platform badges */}
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          {post.platforms?.map((p: Platform) => (
                            <span
                              key={p}
                              className={`${PLATFORM_COLORS[p]} text-white text-xs px-2 py-0.5 rounded-full capitalize`}
                            >
                              {p}
                            </span>
                          ))}
                        </div>

                        {/* Caption — always editable */}
                        <textarea
                          className="w-full text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-brand-400 leading-relaxed"
                          rows={4}
                          value={post.caption}
                          onChange={e => updateCaption(post.id, e.target.value)}
                        />

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

                        {/* Regenerate caption — opens tone picker */}
                        <div className="relative mt-3" ref={tonePickerOpen === post.id ? tonePickerRef : undefined}>
                          {regenerating === post.id ? (
                            <button disabled className="btn-secondary text-xs opacity-50 flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M2 8a6 6 0 0 1 10.3-4.2M14 8a6 6 0 0 1-10.3 4.2" strokeLinecap="round"/>
                                <path d="M12 1v3.5h-3.5M4 15v-3.5h3.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              Regenerating...
                            </button>
                          ) : (
                            <button
                              onClick={() => setTonePickerOpen(tonePickerOpen === post.id ? null : post.id)}
                              className="btn-secondary text-xs flex items-center gap-1.5"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M2 8a6 6 0 0 1 10.3-4.2M14 8a6 6 0 0 1-10.3 4.2" strokeLinecap="round"/>
                                <path d="M12 1v3.5h-3.5M4 15v-3.5h3.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              Regenerate caption
                            </button>
                          )}

                          {tonePickerOpen === post.id && regenerating !== post.id && (
                            <div className="absolute left-0 bottom-full mb-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-2 min-w-[200px]">
                              <p className="text-[10px] text-gray-400 uppercase tracking-wide px-2 py-1">Pick a style</p>
                              {TONES.map(t => (
                                <button
                                  key={t.value}
                                  onClick={() => {
                                    setPostTones(prev => ({ ...prev, [post.id]: t.value }))
                                    setTonePickerOpen(null)
                                    regenerateCaption(post, t.value)
                                  }}
                                  className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700"
                                >
                                  {t.label}
                                </button>
                              ))}
                              <div className="border-t border-gray-100 mt-1 pt-1">
                                <button
                                  onClick={() => {
                                    setTonePickerOpen(null)
                                    updateCaption(post.id, '')
                                  }}
                                  className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700"
                                >
                                  Write your own
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-2 mt-4">
                          {isActionable ? (
                            <>
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
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => saveEdits(post)}
                                disabled={saving === post.id}
                                className="btn-primary disabled:opacity-50"
                              >
                                {saving === post.id ? 'Saving...' : 'Save changes'}
                              </button>
                              <button
                                onClick={() => postNow(post)}
                                disabled={posting === post.id || saving === post.id}
                                className="btn-secondary disabled:opacity-50"
                              >
                                {posting === post.id ? 'Reposting...' : 'Repost'}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Load more button for posted tab */}
      {filter === 'posted' && allFiltered.length > visibleCount && (
        <button
          onClick={() => setVisibleCount(prev => prev + 20)}
          className="w-full mt-4 py-3 text-sm text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
        >
          Load more ({allFiltered.length - visibleCount} remaining)
        </button>
      )}
    </div>
  )
}
