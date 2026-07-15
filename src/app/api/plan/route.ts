import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function getUserFromToken(token: string) {
  const { data: { user } } = await adminClient.auth.getUser(token)
  return user
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ plan: 'solo' })
    }
    const token = authHeader.slice(7)
    const user = await getUserFromToken(token)
    if (!user) return NextResponse.json({ plan: 'solo' })

    // Check free_access table
    const { data } = await adminClient
      .from('free_access')
      .select('plan, expires_at')
      .eq('email', user.email)
      .single()

    if (data) {
      // Check if expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return NextResponse.json({ plan: 'solo', expired: true })
      }
      return NextResponse.json({ 
        plan: data.plan || 'pro',
        expires_at: data.expires_at
      })
    }

    return NextResponse.json({ plan: 'solo' })
  } catch (err) {
    return NextResponse.json({ plan: 'solo' })
  }
}
