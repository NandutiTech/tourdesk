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

function makeId() { return Math.random().toString(36).slice(2, 18) }

// GET — member loads their tour data via token or user_id
export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token = new URL(req.url).searchParams.get('token')

  let member: any = null

  if (token) {
    // Join via invite token
    const { data: m } = await admin.from('tour_members').select('*').eq('invite_token', token).single()
    if (m) {
      // Associate user to member
      await admin.from('tour_members').update({ user_id: user.id, joined_at: new Date().toISOString() }).eq('id', m.id)
      member = { ...m, user_id: user.id }
    }
  }

  // Load all tours this user is member of
  const { data: members } = await admin.from('tour_members').select('*').eq('user_id', user.id)
  if (!members?.length && !member) return NextResponse.json({ members: [], tickets: [], expenses: [], guests: [], messages: [] })

  const allMembers = members || []
  if (member && !allMembers.find((m: any) => m.id === member.id)) allMembers.push(member)

  const memberIds = allMembers.map((m: any) => m.id)

  const [tickets, expenses, guests, messages] = await Promise.all([
    admin.from('tour_member_tickets').select('*').in('member_id', memberIds),
    admin.from('tour_member_expenses').select('*').in('member_id', memberIds).order('created_at'),
    admin.from('tour_member_guests').select('*').in('member_id', memberIds).order('created_at'),
    admin.from('tour_member_messages').select('*').in('member_id', memberIds).order('created_at'),
  ])

  return NextResponse.json({
    members: allMembers,
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
  const { action, memberId } = body

  // Verify member belongs to this user
  const { data: member } = await admin.from('tour_members').select('*').eq('id', memberId).eq('user_id', user.id).single()
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (action === 'add_expense') {
    const { date, amount, category, description, receiptData, receiptName, receiptMime } = body
    await admin.from('tour_member_expenses').insert({
      id: makeId(), member_id: memberId, tour_id: member.tour_id,
      date, amount, category, description,
      receipt_data: receiptData, receipt_name: receiptName, receipt_mime: receiptMime
    })
    return NextResponse.json({ ok: true })
  }

  if (action === 'delete_expense') {
    await admin.from('tour_member_expenses').delete().eq('id', body.expenseId).eq('member_id', memberId)
    return NextResponse.json({ ok: true })
  }

  if (action === 'add_guest') {
    const { name, contact, count, notes } = body
    await admin.from('tour_member_guests').insert({
      id: makeId(), member_id: memberId, tour_id: member.tour_id,
      name, contact, count: count || 1, notes, status: 'confirmed'
    })
    return NextResponse.json({ ok: true })
  }

  if (action === 'update_guest_status') {
    await admin.from('tour_member_guests').update({ status: body.status }).eq('id', body.guestId).eq('member_id', memberId)
    return NextResponse.json({ ok: true })
  }

  if (action === 'delete_guest') {
    await admin.from('tour_member_guests').delete().eq('id', body.guestId).eq('member_id', memberId)
    return NextResponse.json({ ok: true })
  }

  if (action === 'send_message') {
    await admin.from('tour_member_messages').insert({
      id: makeId(), member_id: memberId, tour_id: member.tour_id,
      from_manager: false, message: body.message
    })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
