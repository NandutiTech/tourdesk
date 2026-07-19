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

  const tourId = new URL(req.url).searchParams.get('tourId')

  const { data: managerTours } = await admin.from('manager_tours').select('*').eq('user_id', user.id).order('created_at')

  const memberQuery = admin.from('tour_members').select('*').eq('manager_id', user.id)
  if (tourId) memberQuery.eq('tour_id', tourId)
  const { data: members } = await memberQuery.order('created_at')

  const ticketQuery = admin.from('tour_member_tickets').select('*').eq('manager_id', user.id)
  if (tourId) ticketQuery.eq('tour_id', tourId)
  const { data: tickets } = await ticketQuery

  const showQuery = admin.from('tour_shows').select('*').eq('manager_id', user.id)
  if (tourId) showQuery.eq('tour_id', tourId)
  const { data: shows } = await showQuery.order('date')

  return NextResponse.json({
    tours: managerTours || [],
    members: members || [],
    tickets: tickets || [],
    shows: shows || [],
  })
}

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action } = body

  if (action === 'create_tour') {
    const { name, notes } = body
    const id = makeId()
    await admin.from('manager_tours').insert({
      id, user_id: user.id, name, notes: notes || ''
    })
    return NextResponse.json({ ok: true, id })
  }

  if (action === 'update_tour') {
    const { tourId, name, notes } = body
    await admin.from('manager_tours').update({ name, notes: notes || '' }).eq('id', tourId).eq('user_id', user.id)
    return NextResponse.json({ ok: true })
  }

  if (action === 'delete_tour') {
    const { tourId } = body
    await admin.from('manager_tours').delete().eq('id', tourId).eq('user_id', user.id)
    await admin.from('tour_members').delete().eq('tour_id', tourId).eq('manager_id', user.id)
    await admin.from('tour_member_tickets').delete().eq('tour_id', tourId).eq('manager_id', user.id)
    await admin.from('tour_shows').delete().eq('tour_id', tourId).eq('manager_id', user.id)
    return NextResponse.json({ ok: true })
  }

  // ─── Shows ───────────────────────────────────────────────────────────────
  if (action === 'add_show') {
    const { tourId, date, venue, city, notes } = body
    const id = makeId()
    await admin.from('tour_shows').insert({ id, tour_id: tourId, manager_id: user.id, date, venue, city, notes })
    return NextResponse.json({ ok: true, id })
  }

  if (action === 'add_shows_bulk') {
    const { tourId, shows } = body
    const rows = shows.map((s: any) => ({ id: makeId(), tour_id: tourId, manager_id: user.id, ...s }))
    await admin.from('tour_shows').insert(rows)
    return NextResponse.json({ ok: true, count: rows.length })
  }

  if (action === 'update_show') {
    const { showId, date, venue, city, notes } = body
    await admin.from('tour_shows').update({ date, venue, city, notes }).eq('id', showId).eq('manager_id', user.id)
    return NextResponse.json({ ok: true })
  }

  if (action === 'delete_show') {
    await admin.from('tour_shows').delete().eq('id', body.showId).eq('manager_id', user.id)
    return NextResponse.json({ ok: true })
  }

  // ─── Members ─────────────────────────────────────────────────────────────
  if (action === 'add_member') {
    const { tourId, name, role, email, phone, hotel, room, hotelAddr, notes } = body
    const id = makeId()
    await admin.from('tour_members').insert({
      id, tour_id: tourId, manager_id: user.id,
      name, role, email: email?.toLowerCase() || null, phone: phone || null,
      hotel, room, hotel_addr: hotelAddr, notes
    })
    return NextResponse.json({ ok: true, id })
  }

  if (action === 'update_member') {
    const { memberId, name, role, email, phone, hotel, room, hotelAddr, notes } = body
    await admin.from('tour_members').update({
      name, role, email: email?.toLowerCase() || null, phone: phone || null,
      hotel, room, hotel_addr: hotelAddr, notes
    }).eq('id', memberId).eq('manager_id', user.id)
    return NextResponse.json({ ok: true })
  }

  if (action === 'delete_member') {
    await admin.from('tour_members').delete().eq('id', body.memberId).eq('manager_id', user.id)
    await admin.from('tour_member_tickets').delete().eq('member_id', body.memberId)
    return NextResponse.json({ ok: true })
  }

  // ─── Tickets ─────────────────────────────────────────────────────────────
  if (action === 'upload_ticket') {
    const { memberId, tourId, showId, direction, ticketData, ticketName, ticketMime, info } = body
    const id = makeId()
    await admin.from('tour_member_tickets').insert({
      id, member_id: memberId, tour_id: tourId, show_id: showId || null,
      manager_id: user.id, direction,
      ticket_data: ticketData, ticket_name: ticketName,
      ticket_mime: ticketMime, info
    })
    return NextResponse.json({ ok: true, id })
  }

  if (action === 'delete_ticket') {
    await admin.from('tour_member_tickets').delete().eq('id', body.ticketId).eq('manager_id', user.id)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
