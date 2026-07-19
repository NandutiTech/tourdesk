import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

export const dynamic = 'force-dynamic'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

async function getUser(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data } = await admin.auth.getUser(token)
  return data.user || null
}

function makeId() { return Math.random().toString(36).slice(2, 18) }

// Save subscription
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action } = body

  if (action === 'subscribe') {
    const user = await getUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { endpoint, p256dh, auth } = body
    // Upsert by endpoint
    const { data: existing } = await admin.from('push_subscriptions').select('id').eq('user_id', user.id).eq('endpoint', endpoint).single()
    if (!existing) {
      await admin.from('push_subscriptions').insert({ id: makeId(), user_id: user.id, endpoint, p256dh, auth })
    }
    return NextResponse.json({ ok: true })
  }

  if (action === 'notify_tour_members') {
    // Send notification to all members of a tour
    const { tourId, title, body: msgBody, url } = body
    // Get all members of this tour
    const { data: members } = await admin.from('tour_members').select('user_id').eq('tour_id', tourId).not('user_id', 'is', null)
    if (!members?.length) return NextResponse.json({ ok: true, sent: 0 })

    const userIds = members.map((m: any) => m.user_id)
    const { data: subs } = await admin.from('push_subscriptions').select('*').in('user_id', userIds)
    if (!subs?.length) return NextResponse.json({ ok: true, sent: 0 })

    let sent = 0
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title, body: msgBody, url })
        )
        sent++
      } catch (e: any) {
        if (e.statusCode === 410) {
          await admin.from('push_subscriptions').delete().eq('id', sub.id)
        }
      }
    }
    return NextResponse.json({ ok: true, sent })
  }

  if (action === 'notify_manager') {
    // Notify the manager of a tour
    const { managerId, title, body: msgBody, url } = body
    const { data: subs } = await admin.from('push_subscriptions').select('*').eq('user_id', managerId)
    if (!subs?.length) return NextResponse.json({ ok: true, sent: 0 })

    let sent = 0
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title, body: msgBody, url })
        )
        sent++
      } catch (e: any) {
        if (e.statusCode === 410) {
          await admin.from('push_subscriptions').delete().eq('id', sub.id)
        }
      }
    }
    return NextResponse.json({ ok: true, sent })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
