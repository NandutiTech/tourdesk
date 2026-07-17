import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-06-24.dahlia' })

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const PRICE_LOOKUP: Record<string, string> = {
  solo_monthly: 'solo_monthly',
  solo_annual: 'solo_annual',
  pro_monthly: 'pro_monthly',
  pro_annual: 'pro_annual',
  manager_monthly: 'manager_monthly',
  manager_annual: 'manager_annual',
}

const PLAN_MAP: Record<string, string> = {
  solo_monthly: 'solo', solo_annual: 'solo',
  pro_monthly: 'pro', pro_annual: 'pro',
  manager_monthly: 'manager', manager_annual: 'manager',
}

async function getUser(request: NextRequest) {
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice(7)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data: { user } } = await supabase.auth.getUser(token)
  return user
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { priceKey } = await request.json()
    if (!PRICE_LOOKUP[priceKey]) return NextResponse.json({ error: 'Invalid price' }, { status: 400 })

    const origin = request.headers.get('origin') || 'https://tourdesktop.com'

    // Get price from Stripe by lookup key
    const prices = await stripe.prices.list({ lookup_keys: [priceKey], expand: ['data.product'] })
    if (!prices.data.length) return NextResponse.json({ error: 'Price not found' }, { status: 404 })

    const price = prices.data[0]

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: `${origin}/app2/settings?upgraded=1`,
      cancel_url: `${origin}/app2/pricing`,
      customer_email: user.email || undefined,
      allow_promotion_codes: true,
      metadata: {
        user_id: user.id,
        plan: PLAN_MAP[priceKey],
        price_key: priceKey,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan: PLAN_MAP[priceKey],
        }
      }
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Checkout error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
