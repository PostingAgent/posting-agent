// app/dashboard/settings/page.tsx
// User profile settings — trade, tone, business name

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserProfile } from '@/types'

const TRADES = [
  'General Contractor', 'Electrician', 'Plumber', 'HVAC Technician',
  'Landscaper', 'Painter', 'Roofer', 'Carpenter', 'Mason / Concrete',
  'Barber', 'Hair Stylist', 'Other',
]

export default function SettingsPage() {
  const [profile, setProfile] = useState<Partial<UserProfile>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user!.id)
        .single()
      setProfile(data ?? {})
      setLoading(false)
    }
    load()
  }, [])

  function update(field: string, value: string | boolean) {
    setProfile(prev => ({ ...prev, [field]: value }))
  }

  async function save() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase
      .from('user_profiles')
      .update({
        business_name: profile.business_name,
        trade: profile.trade,
        caption_tone: profile.caption_tone,
      })
      .eq('id', user!.id)

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (loading) return (
    <div className="p-8 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
      <p className="text-sm text-gray-500 mb-8">
        This info helps the AI write better captions for your trade.
      </p>

      <div className="card mb-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Business name</label>
          <input
            className="input"
            value={profile.business_name ?? ''}
            onChange={e => update('business_name', e.target.value)}
            placeholder="Jake's Contracting LLC"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Your trade</label>
          <select
            className="input"
            value={profile.trade ?? ''}
            onChange={e => update('trade', e.target.value)}
          >
            {TRADES.map(t => <option key={t}>{t}</option>)}
          </select>
          <p className="text-xs text-gray-400 mt-1">
            Used to tailor captions — a plumber&apos;s captions sound different from a landscaper&apos;s.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Caption tone</label>
          <div className="space-y-2">
            {[
              { value: 'professional', label: 'Professional', example: '"Completed a full electrical panel upgrade — 200A service, up to code."' },
              { value: 'casual',       label: 'Casual & friendly', example: '"Got this panel swap done today — came out clean! 💪"' },
              { value: 'bold',         label: 'Bold & promotional', example: '"BOOM. Another panel upgrade done. Call us. We get it done RIGHT. 🔥"' },
            ].map(opt => (
              <label
                key={opt.value}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  profile.caption_tone === opt.value
                    ? 'border-brand-600 bg-brand-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="tone"
                  checked={profile.caption_tone === opt.value}
                  onChange={() => update('caption_tone', opt.value)}
                  className="mt-1 accent-brand-600"
                />
                <div>
                  <p className="text-sm font-medium text-gray-800">{opt.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5 italic">{opt.example}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={save}
            disabled={saving}
            className="btn-primary disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save settings'}
          </button>
          {saved && <span className="ml-3 text-sm text-green-600 font-medium">Saved ✓</span>}
        </div>
      </div>

      {/* Sign out */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-800 mb-1">Account</h2>
        <p className="text-xs text-gray-500 mb-4">{profile.email}</p>
        <button
          onClick={signOut}
          className="btn-secondary text-red-600 border-red-200 hover:bg-red-50"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
