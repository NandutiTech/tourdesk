import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getUid(req: NextRequest): Promise<string | null> {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data } = await admin.auth.getUser(token)
  return data.user?.id || null
}

async function getEmail(req: NextRequest): Promise<string | null> {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data } = await admin.auth.getUser(token)
  return data.user?.email || null
}

export async function GET(req: NextRequest) {
  const uid = await getUid(req)
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: invites } = await admin.from('tour_invites').select('*').eq('manager_id', uid)
  const tourIds = [...new Set((invites || []).map((i: any) => i.tour_id))]

  if (tourIds.length === 0) return NextResponse.json({ invites: [], tickets: [], guests: [], expenses: [], messages: [] })

  const [tickets, guests, expenses, messages] = await Promise.all([
    admin.from('tour_member_tickets').select('*').eq('manager_id', uid),
    admin.from('tour_member_guests').select('*').in('tour_id', tourIds),
    admin.from('tour_member_expenses').select('*').in('tour_id', tourIds),
    admin.from('tour_messages').select('*').in('tour_id', tourIds).order('created_at'),
  ])

  return NextResponse.json({
    invites: invites || [],
    tickets: tickets.data || [],
    guests: guests.data || [],
    expenses: expenses.data || [],
    messages: messages.data || []
  })
}

export async function POST(req: NextRequest) {
  const uid = await getUid(req)
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action } = body

  if (action === 'invite') {
    const { tourId, email, role } = body
    const emailLower = email.toLowerCase().trim()

    const { data: existing } = await admin.from('tour_invites').select('id').eq('tour_id', tourId).eq('email', emailLower).single()
    if (existing) return NextResponse.json({ error: 'Already invited' }, { status: 400 })

    // Check if user exists
    const { data: users } = await admin.auth.admin.listUsers()
    const existingUser = users?.users?.find(u => u.email === emailLower)

    const id = Math.random().toString(36).slice(2, 18)
    await admin.from('tour_invites').insert({
      id, tour_id: tourId, manager_id: uid,
      email: emailLower, role, status: 'pending',
      user_id: existingUser?.id || null
    })

    // Send invite email
    const managerEmail = await getEmail(req)
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'TourDesk <hello@tourdesktop.com>',
        to: emailLower,
        subject: `Invitation to join a tour on TourDesk`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <img src="https://www.tourdesktop.com/images/tourdesk-logo.png" width="120" style="margin-bottom:24px"/>
          <h2 style="color:#C9A84C">You've been invited to a tour</h2>
          <p>A manager has invited you to join their tour on TourDesk as <strong>${role || 'team member'}</strong>.</p>
          <p>You'll be able to see your travel tickets, add guests and expenses for the tour.</p>
          <a href="https://www.tourdesktop.com/app2/tours-invited" style="display:inline-block;background:#C9A84C;color:#000;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;margin:16px 0">
            View my tour →
          </a>
          <p style="color:#888;font-size:12px;margin-top:24px">Sign in or create a free account at tourdesktop.com to access your tour.</p>
        </div>`
      })
    })

    return NextResponse.json({ ok: true })
  }

  if (action === 'upload_ticket') {
    const { tourId, memberEmail, direction, ticketData, ticketName, ticketMime, info } = body

    // Find user_id for this member
    const { data: invite } = await admin.from('tour_invites').select('user_id, email').eq('tour_id', tourId).eq('email', memberEmail).single()

    const id = Math.random().toString(36).slice(2, 18)
    await admin.from('tour_member_tickets').insert({
      id, tour_id: tourId, manager_id: uid,
      member_user_id: invite?.user_id || null,
      member_email: memberEmail,
      direction, ticket_data: ticketData,
      ticket_name: ticketName, ticket_mime: ticketMime, info
    })
    return NextResponse.json({ ok: true })
  }

  if (action === 'delete_ticket') {
    await admin.from('tour_member_tickets').delete().eq('id', body.ticketId).eq('manager_id', uid)
    return NextResponse.json({ ok: true })
  }

  if (action === 'delete_invite') {
    await admin.from('tour_invites').delete().eq('id', body.inviteId).eq('manager_id', uid)
    return NextResponse.json({ ok: true })
  }

  if (action === 'send_message') {
    const { tourId, message, userName } = body
    const id = Math.random().toString(36).slice(2, 18)
    await admin.from('tour_messages').insert({
      id, tour_id: tourId, user_id: uid,
      user_name: userName, is_manager: true, message
    })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
