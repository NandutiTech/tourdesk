import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error && data.session) {
        const token = data.session.access_token
        const email = data.user?.email || ''
        return NextResponse.redirect(
          `${origin}/auth/set-session?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
        )
      }
    } catch(e) {
      console.error('Callback error:', e)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login`)
}
