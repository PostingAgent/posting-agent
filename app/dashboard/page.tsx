// app/dashboard/page.tsx
// Main dashboard — metrics, pending approvals, recent posts

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Post } from '@/types'
import PostNowButton from '@/components/PostNowButton'

const PLATFORM_ICONS: Record<string, JSX.Element> = {
  instagram: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  ),
  facebook: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  ),
}

// Helper: format a date string into "Mar 19 · 9:00 AM"
function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

// Status badge colors
const STATUS_STYLES: Record<string, string> = {
  pending_review: 'bg-amber-50 text-amber-700',
  approved:       'bg-blue-50 text-blue-700',
  scheduled:      'bg-brand-50 text-brand-600',
  posted:         'bg-green-50 text-green-700',
  failed:         'bg-red-50 text-red-700',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Load all posts for this user
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const allPosts: Post[] = posts ?? []

  // Calculate quick stats
  const thisMonth = new Date()
  thisMonth.setDate(1)
  const postedThisMonth = allPosts.filter(
    p => p.status === 'posted' && new Date(p.created_at) >= thisMonth
  ).length
  const pendingReview = allPosts.filter(p => p.status === 'pending_review').length
  const scheduled = allPosts.filter(p => p.status === 'scheduled').length

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Your posting activity at a glance</p>
        </div>
        <Link href="/dashboard/connect" className="btn-primary">
          + Connect folder
        </Link>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Posted this month</p>
          <p className="text-3xl font-bold text-gray-900">{postedThisMonth}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Pending your review</p>
          <p className="text-3xl font-bold text-amber-600">{pendingReview}</p>
          {pendingReview > 0 && (
            <Link href="/dashboard/review" className="text-xs text-brand-600 font-medium mt-1 block hover:underline">
              Review now →
            </Link>
          )}
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Scheduled</p>
          <p className="text-3xl font-bold text-brand-600">{scheduled}</p>
        </div>
      </div>

      {/* Pending review banner — only shows if there are posts to approve */}
      {pendingReview > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-amber-800">
              {pendingReview} post{pendingReview > 1 ? 's' : ''} waiting for your approval
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Posting Agent detected new photos and wrote captions for them
            </p>
          </div>
          <Link href="/dashboard/review" className="btn-primary text-xs px-4 py-2">
            Review & approve
          </Link>
        </div>
      )}

      {/* Recent posts table */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Recent posts</h2>

        {allPosts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm mb-4">No posts yet.</p>
            <Link href="/dashboard/connect" className="btn-primary">
              Connect your photo folder to get started
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {allPosts.map(post => (
              <div
                key={post.id}
                className="flex items-center gap-4 py-3 border-b border-gray-50 last:border-0"
              >
                {/* Thumbnail */}
                <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                  {post.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.image_url}
                      alt="post"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                {/* Caption preview */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">{post.caption}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {post.scheduled_for
                      ? `Scheduled: ${formatDate(post.scheduled_for)}`
                      : formatDate(post.created_at)
                    }
                  </p>
                </div>

                {/* Post now button for actionable posts */}
                {(post.status === 'pending_review' || post.status === 'scheduled') && (
                  <PostNowButton postId={post.id} caption={post.caption} />
                )}

                {/* Status badge + platform icons below */}
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLES[post.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {post.status.replace('_', ' ')}
                  </span>
                  <div className="flex gap-1.5">
                    {post.platforms?.map((p: string) => (
                      <span
                        key={p}
                        className={`${p === 'instagram' ? 'text-pink-500' : p === 'facebook' ? 'text-blue-600' : 'text-gray-400'}`}
                        title={p}
                      >
                        {PLATFORM_ICONS[p] ?? (
                          <span className="w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-[10px] flex items-center justify-center uppercase font-bold">
                            {p[0]}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Review action (no delete) */}
                {(post.status === 'pending_review' || post.status === 'scheduled') && (
                  <a
                    href="/dashboard/review"
                    className="text-xs text-brand-600 hover:text-brand-700 font-medium px-2 py-1 flex-shrink-0"
                  >
                    Review
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
