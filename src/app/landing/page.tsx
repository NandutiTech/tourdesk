'use client'
import { useState } from 'react'
import Link from 'next/link'

const PLANS = [
  {
    id: 'solo', name: 'Solo', icon: '🎤',
    monthly: 9, annual: 6,
    color: '#5A5570',
    desc: 'For artists working with a few employers',
    features: ['Up to 3 artists', 'Tours & Events calendar', 'Conflict detection & alerts', 'Check Availability', 'Meeting scheduler', 'Earnings & hours tracker', 'Déclaration mensuelle', 'Indemnisation simulator'],
  },
  {
    id: 'pro', name: 'Pro', icon: '⭐',
    monthly: 19, annual: 13,
    color: '#C9A84C', popular: true,
    desc: 'For active artists — music, theatre, dance, film',
    features: ['Unlimited artists', 'Everything in Solo', 'PDF & photo planning import', 'Travel & transport manager', 'Expense tracking', 'Guest list management', 'Industry contacts', 'Technical rider generator', 'Share My Calendar', 'Send to contact (WhatsApp/SMS/Gmail)'],
  },
  {
    id: 'manager', name: 'Manager', icon: '🎭',
    monthly: 39, annual: 32,
    color: '#5DC9A0',
    desc: 'For agencies & tour managers handling multiple artists',
    features: ['Everything in Pro', 'Manager tour sheets', 'Team member management', 'Share hotel & transport info', 'Multi-artist management', 'Priority support'],
  },
]

const FEATURES = [
  { icon: '📅', title: 'Smart Calendar', desc: 'Add employers with colors. Conflicts detected automatically and shown instantly.' },
  { icon: '⚡', title: 'Check Availability', desc: 'Upload a PDF or photo with proposed dates — see which are free and which conflict.' },
  { icon: '📤', title: 'Share My Calendar', desc: 'Send your availability by WhatsApp or Gmail. Mask artist names if you want.' },
  { icon: '💶', title: 'Earnings & Hours', desc: 'Set your cachet per employer once. Every event calculated automatically toward your 507h goal.' },
  { icon: '🇫🇷', title: 'Déclaration mensuelle', desc: 'Your contracts formatted exactly as France Travail requires — copy and paste.' },
  { icon: '✈', title: 'Travel & Expenses', desc: 'Save tickets alongside your gigs. Track expenses and share reports with productions.' },
  { icon: '🎫', title: 'Guest List', desc: 'Manage invitations per show. Send to contacts by WhatsApp, SMS or Gmail.' },
  { icon: '📊', title: 'Dashboard', desc: 'Compare your activity year by year — hours, earnings, events by artist.' },
]

