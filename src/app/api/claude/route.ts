import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function getUser(request: NextRequest) {
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice(7)
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false }
  })
  const { data: { user } } = await supabase.auth.getUser(token)
  return user
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })

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
