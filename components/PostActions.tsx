'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function PostActions({ postId, status }: { postId: string; status: string }) {
  const [deleting, setDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('posts').delete().eq('id', postId)
    setShowConfirm(false)
    router.refresh()
  }

  return (
    <div className="flex gap-1.5 flex-shrink-0">
      {(status === 'pending_review' || status === 'scheduled') && (
        <a
          href="/dashboard/review"
          className="text-xs text-brand-600 hover:text-brand-700 font-medium px-2 py-1"
        >
          Review
        </a>
      )}

      {showConfirm ? (
        <div className="flex gap-1">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs text-white bg-red-500 hover:bg-red-600 rounded px-2 py-1 disabled:opacity-50"
          >
            {deleting ? '...' : 'Confirm'}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowConfirm(true)}
          className="text-xs text-red-400 hover:text-red-600 px-2 py-1"
        >
          Delete
        </button>
      )}
    </div>
  )
}