export default function LandingPage() {
  const [annual, setAnnual] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div style={{ background: '#0A0A0F', color: '#E8E0F0', fontFamily: '-apple-system, Inter, system-ui, sans-serif', minHeight: '100vh' }}>

      {/* Nav */}
      <nav style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1F1F2E', position: 'sticky', top: 0, background: '#0A0A0F', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', background: '#C9A84C', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>♩</div>
          <span style={{ fontWeight: 900, fontSize: '18px', letterSpacing: '-0.03em' }}>TourDesk</span>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Link href="/auth/login" style={{ fontSize: '14px', color: '#5A5570', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
          <Link href="/auth/login#signup" style={{ background: '#C9A84C', color: '#0A0A0F', borderRadius: '8px', padding: '8px 16px', fontSize: '14px', fontWeight: 900, textDecoration: 'none' }}>Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ textAlign: 'center', padding: '60px 24px 48px' }}>
        <div style={{ display: 'inline-block', background: 'rgba(201,168,76,.1)', border: '1px solid rgba(201,168,76,.2)', borderRadius: '20px', padding: '4px 14px', fontSize: '12px', fontWeight: 700, color: '#C9A84C', marginBottom: '20px', letterSpacing: '.08em', textTransform: 'uppercase' }}>
          🎭 Built for performing artists
        </div>
        <h1 style={{ fontSize: '36px', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.15, margin: '0 0 16px' }}>
          Your agenda,<br /><span style={{ color: '#C9A84C' }}>finally organized</span>
        </h1>
        <p style={{ fontSize: '16px', color: '#5A5570', lineHeight: 1.7, maxWidth: '360px', margin: '0 auto 32px' }}>
          TourDesk is the all-in-one agenda for musicians, actors, dancers and performing artists. Concerts, rehearsals, filming — everything in one place.
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/auth/login#signup" style={{ background: '#C9A84C', color: '#0A0A0F', borderRadius: '12px', padding: '14px 28px', fontSize: '16px', fontWeight: 900, textDecoration: 'none', display: 'inline-block' }}>
            Start free →
          </Link>
          <Link href="/auth/login" style={{ background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '12px', padding: '14px 28px', fontSize: '16px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
            Sign in
          </Link>
        </div>
        <p style={{ fontSize: '12px', color: '#5A5570', marginTop: '12px' }}>No credit card required · Installs on iPhone & Android</p>
      </section>

      {/* Features grid */}
      <section style={{ padding: '0 20px 48px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 8px' }}>Everything you need</h2>
          <p style={{ fontSize: '14px', color: '#5A5570' }}>Built specifically for the intermittent lifestyle</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', maxWidth: '600px', margin: '0 auto' }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{ background: '#12121A', border: '1px solid #1F1F2E', borderRadius: '14px', padding: '16px' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>{f.icon}</div>
              <div style={{ fontWeight: 800, fontSize: '13px', marginBottom: '4px' }}>{f.title}</div>
              <div style={{ fontSize: '12px', color: '#5A5570', lineHeight: 1.5 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section style={{ padding: '0 20px 48px' }} id="pricing">
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 8px' }}>Simple pricing</h2>
          <p style={{ fontSize: '14px', color: '#5A5570', marginBottom: '20px' }}>No hidden fees. Cancel anytime.</p>
          {/* Toggle */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', background: '#12121A', borderRadius: '10px', padding: '6px 16px' }}>
            <span style={{ fontSize: '13px', color: annual ? '#5A5570' : '#E8E0F0', fontWeight: annual ? 400 : 700 }}>Monthly</span>
            <div onClick={() => setAnnual(!annual)} style={{ width: '40px', height: '22px', borderRadius: '11px', background: annual ? '#C9A84C' : '#1F1F2E', cursor: 'pointer', position: 'relative', transition: 'background .2s' }}>
              <div style={{ position: 'absolute', top: '2px', left: annual ? '20px' : '2px', width: '18px', height: '18px', borderRadius: '50%', background: 'white', transition: 'left .2s' }} />
            </div>
            <span style={{ fontSize: '13px', color: annual ? '#E8E0F0' : '#5A5570', fontWeight: annual ? 700 : 400 }}>
              Annual <span style={{ color: '#5DC9A0', fontSize: '11px', fontWeight: 800 }}>Save ~30%</span>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '480px', margin: '0 auto' }}>
          {PLANS.map(plan => (
            <div key={plan.id} style={{ background: '#12121A', border: `2px solid ${plan.popular ? plan.color : '#1F1F2E'}`, borderRadius: '16px', padding: '20px', position: 'relative' }}>
              {plan.popular && (
                <div style={{ position: 'absolute', top: '12px', right: '12px', background: plan.color, color: '#0A0A0F', fontSize: '10px', fontWeight: 900, padding: '3px 10px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '.08em' }}>Most popular</div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>{plan.icon}</span>
                <div>
                  <div style={{ fontWeight: 900, fontSize: '18px', color: plan.color }}>{plan.name}</div>
                  <div style={{ fontSize: '12px', color: '#5A5570' }}>{plan.desc}</div>
                </div>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <span style={{ fontSize: '32px', fontWeight: 900 }}>€{annual ? plan.annual : plan.monthly}</span>
                <span style={{ fontSize: '14px', color: '#5A5570' }}>/month</span>
                {annual && <div style={{ fontSize: '11px', color: '#5DC9A0', marginTop: '2px' }}>Billed annually · monthly: €{plan.monthly}/month</div>}
                {!annual && <div style={{ fontSize: '11px', color: '#5A5570', marginTop: '2px' }}>Annual: €{plan.annual}/month (save ~30%)</div>}
              </div>
              <div style={{ marginBottom: '16px' }}>
                {plan.features.map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '5px', fontSize: '13px' }}>
                    <span style={{ color: plan.color, flexShrink: 0 }}>✓</span>
                    <span style={{ color: i === 0 && plan.id !== 'solo' ? '#5A5570' : '#E8E0F0' }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/auth/login#signup" style={{ display: 'block', textAlign: 'center', background: plan.popular ? plan.color : '#1F1F2E', color: plan.popular ? '#0A0A0F' : '#E8E0F0', borderRadius: '10px', padding: '13px', fontWeight: 900, fontSize: '14px', textDecoration: 'none', border: plan.popular ? 'none' : '1px solid #2A2A3E' }}>
                Get started →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Install CTA */}
      <section style={{ padding: '0 20px 48px' }}>
        <div style={{ background: '#12121A', border: '1px solid #1F1F2E', borderRadius: '20px', padding: '28px 20px', textAlign: 'center', maxWidth: '480px', margin: '0 auto' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📱</div>
          <h3 style={{ fontWeight: 900, fontSize: '20px', marginBottom: '8px' }}>Install on your phone</h3>
          <p style={{ fontSize: '13px', color: '#5A5570', lineHeight: 1.6, marginBottom: '16px' }}>
            Add TourDesk to your home screen — full screen, no browser bar, works offline. Available on iPhone & Android.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
            <div style={{ background: '#0A0A0F', borderRadius: '10px', padding: '12px', border: '1px solid #1F1F2E' }}>
              <div style={{ fontWeight: 700, marginBottom: '4px' }}>🍎 iPhone</div>
              <div style={{ color: '#5A5570', fontSize: '12px' }}>Safari → Share → Add to Home Screen</div>
            </div>
            <div style={{ background: '#0A0A0F', borderRadius: '10px', padding: '12px', border: '1px solid #1F1F2E' }}>
              <div style={{ fontWeight: 700, marginBottom: '4px' }}>🤖 Android</div>
              <div style={{ color: '#5A5570', fontSize: '12px' }}>Chrome → ⋮ → Add to Home Screen</div>
            </div>
          </div>
        </div>
      </section>

      {/* Creators */}
      <section style={{ padding: '0 20px 48px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 8px' }}>Built by artists, for artists</h2>
          <p style={{ fontSize: '14px', color: '#5A5570' }}>TourDesk was born from real experience on stage</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', maxWidth: '480px', margin: '0 auto 20px' }}>
          {[
            { name: 'Lola Warin', role: 'Artist Advisor · Drummer', img: '/images/lola.jpeg', color: '#C9A84C' },
            { name: 'Sannie Patron', role: 'Founder & Developer', img: '/images/sannie.jpg', color: '#5DC9A0' },
          ].map((c, i) => (
            <div key={i} style={{ background: '#12121A', border: '1px solid #1F1F2E', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
              <img src={c.img} alt={c.name} style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: `3px solid ${c.color}`, marginBottom: '12px' }} />
              <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '4px' }}>{c.name}</div>
              <div style={{ fontSize: '11px', color: '#5A5570', lineHeight: 1.4 }}>{c.role}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center' }}>
          <Link href="/about" style={{ fontSize: '13px', color: '#C9A84C', textDecoration: 'none', fontWeight: 700 }}>Read our story →</Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #1F1F2E', padding: '24px 20px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
          <div style={{ width: '28px', height: '28px', background: '#C9A84C', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>♩</div>
          <span style={{ fontWeight: 900, fontSize: '16px' }}>TourDesk</span>
        </div>
        <p style={{ fontSize: '12px', color: '#5A5570', marginBottom: '8px' }}>Data stored securely in Europe 🇪🇺 · Encrypted · Never sold</p>
        <p style={{ fontSize: '12px', color: '#5A5570' }}>
          <a href="mailto:hello@tourdesktop.com" style={{ color: '#C9A84C', textDecoration: 'none' }}>Contact</a>
          {' · '}
          <Link href="/about" style={{ color: '#5A5570', textDecoration: 'none' }}>About</Link>
          {' · '}
          <Link href="/auth/login" style={{ color: '#5A5570', textDecoration: 'none' }}>Sign in</Link>
          {' · '}
          <Link href="/auth/login#signup" style={{ color: '#5A5570', textDecoration: 'none' }}>Sign up</Link>
        </p>
      </footer>
    </div>
  )
}
