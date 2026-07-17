import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-06-24.dahlia' })

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const sig = request.headers.get('stripe-signature')
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!sig || !webhookSecret) {
      console.error('Missing sig or secret')
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    } catch (err: any) {
      console.error('Webhook signature failed:', err.message)
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
    }

    console.log('Webhook event:', event.type)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.user_id
      const plan = session.metadata?.plan
      const email = session.customer_details?.email || session.customer_email || ''

      console.log('Checkout completed:', { userId, plan, email })

      if (plan && email) {
        // Get subscription end date
        let expiresAt: string | null = null
        if (session.subscription) {
          try {
            const sub = await stripe.subscriptions.retrieve(session.subscription as string) as any
            expiresAt = new Date(sub.current_period_end * 1000).toISOString()
          } catch (e) {
            console.error('Could not retrieve subscription:', e)
          }
        }

        const { error } = await admin.from('free_access').upsert({
          email,
          plan,
          expires_at: expiresAt,
          note: `Stripe subscription`,
        }, { onConflict: 'email' })

        if (error) {
          console.error('Supabase upsert error:', error)
          return NextResponse.json({ error: 'DB error' }, { status: 500 })
        }

        console.log('Plan updated:', email, plan)
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as any
      const userId = subscription.metadata?.user_id
      console.log('Subscription deleted:', userId)

      if (userId) {
        const { data } = await admin.auth.admin.getUserById(userId)
        const email = data?.user?.email
        if (email) {
          await admin.from('free_access').upsert({
            email,
            plan: 'solo',
            expires_at: null,
            note: 'Subscription cancelled',
          }, { onConflict: 'email' })
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('Webhook error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
