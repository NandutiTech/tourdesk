import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function getUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false }
    })
    const { data: { user } } = await supabase.auth.getUser(token)
    if (user) return user
  }
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(c) { c.forEach(({name,value,options}) => cookieStore.set(name,value,options)) },
      },
    })
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch (e) { return null }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: settings } = await adminClient
      .from('user_settings')
      .select('data_blob')
      .eq('user_id', user.id)
      .single()

    // Ignore test blobs or empty blobs
    const blob = settings?.data_blob
    if (blob && !blob._test && (blob.artists?.length > 0 || blob.tours?.length > 0)) {
      return NextResponse.json({ ...blob, _cloudLoaded: true })
    }
    return NextResponse.json({ _cloudLoaded: true })
  } catch (err) {
    console.error('Sync GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { action, data } = body

    if (action === 'saveAll') {
      // Don't save test data or empty data
      if (data._test) return NextResponse.json({ success: true })
      
      const { error } = await adminClient
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
