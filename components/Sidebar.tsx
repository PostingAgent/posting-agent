// components/Sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserProfile } from '@/types'

const NAV = [
  {
    label: 'Main',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: (
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
          <rect x="1" y="1" width="6" height="6" rx="1.5"/>
          <rect x="9" y="1" width="6" height="6" rx="1.5"/>
          <rect x="1" y="9" width="6" height="6" rx="1.5"/>
          <rect x="9" y="9" width="6" height="6" rx="1.5"/>
        </svg>
      )},
      { href: '/dashboard/review', label: 'Review posts', icon: (
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 4h12M2 8h8M2 12h6" strokeLinecap="round"/>
        </svg>
      )},
      { href: '/dashboard/connect', label: 'Connect folder', icon: (
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="1" y="4" width="14" height="10" rx="2"/>
          <path d="M1 7h14M5 4V2h6v2" strokeLinecap="round"/>
        </svg>
      )},
    ],
  },
  {
    label: 'Account',
    items: [
      { href: '/dashboard/settings', label: 'Settings', icon: (
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="8" cy="8" r="2.5"/>
          <path d="M8 1v2M8 13v2M1 8h2M13 8h2" strokeLinecap="round"/>
        </svg>
      )},
    ],
  },
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
    <aside className="w-56 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col py-5">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 pb-6">
        <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-white" viewBox="0 0 16 16" fill="currentColor">
            <path d="M3 2h10a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H9l-3 3v-3H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/>
          </svg>
        </div>
        <span className="text-sm font-semibold text-gray-900">Posting Agent</span>
        <span className="text-xs bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded font-medium ml-auto">
          Beta 1
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-5">
        {NAV.map(section => (
          <div key={section.label}>
            <p className="text-xs text-gray-400 font-medium px-2 mb-1 uppercase tracking-wider">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive(item.href)
                      ? 'bg-brand-50 text-brand-600 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User profile at bottom */}
      <div className="px-3 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2.5 px-2 py-2">
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
    </aside>
  )
}
