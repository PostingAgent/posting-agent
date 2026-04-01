// app/auth/signup/page.tsx
// New user registration — collects trade info during signup

'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { TRADES } from '@/lib/trades'

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    email: '',
    password: '',
    businessName: '',
    trade: '',
    subcategory: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function update(field: string, value: string) {
    setForm(prev => ({
      ...prev,
      [field]: value,
      // Reset subcategory when trade changes
      ...(field === 'trade' ? { subcategory: '' } : {}),
    }))
  }

  const selectedTrade = TRADES.find(t => t.value === form.trade)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          business_name: form.businessName,
          trade: form.trade,
        },
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (authData.user) {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          email: form.email,
          business_name: form.businessName,
          trade: form.trade,
          caption_tone: 'professional',
          auto_post: false,
        })

      if (profileError) {
        setError(profileError.message)
        setLoading(false)
        return
      }
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3 2h10a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H9l-3 3v-3H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/>
            </svg>
          </div>
          <span className="font-semibold text-gray-900">Posting Agent</span>
        </div>

        <div className="card">
          <h1 className="text-lg font-semibold text-gray-900 mb-1">Create your account</h1>
          <p className="text-sm text-gray-500 mb-6">Free during Beta 1</p>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business name</label>
              <input
                className="input"
                placeholder="Jake's Barbershop"
                value={form.businessName}
                onChange={e => update('businessName', e.target.value)}
                required
              />
            </div>

            {/* Trade selection with icons */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Your trade</label>
              <div className="grid grid-cols-2 gap-3">
                {TRADES.map(trade => (
                  <button
                    key={trade.value}
                    type="button"
                    onClick={() => update('trade', trade.value)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
                      form.trade === trade.value
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
                <div className="grid grid-cols-2 gap-2">
                  {selectedTrade.subcategories.map(sub => (
                    <button
                      key={sub.value}
                      type="button"
                      onClick={() => update('subcategory', sub.value)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-colors ${
                        form.subcategory === sub.value
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => update('email', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                className="input"
                placeholder="At least 8 characters"
                value={form.password}
                onChange={e => update('password', e.target.value)}
                minLength={8}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !form.trade}
              className="btn-primary w-full py-2.5 disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-brand-600 font-medium hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  )
}
