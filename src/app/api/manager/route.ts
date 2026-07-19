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

function makeId() {
  return Math.random().toString(36).slice(2, 18) + Math.random().toString(36).slice(2, 8)
}

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const tourId = url.searchParams.get('tourId')
  const showId = url.searchParams.get('showId')
  const memberId = url.searchParams.get('memberId')

  // Load all tours
  const { data: tours } = await admin.from('manager_tours').select('*').eq('user_id', user.id).order('created_at')

  if (!tourId) return NextResponse.json({ tours: tours || [] })

  // Load shows for tour
  const { data: shows } = await admin.from('tour_shows').select('*').eq('tour_id', tourId).eq('manager_id', user.id).order('date')

  // Load members for tour
  const { data: members } = await admin.from('tour_members').select('*').eq('tour_id', tourId).eq('manager_id', user.id).order('created_at')

  if (!showId) return NextResponse.json({ tours: tours || [], shows: shows || [], members: members || [] })

  // Load show-member details (hotel per show per member)
  const { data: showMembers } = await admin.from('tour_show_members').select('*').eq('show_id', showId)

  // Load tickets for this show
  const { data: tickets } = await admin.from('tour_member_tickets').select('*').eq('show_id', showId).eq('tour_id', tourId)

  if (!memberId) return NextResponse.json({ tours: tours || [], shows: shows || [], members: members || [], showMembers: showMembers || [], tickets: tickets || [] })

  // Load member detail for specific show
  const { data: memberTickets } = await admin.from('tour_member_tickets').select('*').eq('show_id', showId).eq('member_id', memberId)

  // Load messages, guests, expenses for member
  const [msgs, gsts, exps] = await Promise.all([
    admin.from('tour_member_messages').select('*').eq('show_id', showId).eq('member_id', memberId).order('created_at'),
    admin.from('tour_member_guests').select('*').eq('show_id', showId).eq('member_id', memberId).order('created_at'),
    admin.from('tour_member_expenses').select('*').eq('show_id', showId).eq('member_id', memberId).order('created_at'),
  ])

  return NextResponse.json({
    tours: tours || [], shows: shows || [], members: members || [],
    showMembers: showMembers || [], tickets: tickets || [],
    memberTickets: memberTickets || [],
    messages: msgs.data || [],
    guests: gsts.data || [],
    expenses: exps.data || [],
  })
}

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action } = body

  // ─── Tours ───────────────────────────────────────────────────────────────
  if (action === 'create_tour') {
    const id = makeId()
    await admin.from('manager_tours').insert({ id, user_id: user.id, name: body.name, notes: body.notes || '' })
    return NextResponse.json({ ok: true, id })
  }

  if (action === 'update_tour') {
    await admin.from('manager_tours').update({ name: body.name, notes: body.notes || '' }).eq('id', body.tourId).eq('user_id', user.id)
    return NextResponse.json({ ok: true })
  }

  if (action === 'delete_tour') {
    await admin.from('manager_tours').delete().eq('id', body.tourId).eq('user_id', user.id)
    await admin.from('tour_shows').delete().eq('tour_id', body.tourId).eq('manager_id', user.id)
    await admin.from('tour_members').delete().eq('tour_id', body.tourId).eq('manager_id', user.id)
    await admin.from('tour_member_tickets').delete().eq('tour_id', body.tourId)
    return NextResponse.json({ ok: true })
  }

  // ─── Shows ───────────────────────────────────────────────────────────────
  if (action === 'add_show') {
    const id = makeId()
    await admin.from('tour_shows').insert({ id, tour_id: body.tourId, manager_id: user.id, date: body.date, venue: body.venue, city: body.city, notes: body.notes || '' })
    return NextResponse.json({ ok: true, id })
  }

  if (action === 'add_shows_bulk') {
    const rows = body.shows.map((s: any) => ({ id: makeId(), tour_id: body.tourId, manager_id: user.id, ...s }))
    await admin.from('tour_shows').insert(rows)
    return NextResponse.json({ ok: true, count: rows.length })
  }

  if (action === 'update_show') {
    await admin.from('tour_shows').update({ date: body.date, venue: body.venue, city: body.city, notes: body.notes || '' }).eq('id', body.showId).eq('manager_id', user.id)
    return NextResponse.json({ ok: true })
  }

  if (action === 'delete_show') {
    await admin.from('tour_shows').delete().eq('id', body.showId).eq('manager_id', user.id)
    await admin.from('tour_member_tickets').delete().eq('show_id', body.showId)
    await admin.from('tour_show_members').delete().eq('show_id', body.showId)
    return NextResponse.json({ ok: true })
  }

  // ─── Members ─────────────────────────────────────────────────────────────
  if (action === 'add_member') {
    const id = makeId()
    await admin.from('tour_members').insert({ id, tour_id: body.tourId, manager_id: user.id, name: body.name, role: body.role, email: body.email?.toLowerCase() || null, phone: body.phone || null, notes: body.notes || '' })
    return NextResponse.json({ ok: true, id })
  }

  if (action === 'update_member') {
    await admin.from('tour_members').update({ name: body.name, role: body.role, email: body.email?.toLowerCase() || null, phone: body.phone || null, notes: body.notes || '' }).eq('id', body.memberId).eq('manager_id', user.id)
    return NextResponse.json({ ok: true })
  }

  if (action === 'delete_member') {
    await admin.from('tour_members').delete().eq('id', body.memberId).eq('manager_id', user.id)
    await admin.from('tour_member_tickets').delete().eq('member_id', body.memberId)
    await admin.from('tour_show_members').delete().eq('member_id', body.memberId)
    return NextResponse.json({ ok: true })
  }

  // ─── Show-Member hotel ────────────────────────────────────────────────────
  if (action === 'save_show_member') {
    const { showId, memberId, tourId, hotel, room, hotelAddr, notes } = body
    // Upsert
    const existing = await admin.from('tour_show_members').select('id').eq('show_id', showId).eq('member_id', memberId).single()
    if (existing.data) {
      await admin.from('tour_show_members').update({ hotel, room, hotel_addr: hotelAddr, notes }).eq('id', existing.data.id)
    } else {
      await admin.from('tour_show_members').insert({ id: makeId(), show_id: showId, member_id: memberId, tour_id: tourId, hotel, room, hotel_addr: hotelAddr, notes })
    }
    return NextResponse.json({ ok: true })
  }

  // ─── Tickets ─────────────────────────────────────────────────────────────
  if (action === 'upload_ticket') {
    const id = makeId()
    await admin.from('tour_member_tickets').insert({
      id, show_id: body.showId, member_id: body.memberId, tour_id: body.tourId,
      manager_id: user.id, direction: body.direction,
      ticket_data: body.ticketData, ticket_name: body.ticketName,
      ticket_mime: body.ticketMime, info: body.info || null
    })
    return NextResponse.json({ ok: true, id })
  }

  if (action === 'delete_ticket') {
    await admin.from('tour_member_tickets').delete().eq('id', body.ticketId).eq('manager_id', user.id)
    return NextResponse.json({ ok: true })
  }

  // ─── Messages ────────────────────────────────────────────────────────────
  if (action === 'send_message') {
    const id = makeId()
    await admin.from('tour_member_messages').insert({
      id, show_id: body.showId, member_id: body.memberId, tour_id: body.tourId,
      from_manager: body.fromManager || false, sender_name: body.senderName || 'Manager',
      message: body.message
    })
    return NextResponse.json({ ok: true, id })
  }

  // ─── Guests ──────────────────────────────────────────────────────────────
  if (action === 'add_guest') {
    const id = makeId()
    const { error } = await admin.from('tour_member_guests').insert({
      id, show_id: body.showId, member_id: body.memberId, tour_id: body.tourId,
      name: body.name, contact: body.contact || '', count: body.count || 1,
      notes: body.notes || '', status: body.status || 'confirmed'
    })
    if (error) { console.error('add_guest error:', error); return NextResponse.json({ error: error.message }, { status: 500 }) }
    return NextResponse.json({ ok: true, id })
  }

  if (action === 'update_guest') {
    await admin.from('tour_member_guests').update({ status: body.status }).eq('id', body.guestId)
    return NextResponse.json({ ok: true })
  }

  if (action === 'delete_guest') {
    await admin.from('tour_member_guests').delete().eq('id', body.guestId)
    return NextResponse.json({ ok: true })
  }

  // ─── Expenses ─────────────────────────────────────────────────────────────
  if (action === 'add_expense') {
    const id = makeId()
    await admin.from('tour_member_expenses').insert({
      id, show_id: body.showId, member_id: body.memberId, tour_id: body.tourId,
      date: body.date, amount: body.amount, category: body.category || 'other',
      description: body.description || '', receipt_data: body.receiptData || null,
      receipt_name: body.receiptName || null, receipt_mime: body.receiptMime || null
    })
    return NextResponse.json({ ok: true, id })
  }

  if (action === 'delete_expense') {
    await admin.from('tour_member_expenses').delete().eq('id', body.expenseId)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
