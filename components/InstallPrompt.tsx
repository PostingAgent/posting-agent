'use client'

import { useState, useEffect } from 'react'

export default function InstallPrompt() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Only show on mobile Safari when not already installed as PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    const dismissed = localStorage.getItem('pa-install-dismissed')

    if (isMobile && !isStandalone && !dismissed) {
      setShow(true)
    }
  }, [])

  if (!show) return null

  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)

  return (
    <div className="mx-4 sm:mx-8 mb-4 bg-brand-50 border border-brand-200 rounded-xl p-4 flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
        PA
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-brand-800">Add Posting Agent to your home screen</p>
        <p className="text-xs text-brand-600 mt-1">
          {isIOS
            ? 'Tap the share button below, then "Add to Home Screen"'
            : 'Tap the menu (three dots), then "Add to Home Screen"'
          }
        </p>
      </div>
      <button
        onClick={() => {
          localStorage.setItem('pa-install-dismissed', '1')
          setShow(false)
        }}
        className="text-brand-400 hover:text-brand-600 flex-shrink-0 p-1"
      >
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </button>
    </div>
  )
}
