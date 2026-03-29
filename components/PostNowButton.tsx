'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PostNowButton({ postId, caption }: { postId: string; caption: string }) {
  const [posting, setPosting] = useState(false)
  const router = useRouter()

  async function handlePostNow() {
    setPosting(true)
    try {
      const res = await fetch('/api/posts/publish-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, caption }),
      })
      const result = await res.json()
      if (result.success) {
        router.refresh()
      } else {
        alert('Publishing failed — check your connected accounts and try again.')
      }
    } catch {
      alert('Something went wrong. Please try again.')
    }
    setPosting(false)
  }

  return (
    <button
      onClick={handlePostNow}
      disabled={posting}
      className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50 flex-shrink-0"
    >
      {posting ? 'Posting...' : 'Post now'}
    </button>
  )
}
