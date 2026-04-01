// components/Sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserProfile } from '@/types'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: (
    <svg className="w-4 h-4 sm:w-4 sm:h-4 w-5 h-5" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="1" width="6" height="6" rx="1.5"/>
      <rect x="9" y="1" width="6" height="6" rx="1.5"/>
      <rect x="1" y="9" width="6" height="6" rx="1.5"/>
      <rect x="9" y="9" width="6" height="6" rx="1.5"/>
    </svg>
  )},
  { href: '/dashboard/review', label: 'Review', icon: (
    <svg className="w-4 h-4 sm:w-4 sm:h-4 w-5 h-5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 4h12M2 8h8M2 12h6" strokeLinecap="round"/>
    </svg>
  )},
  { href: '/dashboard/connect', label: 'Connect', icon: (
    <svg className="w-4 h-4 sm:w-4 sm:h-4 w-5 h-5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="4" width="14" height="10" rx="2"/>
      <path d="M1 7h14M5 4V2h6v2" strokeLinecap="round"/>
    </svg>
  )},
  { href: '/dashboard/settings', label: 'Settings', icon: (
    <svg className="w-4 h-4 sm:w-4 sm:h-4 w-5 h-5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="2.5"/>
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2" strokeLinecap="round"/>
    </svg>
  )},
]

export default function Sidebar({ profile }: { profile: Partial<UserProfile> | null }) {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  // Initials from business name
  const initials = (profile?.business_name ?? 'PA')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <>
      {/* Desktop / tablet top bar */}
      <header className="hidden sm:block bg-white border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center h-14 px-5 gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3 2h10a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H9l-3 3v-3H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/>
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-900">Posting Agent</span>
            <span className="text-xs bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded font-medium">
              Beta 1
            </span>
          </div>

          {/* Nav */}
          <nav className="flex items-center gap-1">
            {NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  isActive(item.href)
                    ? 'bg-brand-50 text-brand-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </nav>

          {/* User profile */}
          <div className="ml-auto flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-xs font-semibold flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate">
                {profile?.business_name ?? 'My Business'}
              </p>
              <p className="text-xs text-gray-400 truncate">{profile?.trade ?? ''}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-bottom">
        <div className="flex items-center justify-around h-14 px-2">
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-lg min-w-0 flex-1 transition-colors ${
                isActive(item.href)
                  ? 'text-brand-600'
                  : 'text-gray-400'
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-medium truncate">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  )
}
