import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!user || !session) {
      return NextResponse.json({ user: null })
    }

    return NextResponse.json({
      user: { email: user.email, id: user.id },
      access_token: session.access_token
    })
  } catch (err) {
    return NextResponse.json({ user: null })
  }
}
