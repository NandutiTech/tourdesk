import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest) {
  try {
    const auth = request.headers.get('Authorization')
    if (!auth?.startsWith('Bearer ')) return NextResponse.json({ user: null })
    
    const token = auth.slice(7)
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false }
    })
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ user: null })

    return NextResponse.json({
      user: { email: user.email, id: user.id },
      access_token: token
    })
  } catch {
    return NextResponse.json({ user: null })
  }
}
