'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function UploadButton() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const router = useRouter()

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    setProgress({ done: 0, total: files.length })

    let succeeded = 0
    let failed = 0

    for (let i = 0; i < files.length; i++) {
      try {
        const formData = new FormData()
        formData.append('photo', files[i])

        const res = await fetch('/api/posts/upload', {
          method: 'POST',
          body: formData,
        })
        const result = await res.json()

        if (result.post) {
          succeeded++
        } else {
          failed++
        }
      } catch {
        failed++
      }
      setProgress({ done: i + 1, total: files.length })
    }

    if (failed > 0 && succeeded === 0) {
      alert('Upload failed. Please try again.')
    } else if (failed > 0) {
      alert(`${succeeded} photo${succeeded > 1 ? 's' : ''} uploaded. ${failed} failed.`)
    }

    setUploading(false)
    setProgress({ done: 0, total: 0 })
    if (fileRef.current) fileRef.current.value = ''

    if (succeeded > 0) {
      router.push('/dashboard/review')
      router.refresh()
    }
  }

  const label = uploading
    ? `Uploading ${progress.done}/${progress.total}...`
    : 'Upload photos'

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
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
        {label}
      </button>
    </>
  )
}
