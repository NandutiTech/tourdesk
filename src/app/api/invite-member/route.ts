import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const resend = new Resend(process.env.RESEND_API_KEY!)

async function getUser(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data } = await admin.auth.getUser(token)
  return data.user || null
}

function makeToken() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
}

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { memberId } = await req.json()

  // Get member details
  const { data: member } = await admin.from('tour_members')
    .select('*, tour_id')
    .eq('id', memberId)
    .eq('manager_id', user.id)
    .single()

  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  if (!member.email) return NextResponse.json({ error: 'No email for this member' }, { status: 400 })

  // Get tour name
  const { data: tour } = await admin.from('manager_tours').select('name').eq('id', member.tour_id).single()

  // Generate invite token
  const token = makeToken()
  await admin.from('tour_members').update({ invite_token: token, invite_status: 'invited' }).eq('id', memberId)

  const inviteUrl = `https://www.tourdesktop.com/join/${token}`

  // Send email
  await resend.emails.send({
    from: 'TourDesk <hello@tourdesktop.com>',
    to: member.email,
    subject: `You've been invited to join ${tour?.name || 'a tour'} on TourDesk`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 24px; background: #0A0A0F; color: #E8E0F0;">
        <img src="https://www.tourdesktop.com/images/tourdesk-logo.png" alt="TourDesk" style="height: 32px; margin-bottom: 32px;" />
        <h1 style="font-size: 24px; font-weight: 900; margin: 0 0 12px; color: #C9A84C;">You're invited! 🎉</h1>
        <p style="font-size: 15px; line-height: 1.6; color: #A090C0; margin: 0 0 8px;">
          Your manager has added you to <strong style="color: #E8E0F0;">${tour?.name || 'a tour'}</strong> on TourDesk.
        </p>
        <p style="font-size: 14px; color: #5A5570; margin: 0 0 32px;">
          You'll be able to see your travel tickets, hotel info, planning, guest list and chat with the team.
        </p>
        <a href="${inviteUrl}" style="display: inline-block; background: #C9A84C; color: #0A0A0F; padding: 14px 28px; border-radius: 12px; font-weight: 800; font-size: 15px; text-decoration: none;">
          Join the tour →
        </a>
        <p style="font-size: 12px; color: #3A3550; margin-top: 40px;">
          Powered by <a href="https://tourdesktop.com" style="color: #C9A84C;">TourDesk</a>
        </p>
      </div>
    `
  })

  return NextResponse.json({ ok: true })
}

// GET — verify invite token and get member info
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'No token' }, { status: 400 })

  const { data: member } = await admin.from('tour_members')
    .select('id, name, role, email, tour_id, invite_status, user_id')
    .eq('invite_token', token)
    .single()

  if (!member) return NextResponse.json({ error: 'Invalid invite' }, { status: 404 })

  const { data: tour } = await admin.from('manager_tours').select('name').eq('id', member.tour_id).single()

  return NextResponse.json({ member, tour })
}

// PUT — accept invite (called after signup/login)
export async function PUT(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { token } = await req.json()

  const { data: member } = await admin.from('tour_members')
    .select('id, email')
    .eq('invite_token', token)
    .single()

  if (!member) return NextResponse.json({ error: 'Invalid invite' }, { status: 404 })

  // Associate user with member
  await admin.from('tour_members').update({
    user_id: user.id,
    invite_status: 'accepted',
    joined_at: new Date().toISOString()
  }).eq('id', member.id)

  return NextResponse.json({ ok: true, memberId: member.id })
}
