'use client'
import { useStore } from '@/lib/store'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const PLANS = [
  {
    id: 'solo',
    name: 'Solo',
    monthly: 9,
    annual: 6,
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
    cta: 'Get Solo',
    ctaDisabled: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    monthly: 19,
    annual: 13,
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
    cta: 'Upgrade to Pro',
    ctaDisabled: false,
  },
  {
    id: 'manager',
    name: 'Manager',
    monthly: 39,
    annual: 29,
    color: '#5DC9A0',
    icon: '🎪',
    features: [
      'Everything in Pro',
      '🤖 AI ticket reading (PDF/photo)',
      '📤 Show Pass — QR link, no app needed',
      '👥 Full team management',
      '🏨 Hotel, transfers, meals & planning',
      '✈ Travel tickets per member',
      '💰 Expenses with receipts',
      '🎫 Guest list with member names',
      '📅 Real calendar view',
      '💬 Group chat per show',
      '📄 Documents & files',
      '🎵 Setlist',
      '🖨 PDF export',
      '🔔 Push notifications',
      '📧 Team invitations',
    ],
    cta: 'Upgrade to Manager',
    ctaDisabled: false,
  },
]

export default function PricingPage() {
  const { userEmail } = useStore()
  const [currentPlan, setCurrentPlan] = useState('solo')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [annual, setAnnual] = useState(false)

  useEffect(() => {
    const token = typeof window !== 'undefined' ? (localStorage.getItem('td_token') || '') : ''
    if (!token) return
    fetch('/api/plan', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setCurrentPlan(d.plan || 'solo')).catch(() => {})
  }, [])

  const handleUpgrade = async (planId: string, billingCycle: string) => {
    if (planId === currentPlan) return
    setLoading(true)
    setMessage('')
    try {
      const token = localStorage.getItem('td_token') || ''
      const priceKey = `${planId}_${billingCycle}`
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ priceKey })
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setMessage('Something went wrong. Please try again.')
      }
    } catch {
      setMessage('Something went wrong. Please try again.')
    }
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

      {/* Billing toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
        <span style={{ fontSize: '13px', color: annual ? '#5A5570' : '#E8E0F0', fontWeight: annual ? 400 : 700 }}>Monthly</span>
        <div onClick={() => setAnnual(!annual)} style={{ width: '44px', height: '24px', borderRadius: '12px', background: annual ? '#C9A84C' : '#1F1F2E', cursor: 'pointer', position: 'relative', transition: 'background .2s' }}>
          <div style={{ position: 'absolute', top: '2px', left: annual ? '22px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: 'white', transition: 'left .2s' }} />
        </div>
        <span style={{ fontSize: '13px', color: annual ? '#E8E0F0' : '#5A5570', fontWeight: annual ? 700 : 400 }}>
          Annual <span style={{ background: 'rgba(93,201,160,.2)', color: '#5DC9A0', borderRadius: '6px', padding: '1px 6px', fontSize: '11px', fontWeight: 800 }}>Save ~15%</span>
        </span>
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
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 900, fontSize: '20px', color: plan.color }}>{plan.name}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '4px' }}>
                    <span style={{ fontWeight: 900, fontSize: '28px', color: '#E8E0F0' }}>
                      €{annual ? plan.annual : plan.monthly}
                    </span>
                    <span style={{ fontSize: '13px', color: '#5A5570' }}>/month</span>
                  </div>
                  {!annual && (
                    <div style={{ fontSize: '11px', color: '#5A5570', marginTop: '2px' }}>
                      Annual: €{plan.annual}/month (billed yearly)
                    </div>
                  )}
                  {annual && (
                    <div style={{ fontSize: '11px', color: '#5DC9A0', marginTop: '2px' }}>
                      Billed annually · monthly: €{plan.monthly}/month
                    </div>
                  )}
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
                onClick={() => !isCurrent && handleUpgrade(plan.id, annual ? 'annual' : 'monthly')}
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
// force redeploy Fri Jul 17 15:16:03 UTC 2026
