// app/page.tsx
// Public landing page — shown to anyone not logged in

import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3 2h10a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H9l-3 3v-3H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/>
            </svg>
          </div>
          <span className="font-semibold text-gray-900">Posting Agent</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="btn-secondary">Log in</Link>
          <Link href="/auth/signup" className="btn-primary">Get started free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-3xl mx-auto text-center px-8 py-24">
        <span className="inline-block bg-brand-50 text-brand-600 text-xs font-semibold px-3 py-1 rounded-full mb-6">
          Built for contractors
        </span>
        <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
          Post your work.<br />
          <span className="text-brand-600">Automatically.</span>
        </h1>
        <p className="text-xl text-gray-500 mb-10 leading-relaxed">
          Drop finished job photos in a folder. Posting Agent writes the captions
          and publishes to Instagram, Facebook, TikTok, LinkedIn, and X — while
          you're still at the job site.
        </p>
        <Link href="/auth/signup" className="btn-primary text-base px-8 py-3 rounded-xl">
          Start posting for free →
        </Link>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 py-20 px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-12">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Connect your folder',
                desc: 'Link a Google Photos album or iCloud folder. Any new photo you add will be picked up automatically.',
              },
              {
                step: '2',
                title: 'AI writes your caption',
                desc: 'Our AI analyzes the photo and writes a caption tailored to your trade — plumber, electrician, landscaper, and more.',
              },
              {
                step: '3',
                title: 'Posts go live',
                desc: 'In auto mode, posts publish at peak times with no input from you. Or review and approve in the app first.',
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="card text-center">
                <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center font-bold mx-auto mb-4">
                  {step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-10 text-sm text-gray-400">
        © {new Date().getFullYear()} Posting Agent · Beta 1
      </footer>
    </main>
  )
}
