import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function makeId() { return Math.random().toString(36).slice(2, 18) + Math.random().toString(36).slice(2, 8) }

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'No token' }, { status: 400 })

  const { data: show } = await admin.from('tour_shows').select('*').eq('share_token', token).single()
  if (!show) return NextResponse.json({ error: 'Show not found' }, { status: 404 })

  const [tourRes, membersRes, ticketsRes, guestsRes, messagesRes, docsRes] = await Promise.all([
    admin.from('manager_tours').select('id, name').eq('id', show.tour_id).single(),
    admin.from('tour_members').select('id, name, role').eq('tour_id', show.tour_id),
    admin.from('tour_member_tickets').select('id, member_id, direction, ticket_name, ticket_mime, info').eq('show_id', show.id),
    admin.from('tour_member_guests').select('*').eq('show_id', show.id).order('created_at'),
    admin.from('tour_show_messages').select('*').eq('show_id', show.id).order('created_at'),
    admin.from('tour_show_documents').select('id, name, mime').eq('show_id', show.id),
  ])

  // Don't expose ticket_data in list — only on demand
  return NextResponse.json({
    show: {
      id: show.id, date: show.date, venue: show.venue, city: show.city, notes: show.notes,
      hotel: show.hotel, hotel_notes: show.hotel_notes, hotel_addr: show.hotel_addr,
      transfers: show.transfers, meals: show.meals, planning: show.planning, technique: show.technique,
    },
    tour: tourRes.data,
    members: membersRes.data || [],
    tickets: ticketsRes.data || [],
    guests: guestsRes.data || [],
    messages: messagesRes.data || [],
    docs: docsRes.data || [],
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action, token } = body

  if (!token) return NextResponse.json({ error: 'No token' }, { status: 400 })

  // Verify show exists
  const { data: show } = await admin.from('tour_shows').select('id, tour_id').eq('share_token', token).single()
  if (!show) return NextResponse.json({ error: 'Show not found' }, { status: 404 })

  if (action === 'send_message') {
    const id = makeId()
    await admin.from('tour_show_messages').insert({
      id, show_id: show.id, tour_id: show.tour_id,
      sender_name: body.senderName || 'Guest',
      is_manager: false, message: body.message
    })
    return NextResponse.json({ ok: true })
  }

  if (action === 'add_guest') {
    const id = makeId()
    await admin.from('tour_member_guests').insert({
      id, show_id: show.id, tour_id: show.tour_id,
      member_id: body.memberId || null,
      name: body.name, count: body.count || 1,
      status: 'confirmed', notes: ''
    })
    return NextResponse.json({ ok: true })
  }

  if (action === 'get_document') {
    const { data } = await admin.from('tour_show_documents').select('data, name, mime').eq('id', body.docId).eq('show_id', show.id).single()
    return NextResponse.json(data || {})
  }

  if (action === 'get_ticket') {
    const { data } = await admin.from('tour_member_tickets').select('ticket_data, ticket_name, ticket_mime').eq('id', body.ticketId).eq('show_id', show.id).single()
    return NextResponse.json(data || {})
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
