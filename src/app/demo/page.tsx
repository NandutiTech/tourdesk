'use client'
import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const TODAY = new Date()
const d = (offset: number) => {
  const dt = new Date(TODAY); dt.setDate(dt.getDate() + offset)
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
const ds = (offset: number) => {
  const dt = new Date(TODAY); dt.setDate(dt.getDate() + offset)
  return dt.toISOString().slice(0, 10)
}

const SHOWS = [
  { title: 'Le Trianon', city: 'Paris', offset: 3, type: 'show', cachet: 350, paid: true },
  { title: 'Jazz à Vienne', city: 'Vienne', offset: 8, type: 'show', cachet: 600, paid: true },
  { title: 'Studio Ferber', city: 'Paris', offset: 12, type: 'rehearsal', cachet: 180, paid: false },
  { title: 'Olympia', city: 'Paris', offset: 18, type: 'show', cachet: 450, paid: true },
  { title: 'Victoires 2', city: 'Lyon', offset: 25, type: 'show', cachet: 320, paid: false },
]
const EXPENSES = [
  { desc: 'Taxi CDG → Venue', amount: 42.50, cat: '🚆' },
  { desc: 'Lunch before soundcheck', amount: 18.90, cat: '🍽' },
  { desc: 'Equipment rental', amount: 120, cat: '🎛' },
]
const GUESTS = [
  { name: 'Marie Dupont', count: 2, status: 'confirmed' },
  { name: 'Pierre Laurent', count: 1, status: 'pending' },
  { name: 'Camille Roux', count: 3, status: 'confirmed' },
]
const MEMBERS = [
  { name: 'Sophie Martin', role: 'Singer', tickets: true },
  { name: 'Jean Dubois', role: 'Drummer', tickets: true },
  { name: 'Lola Bernard', role: 'Pianist', tickets: false },
]
const TYPE_C: Record<string,string> = { show: '#C9A84C', rehearsal: '#5DC9A0' }
const ST_C: Record<string,string> = { confirmed: '#5DC9A0', pending: '#C9A84C' }

function SoloDemo() {
  const paid = SHOWS.filter(s => s.paid)
  const hours = paid.length * 12
  const earnings = paid.reduce((s, x) => s + x.cachet, 0)
  return (
    <>
      <div style={{ fontSize: '11px', fontWeight: 800, color: '#C9A84C', letterSpacing: '.1em', marginBottom: '12px' }}>📅 UPCOMING SHOWS</div>
      {SHOWS.map((s, i) => (
        <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #1F1F2E' }}>
          <div style={{ width: '4px', height: '34px', borderRadius: '2px', background: TYPE_C[s.type] || '#5A5570', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '13px' }}>{s.title}</div>
            <div style={{ fontSize: '10px', color: '#5A5570' }}>{d(s.offset)} · {s.city}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: s.paid ? '#5DC9A0' : '#5A5570' }}>€{s.cachet}</div>
            <div style={{ fontSize: '9px', color: s.paid ? '#5DC9A0' : '#3A3550' }}>{s.paid ? '✓ paid' : 'pending'}</div>
          </div>
        </div>
      ))}
      <div style={{ marginTop: '14px', background: '#13131C', borderRadius: '10px', padding: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '12px', color: '#5A5570' }}>Hours this year</span>
          <span style={{ fontWeight: 800, fontSize: '13px' }}>{hours}h / 507h</span>
        </div>
        <div style={{ background: '#0A0A0F', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: '4px', background: 'linear-gradient(90deg, #C9A84C, #5DC9A0)', width: `${Math.min(100, (hours/507)*100)}%` }} />
        </div>
        <div style={{ fontSize: '10px', color: '#5A5570', marginTop: '4px' }}>€{earnings} earned · {507-hours}h remaining</div>
      </div>
    </>
  )
}

