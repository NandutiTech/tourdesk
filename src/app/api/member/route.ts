import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getUser(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data } = await admin.auth.getUser(token)
  return data.user || null
}

// GET — load all tours where user is invited
export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Find invites by email or user_id
  const { data: invites } = await admin.from('tour_invites')
    .select('*')
    .or(`email.eq.${user.email},user_id.eq.${user.id}`)

  if (!invites?.length) return NextResponse.json({ invites: [], tours: [], tickets: [], guests: [], expenses: [], messages: [] })

  // Mark accepted
  for (const inv of invites) {
    if (inv.status === 'pending' && (inv.email === user.email || inv.user_id === user.id)) {
      await admin.from('tour_invites').update({ status: 'accepted', user_id: user.id }).eq('id', inv.id)
    }
  }

  const tourIds = [...new Set(invites.map((i: any) => i.tour_id))]

  const [tickets, guests, expenses, messages] = await Promise.all([
    admin.from('tour_member_tickets').select('*').in('tour_id', tourIds).eq('member_email', user.email),
    admin.from('tour_member_guests').select('*').in('tour_id', tourIds).eq('user_id', user.id),
    admin.from('tour_member_expenses').select('*').in('tour_id', tourIds).eq('user_id', user.id),
    admin.from('tour_messages').select('*').in('tour_id', tourIds).order('created_at'),
  ])

  return NextResponse.json({
    invites,
    tickets: tickets.data || [],
    guests: guests.data || [],
    expenses: expenses.data || [],
    messages: messages.data || []
  })
}

// POST — member actions (add guest, add expense, send message)
export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action } = body

  // Verify member is invited to this tour
  const { data: invite } = await admin.from('tour_invites')
    .select('id').eq('tour_id', body.tourId)
    .or(`email.eq.${user.email},user_id.eq.${user.id}`)
    .single()

  if (!invite) return NextResponse.json({ error: 'Not invited to this tour' }, { status: 403 })

  if (action === 'add_guest') {
    const { tourId, name, contact, count, notes } = body
    const id = Math.random().toString(36).slice(2, 18)
    await admin.from('tour_member_guests').insert({
      id, tour_id: tourId, user_id: user.id,
      name, contact, count: count || 1, notes, status: 'confirmed'
    })
    return NextResponse.json({ ok: true })
  }

  if (action === 'update_guest_status') {
    const { guestId, status } = body
    await admin.from('tour_member_guests').update({ status }).eq('id', guestId).eq('user_id', user.id)
    return NextResponse.json({ ok: true })
  }

  if (action === 'delete_guest') {
    await admin.from('tour_member_guests').delete().eq('id', body.guestId).eq('user_id', user.id)
    return NextResponse.json({ ok: true })
  }

  if (action === 'add_expense') {
    const { tourId, date, amount, category, description, receiptData, receiptName, receiptMime } = body
    const id = Math.random().toString(36).slice(2, 18)
    await admin.from('tour_member_expenses').insert({
      id, tour_id: tourId, user_id: user.id,
      date, amount, category, description,
      receipt_data: receiptData, receipt_name: receiptName, receipt_mime: receiptMime
    })
    return NextResponse.json({ ok: true })
  }

  if (action === 'delete_expense') {
    await admin.from('tour_member_expenses').delete().eq('id', body.expenseId).eq('user_id', user.id)
    return NextResponse.json({ ok: true })
  }

  if (action === 'send_message') {
    const { tourId, message } = body
    const id = Math.random().toString(36).slice(2, 18)
    const name = user.email?.split('@')[0] || 'Member'
    await admin.from('tour_messages').insert({
      id, tour_id: tourId, user_id: user.id,
      user_name: name, is_manager: false, message
    })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
