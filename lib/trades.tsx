// lib/trades.tsx
// Trade categories and subcategories with icons

import React from 'react'

export type Trade = {
  value: string
  label: string
  icon: React.ReactNode
  subcategories: { value: string; label: string; icon: React.ReactNode }[]
}

export const TRADES: Trade[] = [
  {
    value: 'Barber',
    label: 'Barber',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 3v18M9 3v18M5 12h4"/>
        <circle cx="16" cy="6" r="3"/>
        <path d="M16 9v3M13 15h6M16 15v6"/>
      </svg>
    ),
    subcategories: [
      { value: 'Fades & Tapers', label: 'Fades & Tapers', icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 20l4-16h8l4 16"/><path d="M8 12h8"/></svg>
      )},
      { value: 'Beard & Shave', label: 'Beard & Shave', icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 2C8 2 5 5 5 9v3c0 4 3 8 7 10 4-2 7-6 7-10V9c0-4-3-7-7-7z"/></svg>
      )},
      { value: 'Line-ups', label: 'Line-ups', icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 4h16M4 8h12M4 12h8"/></svg>
      )},
      { value: 'Kids Cuts', label: 'Kids Cuts', icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M8 14c-3 1-4 3-4 5h16c0-2-1-4-4-5"/></svg>
      )},
      { value: 'Hair Design', label: 'Hair Design', icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 2l3 6 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1z"/></svg>
      )},
      { value: 'Color', label: 'Color', icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/></svg>
      )},
    ],
  },
  {
    value: 'Hair Stylist',
    label: 'Hair Stylist',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20l5-16M15 4l5 16"/>
        <path d="M12 4c-2 0-3 2-3 4s1 4 3 4 3-2 3-4-1-4-3-4z"/>
        <path d="M6 16h12"/>
      </svg>
    ),
    subcategories: [
      { value: 'Cut & Style', label: 'Cut & Style', icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/><path d="M12 2l-6 16M12 2l6 16"/></svg>
      )},
      { value: 'Color & Highlights', label: 'Color & Highlights', icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 2v8l4 4v6a4 4 0 0 1-8 0v-6l4-4V2"/></svg>
      )},
      { value: 'Balayage & Ombre', label: 'Balayage & Ombre', icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 4c4 4 4 16 8 16s4-12 8-16"/></svg>
      )},
      { value: 'Extensions', label: 'Extensions', icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M8 2v20M16 2v20M8 8h8M8 14h8"/></svg>
      )},
      { value: 'Braids & Updos', label: 'Braids & Updos', icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 2c-2 3 0 5 0 8s-2 5 0 8 2 3 0 6"/></svg>
      )},
      { value: 'Treatments & Keratin', label: 'Treatments & Keratin', icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z"/></svg>
      )},
    ],
  },
]