function ProDemo() {
  const [sub, setSub] = useState<'shows'|'expenses'|'guests'>('shows')
  return (
    <>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
        {(['shows','expenses','guests'] as const).map(t => (
          <button key={t} onClick={() => setSub(t)} style={{ flex: 1, padding: '7px 4px', borderRadius: '8px', border: `1px solid ${sub===t?'#C9A84C':'#1F1F2E'}`, background: sub===t?'rgba(201,168,76,.1)':'transparent', color: sub===t?'#C9A84C':'#5A5570', cursor: 'pointer', fontFamily: 'inherit', fontSize: '10px', fontWeight: 700 }}>
            {t === 'shows' ? '📅 Shows' : t === 'expenses' ? '💰 Expenses' : '🎫 Guests'}
          </button>
        ))}
      </div>
      {sub === 'shows' && <SoloDemo />}
      {sub === 'expenses' && (
        <>
          <div style={{ background: '#13131C', borderRadius: '10px', padding: '10px 12px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: '#5A5570' }}>Total</span>
            <span style={{ fontWeight: 800, color: '#C9A84C' }}>€{EXPENSES.reduce((s,e) => s+e.amount, 0).toFixed(2)}</span>
          </div>
          {EXPENSES.map((e, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #1F1F2E' }}>
              <div><div style={{ fontWeight: 700, fontSize: '13px' }}>{e.cat} {e.desc}</div></div>
              <div style={{ fontWeight: 800, color: '#C9A84C' }}>€{e.amount.toFixed(2)}</div>
            </div>
          ))}
        </>
      )}
      {sub === 'guests' && (
        <>
          {GUESTS.map((g, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #1F1F2E' }}>
              <div style={{ fontWeight: 700, fontSize: '13px' }}>{g.name}{g.count > 1 ? ` ×${g.count}` : ''}</div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: ST_C[g.status] }}>{g.status === 'confirmed' ? '✓ Confirmed' : '⏳ Pending'}</span>
            </div>
          ))}
        </>
      )}
    </>
  )
}

