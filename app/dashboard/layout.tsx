// app/dashboard/layout.tsx
// Wraps all dashboard pages with the sidebar + topbar shell

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Double-check auth — middleware already does this but safety first
  if (!user) redirect('/auth/login')

  // Load the user's profile so we can show their name/trade in the sidebar
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-y-auto pb-16 sm:pb-0">
        {children}
      </main>
    </div>
  )
}
