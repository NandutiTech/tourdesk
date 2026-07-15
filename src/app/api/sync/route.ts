import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function getUserFromRequest(request: NextRequest) {
  // Try Bearer token first (from HTML app)
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: { getAll: () => [], setAll: () => {} },
      global: { headers: { Authorization: `Bearer ${token}` } }
    })
    const { data: { user } } = await supabase.auth.getUser(token)
    if (user) return { user, supabase }
  }

  // Try cookies (from Next.js pages)
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        )
      },
    },
  })
  const { data: { user } } = await supabase.auth.getUser()
  return { user, supabase }
}

// GET — load all user data
export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: settings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (settings?.data_blob) {
      return NextResponse.json({ ...settings.data_blob, _cloudLoaded: true })
    }

    return NextResponse.json({ _cloudLoaded: true })
  } catch (err) {
    console.error('Sync GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST — save all data
export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { action, data } = body

    if (action === 'saveAll') {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          data_blob: data,
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('Save error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    console.error('Sync POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
