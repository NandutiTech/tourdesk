import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const admin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function getUser(request: NextRequest) {
  // Try Bearer token
  const auth = request.headers.get('Authorization')
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice(7)
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false }
    })
    const { data: { user } } = await supabase.auth.getUser(token)
    if (user) return user
  }

  // Try to find any valid user via cookie tokens
  const cookieHeader = request.headers.get('cookie') || ''
  for (const cookie of cookieHeader.split(';')) {
    const eqIdx = cookie.indexOf('=')
    if (eqIdx === -1) continue
    const name = cookie.slice(0, eqIdx).trim()
    if (!name.startsWith('sb-')) continue
    try {
      const val = decodeURIComponent(cookie.slice(eqIdx + 1))
      const parsed = JSON.parse(val)
      const token = parsed?.access_token || parsed?.[0]?.access_token
      if (token) {
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { autoRefreshToken: false, persistSession: false }
        })
        const { data: { user } } = await supabase.auth.getUser(token)
        if (user) return user
      }
    } catch(e) {}
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request)
    
    // For now, allow unauthenticated requests to not break existing users
    // TODO: enforce auth once all users are properly authenticated
    if (!user) {
      console.warn('Claude API called without valid auth')
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: { message: 'API key not configured' } }, { status: 500 })

    const body = await request.json()
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(body),
    })

    const text = await response.text()
    try {
      return NextResponse.json(JSON.parse(text), { status: response.status })
    } catch {
      return NextResponse.json({ error: { message: 'Anthropic error' } }, { status: 500 })
    }
  } catch (err) {
    return NextResponse.json({ error: { message: String(err) } }, { status: 500 })
  }
}
