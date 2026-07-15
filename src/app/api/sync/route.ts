import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

// Rate limiting: max 60 requests per minute per user
const rateLimitMap = new Map<string, { count: number; reset: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const limit = rateLimitMap.get(userId)
  if (!limit || now > limit.reset) {
    rateLimitMap.set(userId, { count: 1, reset: now + 60000 })
    return true
  }
  if (limit.count >= 60) return false
  limit.count++
  return true
}

// GET — load all user data
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Load all data in parallel
    const [
      artists, tours, meetings, replacements, trips,
      expenses, guests, contacts, managerTours, managerMembers, settings
    ] = await Promise.all([
      supabase.from('artists').select('*').order('name'),
      supabase.from('tours').select('*').order('start_date'),
      supabase.from('meetings').select('*').order('date'),
      supabase.from('replacements').select('*').order('name'),
      supabase.from('trips').select('*').order('out_date'),
      supabase.from('expenses').select('*').order('date', { ascending: false }),
      supabase.from('guests').select('*'),
      supabase.from('contacts').select('*').order('name'),
      supabase.from('manager_tours').select('*').order('created_at'),
      supabase.from('manager_members').select('*'),
      supabase.from('user_settings').select('*').eq('user_id', user.id).single(),
    ])

    return NextResponse.json({
      artists: artists.data || [],
      tours: tours.data || [],
      meetings: meetings.data || [],
      replacements: replacements.data || [],
      trips: trips.data || [],
      expenses: expenses.data || [],
      guests: guests.data || [],
      contacts: contacts.data || [],
      managerTours: managerTours.data || [],
      managerMembers: managerMembers.data || [],
      settings: settings.data || {},
    })
  } catch (err) {
    console.error('Sync GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST — save a specific collection
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting
    if (!checkRateLimit(user.id)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json()
    const { table, action, data, id } = body

    // Whitelist allowed tables
    const allowedTables = [
      'artists', 'tours', 'meetings', 'replacements', 'trips',
      'expenses', 'guests', 'contacts', 'manager_tours', 'manager_members', 'user_settings'
    ]
    if (!allowedTables.includes(table)) {
      return NextResponse.json({ error: 'Invalid table' }, { status: 400 })
    }

    // Always inject user_id
    const record = { ...data, user_id: user.id }

    let result
    if (action === 'upsert') {
      result = await supabase.from(table).upsert(record).select().single()
    } else if (action === 'delete' && id) {
      result = await supabase.from(table).delete().eq('id', id).eq('user_id', user.id)
    } else if (action === 'update' && id) {
      result = await supabase.from(table).update(record).eq('id', id).eq('user_id', user.id).select().single()
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    if (result.error) {
      console.error('DB error:', result.error)
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (err) {
    console.error('Sync POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
