import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  const { data: { user } } = await adminClient.auth.getUser(token)
  if (!user) return null
  const { data } = await adminClient.from('admins').select('email').eq('email', user.email).single()
  return data ? user : null
}

// GET — list all free access users
export async function GET(request: NextRequest) {
  const user = await verifyAdmin(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await adminClient.from('free_access').select('*').order('created_at', { ascending: false })
  return NextResponse.json({ users: data || [] })
}

// POST — add or update free access
export async function POST(request: NextRequest) {
  const user = await verifyAdmin(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email, plan, months, note } = await request.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  let expires_at = null
  if (months && months > 0) {
    const d = new Date()
    d.setMonth(d.getMonth() + months)
    expires_at = d.toISOString()
  }

  const { error } = await adminClient.from('free_access').upsert({
    email: email.toLowerCase().trim(),
    plan: plan || 'pro',
    expires_at,
    note: note || ''
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE — remove free access
export async function DELETE(request: NextRequest) {
  const user = await verifyAdmin(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email } = await request.json()
  await adminClient.from('free_access').delete().eq('email', email)
  return NextResponse.json({ success: true })
}
