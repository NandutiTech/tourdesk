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

// GET — load manager tours + members + tickets
export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tourId = new URL(req.url).searchParams.get('tourId')

  // Load manager's tours (from tour_invites as manager)
  const { data: invites } = await admin
    .from('tour_invites')
    .select('*')
    .eq('manager_id', user.id)

  // Load members for this manager
  const memberQuery = admin.from('tour_members').select('*').eq('manager_id', user.id)
  if (tourId) memberQuery.eq('tour_id', tourId)
  const { data: members } = await memberQuery.order('created_at')

  // Load tickets
  const ticketQuery = admin.from('tour_member_tickets').select('*').eq('manager_id', user.id)
  if (tourId) ticketQuery.eq('tour_id', tourId)
  const { data: tickets } = await ticketQuery

  return NextResponse.json({
    invites: invites || [],
    members: members || [],
    tickets: tickets || [],
  })
}

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action } = body

  // Create manager tour
  if (action === 'create_tour') {
    const { name, startDate, endDate, venue, city, notes } = body
    const id = makeId()
    await admin.from('tour_invites').insert({
      id, manager_id: user.id,
      tour_id: id, // self-referencing as the tour
      email: '', // manager's own tour
      status: 'manager',
      role: name, // use role field to store tour name
      notes: JSON.stringify({ startDate, endDate, venue, city, notes })
    })
    return NextResponse.json({ ok: true, id })
  }

  // Update manager tour
  if (action === 'update_tour') {
    const { tourId, name, startDate, endDate, venue, city, notes } = body
    await admin.from('tour_invites').update({
      role: name,
      notes: JSON.stringify({ startDate, endDate, venue, city, notes })
    }).eq('id', tourId).eq('manager_id', user.id)
    return NextResponse.json({ ok: true })
  }

  // Delete manager tour
  if (action === 'delete_tour') {
    await admin.from('tour_invites').delete().eq('id', body.tourId).eq('manager_id', user.id)
    await admin.from('tour_members').delete().eq('tour_id', body.tourId).eq('manager_id', user.id)
    await admin.from('tour_member_tickets').delete().eq('tour_id', body.tourId).eq('manager_id', user.id)
    return NextResponse.json({ ok: true })
  }

  // Add member
  if (action === 'add_member') {
    const { tourId, name, role, email, hotel, room, hotelAddr, notes } = body
    const id = makeId()
    await admin.from('tour_members').insert({
      id, tour_id: tourId, manager_id: user.id,
      name, role, email: email?.toLowerCase() || null,
      hotel, room, hotel_addr: hotelAddr, notes
    })
    return NextResponse.json({ ok: true, id })
  }

  // Update member
  if (action === 'update_member') {
    const { memberId, name, role, email, hotel, room, hotelAddr, notes } = body
    await admin.from('tour_members').update({
      name, role, email: email?.toLowerCase() || null,
      hotel, room, hotel_addr: hotelAddr, notes
    }).eq('id', memberId).eq('manager_id', user.id)
    return NextResponse.json({ ok: true })
  }

  // Delete member
  if (action === 'delete_member') {
    await admin.from('tour_members').delete().eq('id', body.memberId).eq('manager_id', user.id)
    await admin.from('tour_member_tickets').delete().eq('member_id', body.memberId)
    return NextResponse.json({ ok: true })
  }

  // Upload ticket for member
  if (action === 'upload_ticket') {
    const { memberId, tourId, direction, ticketData, ticketName, ticketMime, info } = body
    const id = makeId()
    await admin.from('tour_member_tickets').insert({
      id, member_id: memberId, tour_id: tourId, manager_id: user.id,
      direction, ticket_data: ticketData, ticket_name: ticketName,
      ticket_mime: ticketMime, info
    })
    return NextResponse.json({ ok: true, id })
  }

  // Delete ticket
  if (action === 'delete_ticket') {
    await admin.from('tour_member_tickets').delete().eq('id', body.ticketId).eq('manager_id', user.id)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
