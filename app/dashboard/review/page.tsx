// app/dashboard/review/page.tsx
// Shows all posts with status "pending_review" so user can approve or edit them

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Post, Platform } from '@/types'

const PLATFORM_COLORS: Record<Platform, string> = {
  instagram: 'bg-pink-500',
  facebook:  'bg-blue-600',
  tiktok:    'bg-black',
  linkedin:  'bg-blue-700',
  x:         'bg-gray-900',
}

export default function ReviewPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)  // post id being saved
  const [posting, setPosting] = useState<string | null>(null)  // post id being published now

  const supabase = createClient()

  useEffect(() => {
    loadPendingPosts()
  }, [])

  async function loadPendingPosts() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', user!.id)
      .eq('status', 'pending_review')
      .order('created_at', { ascending: false })

    setPosts(data ?? [])
    setLoading(false)
  }

  // Update caption locally as user types
  function updateCaption(postId: string, newCaption: string) {
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, caption: newCaption } : p
    ))
  }

  // Approve post — sets status to "scheduled"
  async function approvePost(post: Post) {
    setSaving(post.id)
    const { error } = await supabase
      .from('posts')
      .update({
        caption: post.caption,
        status: 'scheduled',
        // Schedule for tomorrow at 9am by default
        scheduled_for: getDefaultScheduleTime(),
      })
      .eq('id', post.id)

    if (!error) {
      setPosts(prev => prev.filter(p => p.id !== post.id))
    }
    setSaving(null)
  }

  // Post now — immediately publishes to all platforms
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
        setPosts(prev => prev.filter(p => p.id !== post.id))
      } else {
        alert('Publishing failed — check your connected accounts and try again.')
      }
    } catch {
      alert('Something went wrong. Please try again.')
    }
    setPosting(null)
  }

  // Reject post — deletes it
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
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Review posts</h1>
        <p className="text-sm text-gray-500 mt-1">
          Posting Agent wrote these captions from your new photos. Edit anything, then approve.
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-gray-400 text-sm">All caught up — no posts waiting for review.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map(post => (
            <div key={post.id} className="card">
              <div className="flex gap-5">
                {/* Photo */}
                <div className="w-32 h-32 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                  {post.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.image_url}
                      alt="job photo"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                {/* Caption editor + controls */}
                <div className="flex-1 min-w-0">
                  {/* Platform badges */}
                  <div className="flex gap-1.5 mb-3">
                    {post.platforms?.map((p: Platform) => (
                      <span
                        key={p}
                        className={`${PLATFORM_COLORS[p]} text-white text-xs px-2 py-0.5 rounded-full capitalize`}
                      >
                        {p}
                      </span>
                    ))}
                  </div>

                  {/* Editable caption */}
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

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => postNow(post)}
                      disabled={posting === post.id || saving === post.id}
                      className="btn-primary disabled:opacity-50"
                    >
                      {posting === post.id ? 'Posting...' : 'Post now'}
                    </button>
                    <button
                      onClick={() => approvePost(post)}
                      disabled={saving === post.id || posting === post.id}
                      className="btn-secondary disabled:opacity-50"
                    >
                      {saving === post.id ? 'Saving...' : 'Schedule for later'}
                    </button>
                    <button
                      onClick={() => rejectPost(post.id)}
                      disabled={saving === post.id || posting === post.id}
                      className="btn-secondary disabled:opacity-50"
                    >
                      Discard
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
