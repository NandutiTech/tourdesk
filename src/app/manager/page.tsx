'use client'
import { useRouter } from 'next/navigation'

const COMPARED = [
  { feature: 'AI ticket reading', us: true, them: false },
  { feature: 'Show Pass — no app needed', us: true, them: false },
  { feature: 'QR code sharing', us: true, them: false },
  { feature: 'Push notifications', us: true, them: false },
  { feature: 'Expense tracking with receipts', us: true, them: false },
  { feature: 'PDF export', us: true, them: true },
  { feature: 'Team management', us: true, them: true },
  { feature: 'Hotel & planning info', us: true, them: true },
  { feature: 'Guest list', us: true, them: true },
  { feature: 'Group chat', us: true, them: true },
]

const STEPS = [
  { icon: '📄', title: 'Import your planning', desc: 'Drop the promoter PDF — Claude reads it and creates all shows automatically.' },
  { icon: '👥', title: 'Add your team', desc: 'Add musicians, technicians and crew. Invite them by email in one click.' },
  { icon: '✈', title: 'Upload tickets', desc: 'Photo or PDF — AI reads the route, time and reference automatically.' },
  { icon: '📤', title: 'Share the Show Pass', desc: 'One QR code. The artist scans it and sees everything. No app needed.' },
]

export default function ManagerLandingPage() {
  const router = useRouter()

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', color: '#E8E0F0', fontFamily: 'system-ui', maxWidth: '480px', margin: '0 auto', paddingBottom: '60px' }}>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(180deg, #13131C 0%, #0A0A0F 100%)', padding: '40px 20px 32px', textAlign: 'center', borderBottom: '1px solid #1F1F2E' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎪</div>
        <h1 style={{ fontWeight: 900, fontSize: '28px', margin: '0 0 12px', lineHeight: 1.1 }}>
          Tour management<br /><span style={{ color: '#5DC9A0' }}>without the chaos</span>
        </h1>
        <p style={{ fontSize: '15px', color: '#5A5570', margin: '0 0 28px', lineHeight: 1.6 }}>
          Everything your team needs for the show — tickets, hotel, planning, guests — in one QR code.
        </p>
        <button onClick={() => router.push('/app2/manager')} style={{ background: '#5DC9A0', border: 'none', color: '#0A0A0F', borderRadius: '14px', padding: '16px 32px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 900, fontSize: '16px', marginBottom: '12px', width: '100%' }}>
          Try Manager free →
        </button>
        <div style={{ fontSize: '12px', color: '#5A5570' }}>No credit card · 14 day free trial</div>
      </div>

      {/* The WOW moment */}
      <div style={{ padding: '32px 20px', borderBottom: '1px solid #1F1F2E' }}>
        <div style={{ fontSize: '11px', fontWeight: 800, color: '#5DC9A0', letterSpacing: '.15em', marginBottom: '16px', textTransform: 'uppercase' }}>The moment that sells itself</div>
        <div style={{ background: '#13131C', border: '1px solid rgba(93,201,160,.2)', borderRadius: '16px', padding: '20px', marginBottom: '12px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📤 → 📱</div>
          <div style={{ fontWeight: 800, fontSize: '16px', marginBottom: '8px' }}>You share a QR code.<br />They scan. Done.</div>
          <div style={{ fontSize: '13px', color: '#5A5570', lineHeight: 1.7 }}>
            The artist opens their phone, scans the QR, types their name — and instantly sees their train ticket ready to scan at the station, the hotel address with Maps, the setlist, and the group chat.<br /><br />
            <strong style={{ color: '#E8E0F0' }}>No app. No account. No password.</strong>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div style={{ padding: '32px 20px', borderBottom: '1px solid #1F1F2E' }}>
        <div style={{ fontSize: '11px', fontWeight: 800, color: '#5DC9A0', letterSpacing: '.15em', marginBottom: '20px', textTransform: 'uppercase' }}>How it works</div>
        {STEPS.map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
            <div style={{ width: '40px', height: '40px', background: 'rgba(93,201,160,.1)', border: '1px solid rgba(93,201,160,.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>{s.icon}</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '4px' }}>{s.title}</div>
              <div style={{ fontSize: '13px', color: '#5A5570', lineHeight: 1.6 }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* vs oTour */}
      <div style={{ padding: '32px 20px', borderBottom: '1px solid #1F1F2E' }}>
        <div style={{ fontSize: '11px', fontWeight: 800, color: '#5DC9A0', letterSpacing: '.15em', marginBottom: '20px', textTransform: 'uppercase' }}>TourDesk vs the rest</div>
        <div style={{ background: '#13131C', border: '1px solid #1F1F2E', borderRadius: '14px', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 0 }}>
            <div style={{ padding: '10px 14px', fontSize: '10px', fontWeight: 800, color: '#5A5570', textTransform: 'uppercase', borderBottom: '1px solid #1F1F2E' }}>Feature</div>
            <div style={{ padding: '10px 16px', fontSize: '10px', fontWeight: 800, color: '#5DC9A0', textAlign: 'center', borderBottom: '1px solid #1F1F2E', textTransform: 'uppercase' }}>TourDesk</div>
            <div style={{ padding: '10px 16px', fontSize: '10px', fontWeight: 800, color: '#5A5570', textAlign: 'center', borderBottom: '1px solid #1F1F2E', textTransform: 'uppercase' }}>Others</div>
            {COMPARED.map((c, i) => (
              <>
                <div key={`f-${i}`} style={{ padding: '11px 14px', fontSize: '12px', borderBottom: i < COMPARED.length - 1 ? '1px solid #1F1F2E' : 'none', color: c.us && !c.them ? '#E8E0F0' : '#5A5570' }}>{c.feature}</div>
                <div key={`u-${i}`} style={{ padding: '11px 16px', textAlign: 'center', borderBottom: i < COMPARED.length - 1 ? '1px solid #1F1F2E' : 'none', fontSize: '16px' }}>{c.us ? '✓' : '✕'}</div>
                <div key={`t-${i}`} style={{ padding: '11px 16px', textAlign: 'center', borderBottom: i < COMPARED.length - 1 ? '1px solid #1F1F2E' : 'none', fontSize: '16px', color: c.them ? '#5A5570' : '#E8453C' }}>{c.them ? '✓' : '✕'}</div>
              </>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div style={{ padding: '32px 20px', borderBottom: '1px solid #1F1F2E' }}>
        <div style={{ fontSize: '11px', fontWeight: 800, color: '#5DC9A0', letterSpacing: '.15em', marginBottom: '20px', textTransform: 'uppercase' }}>Simple pricing</div>
        <div style={{ background: '#13131C', border: '2px solid #5DC9A0', borderRadius: '16px', padding: '24px 20px', textAlign: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#5DC9A0', marginBottom: '8px' }}>Manager Plan</div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '4px', marginBottom: '4px' }}>
            <span style={{ fontSize: '42px', fontWeight: 900 }}>€39</span>
            <span style={{ fontSize: '14px', color: '#5A5570' }}>/month</span>
          </div>
          <div style={{ fontSize: '13px', color: '#5DC9A0', marginBottom: '20px' }}>or €29/month billed annually</div>
          <button onClick={() => router.push('/app2/manager')} style={{ width: '100%', background: '#5DC9A0', border: 'none', color: '#0A0A0F', borderRadius: '12px', padding: '14px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 900, fontSize: '15px', marginBottom: '12px' }}>
            Start free trial →
          </button>
          <div style={{ fontSize: '11px', color: '#5A5570' }}>14 days free · cancel anytime</div>
        </div>
        <div style={{ textAlign: 'center', fontSize: '13px', color: '#5A5570' }}>
          Already use TourDesk? <span onClick={() => router.push('/app2/pricing')} style={{ color: '#5DC9A0', cursor: 'pointer' }}>Upgrade from your account →</span>
        </div>
      </div>

      {/* Final CTA */}
      <div style={{ padding: '32px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '22px', fontWeight: 900, marginBottom: '8px' }}>Ready to try it?</div>
        <div style={{ fontSize: '14px', color: '#5A5570', marginBottom: '24px', lineHeight: 1.6 }}>Import your first tour PDF and send the Show Pass to your team in under 5 minutes.</div>
        <button onClick={() => router.push('/app2/manager')} style={{ width: '100%', background: '#5DC9A0', border: 'none', color: '#0A0A0F', borderRadius: '14px', padding: '16px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 900, fontSize: '16px' }}>
          Get started free →
        </button>
        <div style={{ marginTop: '24px', fontSize: '12px', color: '#3A3550' }}>
          <a href="https://tourdesktop.com" style={{ color: '#3A3550', textDecoration: 'none' }}>TourDesk</a> · Made for music professionals
        </div>
      </div>
    </div>
  )
}
