import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-06-24.dahlia' })

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.metadata?.user_id
    const plan = session.metadata?.plan
    const subscriptionId = session.subscription as string

    if (userId && plan) {
      // Get subscription end date
      const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any
      const expiresAt = new Date(subscription.current_period_end * 1000).toISOString()

      // Update free_access table
      await admin.from('free_access').upsert({
        email: session.customer_email || '',
        plan,
        expires_at: expiresAt,
        note: `Stripe subscription ${subscriptionId}`,
      }, { onConflict: 'email' })
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription
    const userId = subscription.metadata?.user_id
    if (userId) {
      // Downgrade to solo
      const { data: user } = await admin.auth.admin.getUserById(userId)
      if (user?.user?.email) {
        await admin.from('free_access').upsert({
          email: user.user.email,
          plan: 'solo',
          expires_at: null,
          note: 'Subscription cancelled',
        }, { onConflict: 'email' })
      }
    }
  }

  return NextResponse.json({ received: true })
}
