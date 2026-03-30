// app/dashboard/page.tsx
// Main dashboard — metrics, pending approvals, recent posts

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Post } from '@/types'
import PostNowButton from '@/components/PostNowButton'
import PostActions from '@/components/PostActions'

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

                {/* Platform dots */}
                <div className="flex gap-1 flex-shrink-0">
                  {post.platforms?.map((p: string) => (
                    <span
                      key={p}
                      className="w-5 h-5 rounded-full bg-gray-200 text-gray-500 text-xs flex items-center justify-center uppercase font-bold"
                      title={p}
                    >
                      {p[0]}
                    </span>
                  ))}
                </div>

                {/* Post now button for actionable posts */}
                {(post.status === 'pending_review' || post.status === 'scheduled') && (
                  <PostNowButton postId={post.id} caption={post.caption} />
                )}

                {/* Status badge */}
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${STATUS_STYLES[post.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {post.status.replace('_', ' ')}
                </span>

                {/* Review & delete actions */}
                <PostActions postId={post.id} status={post.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
