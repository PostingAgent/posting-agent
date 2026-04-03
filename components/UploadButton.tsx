'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function UploadButton() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const router = useRouter()

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('photo', file)

      const res = await fetch('/api/posts/upload', {
        method: 'POST',
        body: formData,
      })
      const result = await res.json()

      if (result.post) {
        router.push('/dashboard/review')
        router.refresh()
      } else {
        alert(result.error || 'Upload failed. Please try again.')
      }
    } catch {
      alert('Something went wrong. Please try again.')
    }
    setUploading(false)
    // Reset input so the same file can be selected again
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleUpload}
        className="hidden"
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="btn-primary disabled:opacity-50 flex items-center gap-2"
      >
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M8 3v10M3 8h10" />
        </svg>
        {uploading ? 'Uploading...' : 'Upload photo'}
      </button>
    </>
  )
}
