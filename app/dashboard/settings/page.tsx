// app/dashboard/settings/page.tsx
// User profile settings — trade, subcategory, tone, business name

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserProfile } from '@/types'
import { TRADES } from '@/lib/trades'

export default function SettingsPage() {
  const [profile, setProfile] = useState<Partial<UserProfile & { subcategory: string }>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [generatingKey, setGeneratingKey] = useState(false)
  const [keyCopied, setKeyCopied] = useState(false)

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
      if (data?.api_key) setApiKey(data.api_key)
      setLoading(false)
    }
    load()
  }, [])

  function update(field: string, value: string | boolean) {
    setProfile(prev => ({ ...prev, [field]: value }))
  }

  const selectedTrade = TRADES.find(t => t.value === profile.trade)

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
    <div className="p-4 sm:p-8 max-w-2xl mx-auto">
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
            placeholder="Jake's Barbershop"
          />
        </div>

        {/* Trade selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Your trade</label>
          <div className="grid grid-cols-2 gap-3">
            {TRADES.map(trade => (
              <button
                key={trade.value}
                type="button"
                onClick={() => update('trade', trade.value)}
                className={`flex items-center gap-3 p-4 rounded-xl border transition-colors text-left ${
                  profile.trade === trade.value
                    ? 'border-brand-600 bg-brand-50 text-brand-600'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="flex-shrink-0">{trade.icon}</div>
                <span className="text-sm font-medium">{trade.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Subcategories */}
        {selectedTrade && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Specialty</label>
            <p className="text-xs text-gray-400 mb-3">
              Helps the AI focus captions on what you do most.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {selectedTrade.subcategories.map(sub => (
                <button
                  key={sub.value}
                  type="button"
                  onClick={() => update('subcategory', sub.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                    profile.subcategory === sub.value
                      ? 'border-brand-600 bg-brand-50 text-brand-600'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  <div className="flex-shrink-0">{sub.icon}</div>
                  <span className="text-xs font-medium">{sub.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Caption tone</label>
          <div className="space-y-2">
            {[
              { value: 'professional', label: 'Professional', example: '"Clean fade, sharp line-up. Book your next appointment — link in bio."' },
              { value: 'casual',       label: 'Casual & friendly', example: '"Got my man looking fresh for the weekend. Who\'s next? 💪"' },
              { value: 'bold',         label: 'Bold & promotional', example: '"ANOTHER banger fade. The chair stays hot. Book NOW before we\'re full. 🔥"' },
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

      {/* iOS Shortcut */}
      <div className="card mb-6">
        <h2 className="text-sm font-semibold text-gray-800 mb-1">iPhone Shortcut</h2>
        <p className="text-xs text-gray-500 mb-4">
          Upload photos to Posting Agent straight from your iPhone share sheet — including shared albums.
        </p>

        {apiKey ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-600 truncate">
                {apiKey}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(apiKey)
                  setKeyCopied(true)
                  setTimeout(() => setKeyCopied(false), 2000)
                }}
                className="btn-secondary text-xs flex-shrink-0"
              >
                {keyCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="bg-brand-50 border border-brand-100 rounded-xl p-4">
              <p className="text-sm font-medium text-brand-700 mb-2">Setup instructions</p>
              <ol className="text-xs text-brand-600 space-y-1.5 list-decimal list-inside">
                <li>Open the <strong>Shortcuts</strong> app on your iPhone</li>
                <li>Tap <strong>+</strong> to create a new shortcut</li>
                <li>Add action: <strong>Select Photos</strong> (enable &quot;Select Multiple&quot;)</li>
                <li>Add action: <strong>Get Contents of URL</strong></li>
                <li>Set URL to: <code className="bg-brand-100 px-1 rounded">{typeof window !== 'undefined' ? window.location.origin : ''}/api/posts/upload-shortcut</code></li>
                <li>Method: <strong>POST</strong></li>
                <li>Add header: <code className="bg-brand-100 px-1 rounded">x-api-key</code> → paste your API key above</li>
                <li>Request body: <strong>Form</strong> → add field <code className="bg-brand-100 px-1 rounded">photo</code> (type: File) → set to <strong>Selected Photos</strong></li>
                <li>Name it &quot;Post to PA&quot; and add to your home screen or share sheet</li>
              </ol>
            </div>
            <button
              onClick={async () => {
                setGeneratingKey(true)
                const res = await fetch('/api/generate-api-key', { method: 'POST' })
                const data = await res.json()
                if (data.apiKey) setApiKey(data.apiKey)
                setGeneratingKey(false)
              }}
              disabled={generatingKey}
              className="text-xs text-red-500 hover:text-red-600"
            >
              Regenerate key (invalidates old one)
            </button>
          </div>
        ) : (
          <button
            onClick={async () => {
              setGeneratingKey(true)
              const res = await fetch('/api/generate-api-key', { method: 'POST' })
              const data = await res.json()
              if (data.apiKey) setApiKey(data.apiKey)
              setGeneratingKey(false)
            }}
            disabled={generatingKey}
            className="btn-primary disabled:opacity-50"
          >
            {generatingKey ? 'Generating...' : 'Generate API key'}
          </button>
        )}
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
