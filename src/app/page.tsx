import { createServerSupabaseClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'

export default async function Home() {
  // If already logged in, go straight to app
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/app-shell')

  // Otherwise serve the landing page
  redirect('/landing')
}
