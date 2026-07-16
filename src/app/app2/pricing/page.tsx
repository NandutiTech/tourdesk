'use client'
import { useStore } from '@/lib/store'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const PLANS = [
  {
    id: 'solo',
    name: 'Solo',
    price: 0,
    period: 'Free forever',
    color: '#5A5570',
    icon: '🎤',
    features: [
      'Tours & Events calendar',
      'PDF planning import',
      'Meetings & alerts',
      'Earnings & hours counter',
      'Déclaration mensuelle',
      'Indemnisation simulator',
      'Replacements',
    ],
    locked: [],
    cta: 'Current plan',
    ctaDisabled: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9,
    period: '/month',
    color: '#C9A84C',
    icon: '⭐',
    popular: true,
    features: [
      'Everything in Solo',
      'Travel & transport',
      'Expense tracking',
      'Guest list management',
      'Industry contacts',
      'Technical rider generator',
      'Feuille de cachet',
      'My availability page',
      'Send to contact (WhatsApp/SMS/Gmail)',
    ],
    locked: [],
    cta: 'Upgrade to Pro',
    ctaDisabled: false,
  },
  {
    id: 'manager',
    name: 'Manager',
    price: 19,
    period: '/month',
    color: '#5DC9A0',
    icon: '🎭',
    features: [
      'Everything in Pro',
      'Manager tour sheets',
      'Team member management',
      'Share hotel & transport info',
      'Multi-artist management',
    ],
    locked: [],
    cta: 'Upgrade to Manager',
    ctaDisabled: false,
  },
]

export default function PricingPage() {
  const { userEmail } = useStore()
  const [currentPlan, setCurrentPlan] = useState('solo')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = typeof window !== 'undefined' ? (localStorage.getItem('td_token') || '') : ''
    if (!token) return
    fetch('/api/plan', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setCurrentPlan(d.plan || 'solo')).catch(() => {})
  }, [])

  const handleUpgrade = async (planId: string) => {
    if (planId === currentPlan) return
    setLoading(true)
    setMessage('')

    // TODO: Replace with Stripe checkout when ready
    // For now, send email request
    const subject = `TourDesk ${planId} upgrade request`
    const body = `Hi, I'd like to upgrade to the ${planId} plan.\n\nAccount: ${userEmail}`
    window.open(`mailto:sannie.patron@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank')
    setMessage("We received your request! We'll activate your plan within 24h. 🎉")
    setLoading(false)
  }

  return (
    <div style={{ padding: '0 0 100px', fontFamily: '-apple-system, Inter, system-ui, sans-serif', color: '#E8E0F0' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', padding: '32px 20px 24px' }}>
        <div style={{ fontWeight: 900, fontSize: '26px', letterSpacing: '-0.04em', marginBottom: '8px' }}>
          Choose your plan
        </div>
        <div style={{ fontSize: '14px', color: '#5A5570', lineHeight: 1.6 }}>
          Upgrade anytime. Cancel anytime. No hidden fees.
        </div>
      </div>

      {message && (
        <div style={{ margin: '0 16px 16px', background: 'rgba(93,201,160,.1)', border: '1px solid rgba(93,201,160,.3)', borderRadius: '12px', padding: '14px 16px', fontSize: '13px', color: '#5DC9A0', lineHeight: 1.6 }}>
          {message}
        </div>
      )}

      {/* Plan cards */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {PLANS.map(plan => {
          const isCurrent = currentPlan === plan.id
          const isUpgrade = !isCurrent && PLANS.findIndex(p => p.id === plan.id) > PLANS.findIndex(p => p.id === currentPlan)

          return (
            <div key={plan.id} style={{
              background: '#17171F',
              border: `2px solid ${plan.popular ? plan.color : isCurrent ? plan.color : '#1F1F2E'}`,
              borderRadius: '16px',
              padding: '20px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {plan.popular && (
                <div style={{
                  position: 'absolute', top: '12px', right: '12px',
                  background: plan.color, color: '#0A0A0F',
                  fontSize: '10px', fontWeight: 900, letterSpacing: '.1em',
                  padding: '3px 10px', borderRadius: '20px', textTransform: 'uppercase'
                }}>Most popular</div>
              )}
              {isCurrent && (
                <div style={{
                  position: 'absolute', top: '12px', right: '12px',
                  background: plan.color, color: plan.id === 'solo' ? '#E8E0F0' : '#0A0A0F',
                  fontSize: '10px', fontWeight: 900, letterSpacing: '.1em',
                  padding: '3px 10px', borderRadius: '20px', textTransform: 'uppercase'
                }}>Current plan</div>
              )}

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                <div style={{ fontSize: '28px' }}>{plan.icon}</div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: '20px', color: plan.color }}>{plan.name}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px', marginTop: '2px' }}>
                    <span style={{ fontWeight: 900, fontSize: plan.price === 0 ? '18px' : '28px', color: '#E8E0F0' }}>
                      {plan.price === 0 ? 'Free' : `€${plan.price}`}
                    </span>
                    {plan.price > 0 && <span style={{ fontSize: '13px', color: '#5A5570' }}>{plan.period}</span>}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                {plan.features.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ color: plan.color, flexShrink: 0, fontSize: '14px' }}>✓</span>
                    <span style={{ fontSize: '13px', color: i === 0 && plan.id !== 'solo' ? '#5A5570' : '#E8E0F0' }}>{f}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => !isCurrent && handleUpgrade(plan.id)}
                disabled={isCurrent || loading}
                style={{
                  width: '100%',
                  background: isCurrent ? 'transparent' : plan.color,
                  border: isCurrent ? `1px solid ${plan.color}` : 'none',
                  color: isCurrent ? plan.color : plan.id === 'solo' ? '#E8E0F0' : '#0A0A0F',
                  borderRadius: '10px',
                  padding: '13px',
                  cursor: isCurrent ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                  fontWeight: 900,
                  fontSize: '14px',
                  opacity: isCurrent ? 0.7 : 1
                }}
              >
                {isCurrent ? '✓ Your current plan' : loading ? '...' : plan.cta}
              </button>
            </div>
          )
        })}
      </div>

      {/* FAQ */}
      <div style={{ padding: '24px 16px 0' }}>
        <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: '#5A5570', marginBottom: '16px' }}>FAQ</div>
        {[
          { q: 'Can I cancel anytime?', a: 'Yes — cancel anytime, no commitment. Your data is always yours.' },
          { q: 'What payment methods do you accept?', a: 'Credit card via Stripe (coming soon). For now, contact us to activate your plan.' },
          { q: 'Is my data secure?', a: 'Yes — encrypted and stored in Europe (EU-West). We never sell your data.' },
          { q: 'Can I switch plans?', a: 'Yes, upgrade or downgrade anytime. Changes take effect immediately.' },
        ].map((item, i) => (
          <div key={i} style={{ marginBottom: '16px' }}>
            <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{item.q}</div>
            <div style={{ fontSize: '13px', color: '#5A5570', lineHeight: 1.6 }}>{item.a}</div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', padding: '16px', fontSize: '12px', color: '#5A5570' }}>
        Questions? <a href="mailto:sannie.patron@gmail.com" style={{ color: '#C9A84C' }}>Contact us</a>
      </div>
    </div>
  )
}
