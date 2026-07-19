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

function makeToken() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
}
function makeId() {
  return Math.random().toString(36).slice(2, 18)
}

// GET — load all manager data for a tour
export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tourId = new URL(req.url).searchParams.get('tourId')

  const query = admin.from('tour_members').select('*').eq('manager_id', user.id)
  if (tourId) query.eq('tour_id', tourId)

  const { data: members } = await query.order('created_at')
  if (!members?.length) return NextResponse.json({ members: [], tickets: [], expenses: [], guests: [], messages: [] })

  const memberIds = members.map((m: any) => m.id)

  const [tickets, expenses, guests, messages] = await Promise.all([
    admin.from('tour_member_tickets').select('*').in('member_id', memberIds),
    admin.from('tour_member_expenses').select('*').in('member_id', memberIds).order('created_at'),
    admin.from('tour_member_guests').select('*').in('member_id', memberIds).order('created_at'),
    admin.from('tour_member_messages').select('*').in('member_id', memberIds).order('created_at'),
  ])

  return NextResponse.json({
    members,
    tickets: tickets.data || [],
    expenses: expenses.data || [],
    guests: guests.data || [],
    messages: messages.data || [],
  })
}

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action } = body

  // Add member
  if (action === 'add_member') {
    const { tourId, name, role, hotel, room, hotelAddr, notes, email } = body
    const id = makeId()
    const token = makeToken()
    await admin.from('tour_members').insert({
      id, tour_id: tourId, manager_id: user.id,
      name, role, hotel, room, hotel_addr: hotelAddr, notes, email: email?.toLowerCase() || null,
      invite_token: token
    })
    return NextResponse.json({ ok: true, id, token })
  }

  // Update member
  if (action === 'update_member') {
    const { memberId, name, role, hotel, room, hotelAddr, notes, email } = body
    await admin.from('tour_members').update({
      name, role, hotel, room, hotel_addr: hotelAddr, notes, email: email?.toLowerCase() || null
    }).eq('id', memberId).eq('manager_id', user.id)
    return NextResponse.json({ ok: true })
  }

  // Delete member
  if (action === 'delete_member') {
    await admin.from('tour_members').delete().eq('id', body.memberId).eq('manager_id', user.id)
    return NextResponse.json({ ok: true })
  }

  // Upload ticket for member
  if (action === 'upload_ticket') {
    const { memberId, direction, ticketData, ticketName, ticketMime, info } = body
    // Verify member belongs to this manager
    const { data: m } = await admin.from('tour_members').select('id').eq('id', memberId).eq('manager_id', user.id).single()
    if (!m) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const id = makeId()
    await admin.from('tour_member_tickets').insert({
      id, member_id: memberId, direction, ticket_data: ticketData, ticket_name: ticketName, ticket_mime: ticketMime, info
    })
    return NextResponse.json({ ok: true })
  }

  // Delete ticket
  if (action === 'delete_ticket') {
    await admin.from('tour_member_tickets').delete().eq('id', body.ticketId)
    return NextResponse.json({ ok: true })
  }

  // Send message to member
  if (action === 'send_message') {
    const { memberId, message } = body
    const { data: m } = await admin.from('tour_members').select('id').eq('id', memberId).eq('manager_id', user.id).single()
    if (!m) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const id = makeId()
    await admin.from('tour_member_messages').insert({
      id, member_id: memberId, tour_id: body.tourId, from_manager: true, message
    })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