function ManagerDemo() {
  const [sub, setSub] = useState<'dash'|'show'|'tickets'>('dash')
  return (
    <>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
        {(['dash','show','tickets'] as const).map(t => (
          <button key={t} onClick={() => setSub(t)} style={{ flex: 1, padding: '7px 4px', borderRadius: '8px', border: `1px solid ${sub===t?'#5DC9A0':'#1F1F2E'}`, background: sub===t?'rgba(93,201,160,.1)':'transparent', color: sub===t?'#5DC9A0':'#5A5570', cursor: 'pointer', fontFamily: 'inherit', fontSize: '10px', fontWeight: 700 }}>
            {t === 'dash' ? '📊 Dashboard' : t === 'show' ? '🎪 Show' : '✈ Tickets'}
          </button>
        ))}
      </div>
      {sub === 'dash' && (
        <>
          <div style={{ background: 'linear-gradient(135deg, #1A1020, #13131C)', border: '1px solid rgba(201,168,76,.2)', borderRadius: '12px', padding: '12px', marginBottom: '10px' }}>
            <div style={{ fontSize: '9px', fontWeight: 800, color: '#C9A84C', letterSpacing: '.15em', marginBottom: '4px' }}>📅 NEXT SHOW</div>
            <div style={{ fontWeight: 900, fontSize: '16px' }}>Le Trianon</div>
            <div style={{ fontSize: '11px', color: '#5A5570' }}>{d(3)} · Paris</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
            {[['5','upcoming shows'],['3','members'],['6','guest places'],['€181','expenses']].map(([v, l], i) => (
              <div key={i} style={{ background: '#13131C', border: '1px solid #1F1F2E', borderRadius: '10px', padding: '10px' }}>
                <div style={{ fontSize: '20px', fontWeight: 900, color: i === 3 ? '#C9A84C' : '#E8E0F0' }}>{v}</div>
                <div style={{ fontSize: '10px', color: '#5A5570' }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ background: 'rgba(232,69,60,.06)', border: '1px solid rgba(232,69,60,.2)', borderRadius: '10px', padding: '10px' }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#E8453C', marginBottom: '2px' }}>⚠️ Missing tickets</div>
            <div style={{ fontSize: '11px', color: '#5A5570' }}>Lola Bernard — no tickets yet</div>
          </div>
        </>
      )}
      {sub === 'show' && (
        <>
          <div style={{ fontWeight: 900, fontSize: '15px', marginBottom: '12px' }}>Le Trianon · Paris</div>
          {[['🏨','Accommodation','Hôtel du Nord\n102 Quai de Jemmapes'],['📅','Planning','Arrival: 2pm\nSoundcheck: 4pm\nShow: 8:30pm']].map(([icon, label, val]) => (
            <div key={label} style={{ background: '#13131C', border: '1px solid #1F1F2E', borderRadius: '10px', padding: '12px', marginBottom: '8px' }}>
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#C9A84C', marginBottom: '6px' }}>{icon} {label}</div>
              <div style={{ fontSize: '12px', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{val}</div>
            </div>
          ))}
          <div style={{ background: '#13131C', border: '1px solid rgba(93,201,160,.2)', borderRadius: '10px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '12px', color: '#5DC9A0', fontWeight: 700 }}>📤 Show Pass</div>
            <div style={{ background: '#5DC9A0', color: '#0A0A0F', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', fontWeight: 800 }}>Share QR</div>
          </div>
        </>
      )}
      {sub === 'tickets' && MEMBERS.map(m => (
        <div key={m.name} style={{ background: '#13131C', border: '1px solid #1F1F2E', borderRadius: '10px', padding: '12px', marginBottom: '8px' }}>
          <div style={{ fontWeight: 700, fontSize: '13px' }}>{m.name} <span style={{ fontSize: '10px', color: '#C9A84C', fontWeight: 700 }}>{m.role}</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '8px' }}>
            {['Outbound','Return'].map(dir => (
              <div key={dir} style={{ background: m.tickets ? 'rgba(93,201,160,.08)' : 'rgba(232,69,60,.08)', border: `1px solid ${m.tickets ? 'rgba(93,201,160,.2)' : 'rgba(232,69,60,.2)'}`, borderRadius: '6px', padding: '6px', textAlign: 'center', fontSize: '10px', color: m.tickets ? '#5DC9A0' : '#E8453C', fontWeight: 700 }}>
                {m.tickets ? `✓ ${dir}` : `✕ Missing`}
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

const PLANS = [
  { id: 'solo', label: '🎤 Solo', color: '#5A5570', price: '€9', desc: 'Calendar · 507h · Earnings' },
  { id: 'pro', label: '⭐ Pro', color: '#C9A84C', price: '€19', desc: 'Solo + travel · expenses · guests' },
  { id: 'manager', label: '🎪 Manager', color: '#5DC9A0', price: '€39', desc: 'Full tour management + Show Pass' },
]

function DemoInner() {
  const params = useSearchParams()
  const [plan, setPlan] = useState(params.get('plan') || 'pro')
  const p = PLANS.find(x => x.id === plan)!

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', color: '#E8E0F0', fontFamily: 'system-ui', paddingBottom: '60px' }}>
      <div style={{ background: '#13131C', borderBottom: '1px solid #1F1F2E', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 900, fontSize: '16px' }}>🎭 TourDesk <span style={{ fontSize: '12px', color: '#5A5570', fontWeight: 400 }}>Interactive demo</span></div>
        <Link href="/auth/login#signup" style={{ background: '#C9A84C', color: '#0A0A0F', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: 900, textDecoration: 'none' }}>Get started →</Link>
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', color: '#5A5570', marginBottom: '12px' }}>Switch plans to see what's included</div>
          <div style={{ display: 'inline-flex', gap: '6px', background: '#13131C', border: '1px solid #1F1F2E', borderRadius: '12px', padding: '6px' }}>
            {PLANS.map(x => (
              <button key={x.id} onClick={() => setPlan(x.id)} style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: plan===x.id ? x.color : 'transparent', color: plan===x.id ? '#0A0A0F' : '#5A5570', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 800 }}>
                {x.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: '12px', color: '#5A5570', marginTop: '8px' }}>{p.desc}</div>
        </div>

        {/* Demo phone mockup */}
        <div style={{ background: '#13131C', border: '2px solid #1F1F2E', borderRadius: '20px', overflow: 'hidden', maxWidth: '380px', margin: '0 auto 24px' }}>
          <div style={{ background: '#0A0A0F', padding: '8px 16px', borderBottom: '1px solid #1F1F2E', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color }} />
            <div style={{ fontSize: '11px', color: '#5A5570', fontWeight: 700 }}>TourDesk · {p.label.split(' ')[1]} plan</div>
          </div>
          <div style={{ padding: '16px', minHeight: '360px' }}>
            {plan === 'solo' && <SoloDemo />}
            {plan === 'pro' && <ProDemo />}
            {plan === 'manager' && <ManagerDemo />}
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '15px', fontWeight: 800, marginBottom: '4px' }}>{p.price}/month <span style={{ fontSize: '12px', color: '#5DC9A0', fontWeight: 700 }}>· 14 days free</span></div>
          <div style={{ fontSize: '12px', color: '#5A5570', marginBottom: '16px' }}>No credit card required</div>
          <Link href="/auth/login#signup" style={{ display: 'inline-block', background: p.color, color: '#0A0A0F', borderRadius: '12px', padding: '14px 32px', fontWeight: 900, fontSize: '15px', textDecoration: 'none' }}>
            Start free trial →
          </Link>
          <div style={{ marginTop: '12px' }}>
            <Link href="/landing" style={{ fontSize: '12px', color: '#5A5570', textDecoration: 'none' }}>← Back to pricing</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DemoPage() {
  return (
    <Suspense fallback={<div style={{ background: '#0A0A0F', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5A5570', fontFamily: 'system-ui' }}>Loading...</div>}>
      <DemoInner />
    </Suspense>
  )
}
