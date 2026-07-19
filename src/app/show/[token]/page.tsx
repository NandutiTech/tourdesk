'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'

const STATUS_COLORS: Record<string, string> = { confirmed: '#5DC9A0', pending: '#C9A84C', cancelled: '#E8453C' }
const STATUS_LABELS: Record<string, string> = { confirmed: '✓ Confirmed', pending: '⏳ Pending', cancelled: '✕ Cancelled' }

async function api(action: string, data: any = {}) {
  const res = await fetch('/api/show-public', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...data })
  })
  return res.json()
}

function makeId() { return Math.random().toString(36).slice(2, 18) }

function showToast(msg: string) {
  const el = document.createElement('div')
  el.textContent = msg
  el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#5DC9A0;color:#0A0A0F;padding:10px 20px;border-radius:10px;font-weight:800;font-size:13px;z-index:9999;'
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 2500)
}

// ── Boarding Pass ticket card ────────────────────────────────────────────────
function TicketCard({ t, color, onShow }: any) {
  const hasInfo = t.info?.from || t.info?.to
  return (
    <div style={{ background: '#13131C', borderRadius: '16px', overflow: 'hidden', marginBottom: '10px', border: `1px solid ${color}30` }}>
      {/* Top */}
      <div style={{ padding: '16px 16px 0', borderBottom: `1px dashed ${color}30` }}>
        {hasInfo ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 900 }}>{t.info.from?.split(' ')[0] || '?'}</div>
              <div style={{ fontSize: '10px', color: '#5A5570', marginTop: '2px' }}>{t.info.from}</div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div style={{ fontSize: '10px', color: color, fontWeight: 700 }}>{t.info.time || ''}</div>
              <div style={{ height: '1px', width: '100%', background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
              <div style={{ fontSize: '10px', color: '#5A5570' }}>{t.info.ref || ''}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 900 }}>{t.info.to?.split(' ')[0] || '?'}</div>
              <div style={{ fontSize: '10px', color: '#5A5570', marginTop: '2px' }}>{t.info.to}</div>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', color: '#5A5570' }}>{t.ticket_name}</div>
        )}
        {t.info?.date && (
          <div style={{ fontSize: '11px', color: '#5A5570', marginBottom: '14px' }}>📅 {t.info.date}{t.info.seat ? ` · 💺 ${t.info.seat}` : ''}</div>
        )}
      </div>
      {/* Bottom */}
      <div style={{ padding: '12px 16px' }}>
        <button onClick={onShow} style={{ width: '100%', background: color, border: 'none', color: '#0A0A0F', borderRadius: '10px', padding: '12px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', fontWeight: 900, letterSpacing: '.02em' }}>
          📱 Show ticket to scan
        </button>
      </div>
    </div>
  )
}

export default function ShowPublicPage() {
  const { token } = useParams()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [memberName, setMemberName] = useState('')
  const [memberNameInput, setMemberNameInput] = useState('')
  const [matchedMember, setMatchedMember] = useState<any>(null)
  const [tab, setTab] = useState('info')
  const [viewing, setViewing] = useState<any>(null)
  const [chatMsg, setChatMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [addingGuest, setAddingGuest] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [guestCount, setGuestCount] = useState('1')

  useEffect(() => {
    fetch(`/api/show-public?token=${token}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); setLoading(false) })
  }, [token])

  useEffect(() => {
    if (!data) return
    const saved = localStorage.getItem(`show-member-${token}`)
    if (saved) {
      try {
        const { id, name } = JSON.parse(saved)
        setMemberName(name); setMemberNameInput(name)
        if (id) { const m = data.members?.find((m: any) => m.id === id); if (m) setMatchedMember(m) }
      } catch {}
    }
  }, [data])

  const identify = () => {
    if (!memberNameInput.trim()) return
    const name = memberNameInput.trim().toLowerCase()
    const match = data?.members?.find((m: any) => m.name.toLowerCase().includes(name) || name.includes(m.name.toLowerCase().split(' ')[0]))
    setMatchedMember(match || null)
    setMemberName(memberNameInput.trim())
    localStorage.setItem(`show-member-${token}`, JSON.stringify({ id: match?.id || null, name: memberNameInput.trim() }))
  }

  const sendMsg = async () => {
    if (!chatMsg.trim() || sending) return
    setSending(true)
    const newMsg = { id: makeId(), is_manager: false, sender_name: memberName || 'Guest', message: chatMsg, created_at: new Date().toISOString() }
    setData((d: any) => ({ ...d, messages: [...(d.messages || []), newMsg] }))
    setChatMsg('')
    await api('send_message', { token, message: chatMsg, senderName: memberName || 'Guest', isManager: false })
    setSending(false)
  }

  const addGuest = async () => {
    if (!guestName.trim()) return
    await api('add_guest', { token, name: guestName.trim(), count: parseInt(guestCount) || 1, memberId: matchedMember?.id || null })
    setGuestName(''); setGuestCount('1'); setAddingGuest(false)
    const updated = await fetch(`/api/show-public?token=${token}`).then(r => r.json())
    if (updated.guests) setData((d: any) => ({ ...d, guests: updated.guests }))
    showToast('Guest added ✓')
  }

  const viewTicket = async (t: any) => {
    const res = await api('get_ticket', { token, ticketId: t.id })
    if (res.ticket_data) setViewing({ ticket_data: res.ticket_data, ticket_name: t.ticket_name, ticket_mime: t.ticket_mime })
  }

  if (loading) return <div style={{ minHeight: '100vh', background: '#0A0A0F', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5A5570', fontFamily: 'system-ui' }}>Loading...</div>

  if (error) return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#E8E0F0', fontFamily: 'system-ui', padding: '24px', textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎭</div>
      <div style={{ fontWeight: 800, fontSize: '18px' }}>Show not found</div>
      <div style={{ fontSize: '13px', color: '#5A5570', marginTop: '8px' }}>This link may have expired.</div>
    </div>
  )

  const { show, tour, members, tickets, guests, messages, docs } = data
  const myTickets = matchedMember ? tickets.filter((t: any) => t.member_id === matchedMember.id) : []
  const outTickets = myTickets.filter((t: any) => t.direction === 'out')
  const retTickets = myTickets.filter((t: any) => t.direction === 'ret')
  const hasMyTickets = myTickets.length > 0

  const TABS = [
    { id: 'tickets', icon: '✈', label: 'Tickets' },
    { id: 'info', icon: '📋', label: 'Info' },
    { id: 'guests', icon: '🎫', label: 'Guests' },
    { id: 'chat', icon: '💬', label: 'Chat' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', color: '#E8E0F0', fontFamily: 'system-ui', maxWidth: '480px', margin: '0 auto' }}>

      {/* Hero header — boarding pass style */}
      <div style={{ background: 'linear-gradient(135deg, #13131C 0%, #1A1020 100%)', padding: '24px 20px 20px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(201,168,76,.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', opacity: 0.6 }}>
          <img src="/images/tourdesk-logo.png" alt="TourDesk" style={{ height: '18px' }} />
          {tour?.name && <span style={{ fontSize: '12px', color: '#5A5570' }}>· {tour.name}</span>}
        </div>
        <div style={{ fontSize: '26px', fontWeight: 900, lineHeight: 1.1, marginBottom: '8px' }}>{show.venue || 'Show'}</div>
        <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#5A5570' }}>
          <span>📅 {new Date(show.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' })}</span>
          {show.city && <span>📍 {show.city}</span>}
        </div>
        {matchedMember && (
          <div style={{ marginTop: '12px', background: 'rgba(201,168,76,.1)', border: '1px solid rgba(201,168,76,.2)', borderRadius: '8px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#C9A84C', fontWeight: 700 }}>👤 {matchedMember.name}{matchedMember.role ? ` · ${matchedMember.role}` : ''}</span>
            <button onClick={() => { setMemberName(''); setMatchedMember(null); localStorage.removeItem(`show-member-${token}`) }} style={{ background: 'none', border: 'none', color: '#5A5570', cursor: 'pointer', fontSize: '11px' }}>Change</button>
          </div>
        )}
      </div>

      {/* Identity prompt */}
      {!memberName && (
        <div style={{ padding: '24px 20px' }}>
          <div style={{ background: '#13131C', border: '1px solid #1F1F2E', borderRadius: '20px', padding: '28px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>👋</div>
            <div style={{ fontWeight: 800, fontSize: '17px', marginBottom: '6px' }}>Who are you?</div>
            <div style={{ fontSize: '13px', color: '#5A5570', marginBottom: '20px' }}>Enter your name to see your tickets</div>
            <input value={memberNameInput} onChange={e => setMemberNameInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && identify()}
              placeholder="Your name..." autoFocus
              style={{ width: '100%', background: 'rgba(255,255,255,.06)', border: '2px solid #1F1F2E', color: '#E8E0F0', borderRadius: '12px', padding: '14px 16px', fontFamily: 'inherit', fontSize: '16px', outline: 'none', boxSizing: 'border-box', marginBottom: '12px' }} />
            <button onClick={identify} style={{ width: '100%', background: '#C9A84C', border: 'none', color: '#0A0A0F', borderRadius: '12px', padding: '14px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 900, fontSize: '15px' }}>
              Enter →
            </button>
          </div>
        </div>
      )}

      {memberName && (
        <>
          {/* Tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', background: '#13131C', borderBottom: '1px solid #1F1F2E' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '12px 4px', border: 'none', background: 'none', color: tab === t.id ? '#C9A84C' : '#5A5570', cursor: 'pointer', fontFamily: 'inherit', fontSize: '10px', fontWeight: 700, borderBottom: `2px solid ${tab === t.id ? '#C9A84C' : 'transparent'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                <span style={{ fontSize: '18px' }}>{t.icon}</span>{t.label}
                {t.id === 'tickets' && hasMyTickets && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#5DC9A0', position: 'absolute', marginTop: '-22px', marginLeft: '10px' }} />}
              </button>
            ))}
          </div>

          <div style={{ padding: '16px 20px 80px' }}>
            {/* Tickets tab */}
            {tab === 'tickets' && (
              <>
                {!matchedMember ? (
                  <div style={{ textAlign: 'center', padding: '48px 0', color: '#5A5570' }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
                    <div style={{ fontWeight: 700, marginBottom: '4px' }}>Name not found</div>
                    <div style={{ fontSize: '13px' }}>Ask your manager to add you to the team</div>
                  </div>
                ) : myTickets.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 0', color: '#5A5570' }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>✈</div>
                    <div style={{ fontWeight: 700, marginBottom: '4px' }}>No tickets yet</div>
                    <div style={{ fontSize: '13px' }}>Your manager will upload them soon</div>
                  </div>
                ) : (
                  <>
                    {outTickets.length > 0 && (
                      <>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: '#C9A84C', letterSpacing: '.15em', marginBottom: '10px' }}>✈ OUTBOUND</div>
                        {outTickets.map((t: any) => <TicketCard key={t.id} t={t} color="#C9A84C" onShow={() => viewTicket(t)} />)}
                      </>
                    )}
                    {retTickets.length > 0 && (
                      <>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: '#5DC9A0', letterSpacing: '.15em', marginBottom: '10px', marginTop: outTickets.length > 0 ? '16px' : 0 }}>🔄 RETURN</div>
                        {retTickets.map((t: any) => <TicketCard key={t.id} t={t} color="#5DC9A0" onShow={() => viewTicket(t)} />)}
                      </>
                    )}
                  </>
                )}
              </>
            )}

            {/* Info tab */}
            {tab === 'info' && (
              <>
                {[
                  { key: 'hotel', icon: '🏨', label: 'Accommodation' },
                  { key: 'transfers', icon: '🚌', label: 'Transfers' },
                  { key: 'meals', icon: '🍽', label: 'Meals' },
                  { key: 'planning', icon: '📅', label: 'Planning' },
                  { key: 'technique', icon: '🎛', label: 'Technical' },
                  { key: 'setlist', icon: '🎵', label: 'Setlist' },
                ].filter(f => show[f.key]).map(f => (
                  <div key={f.key} style={{ background: '#13131C', border: '1px solid #1F1F2E', borderRadius: '14px', padding: '16px', marginBottom: '10px' }}>
                    <div style={{ fontWeight: 800, fontSize: '12px', color: '#C9A84C', letterSpacing: '.08em', marginBottom: '10px', textTransform: 'uppercase' }}>{f.icon} {f.label}</div>
                    <div style={{ fontSize: '14px', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{show[f.key]}</div>
                    {f.key === 'hotel' && show.hotel_addr && (
                      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(show.hotel_addr)}`} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '12px', background: '#4285F4', color: 'white', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: 800, textDecoration: 'none' }}>
                        🗺 Open in Maps
                      </a>
                    )}
                    {f.key === 'hotel' && show.hotel_notes && <div style={{ fontSize: '12px', color: '#C9A84C', marginTop: '10px', fontStyle: 'italic' }}>{show.hotel_notes}</div>}
                  </div>
                ))}
                {docs?.length > 0 && (
                  <div style={{ background: '#13131C', border: '1px solid #1F1F2E', borderRadius: '14px', padding: '16px', marginBottom: '10px' }}>
                    <div style={{ fontWeight: 800, fontSize: '12px', color: '#C9A84C', letterSpacing: '.08em', marginBottom: '12px', textTransform: 'uppercase' }}>📄 Documents</div>
                    {docs.map((d: any) => (
                      <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid #1F1F2E' }}>
                        <span style={{ fontSize: '20px' }}>{d.mime?.startsWith('image') ? '🖼' : '📄'}</span>
                        <span style={{ flex: 1, fontSize: '13px' }}>{d.name}</span>
                        <button onClick={async () => { const res = await api('get_document', { token, docId: d.id }); if (res.data) setViewing({ ticket_data: res.data, ticket_name: d.name, ticket_mime: d.mime }) }} style={{ background: '#C9A84C', border: 'none', color: '#0A0A0F', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', fontWeight: 800 }}>View</button>
                      </div>
                    ))}
                  </div>
                )}
                {!show.hotel && !show.transfers && !show.meals && !show.planning && !show.technique && docs?.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#5A5570', fontSize: '13px', padding: '48px 0' }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>📋</div>
                    Info will appear here when your manager adds it
                  </div>
                )}
              </>
            )}

            {/* Guests tab */}
            {tab === 'guests' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ fontSize: '13px', color: '#5A5570' }}>{guests?.length || 0} guests · {guests?.reduce((s: number, g: any) => s + (g.count || 1), 0) || 0} places</div>
                  <button onClick={() => setAddingGuest(true)} style={{ background: '#C9A84C', border: 'none', color: '#0A0A0F', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 800 }}>+ Add guest</button>
                </div>
                {addingGuest && (
                  <div style={{ background: '#13131C', border: '1px solid #1F1F2E', borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#C9A84C', marginBottom: '10px' }}>New guest</div>
                    <input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Guest name *" style={{ width: '100%', background: 'rgba(255,255,255,.06)', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '8px', padding: '10px 12px', fontFamily: 'inherit', fontSize: '14px', outline: 'none', boxSizing: 'border-box', marginBottom: '8px' }} />
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px', marginBottom: '12px' }}>
                      <div style={{ fontSize: '11px', color: '#5A5570', display: 'flex', alignItems: 'center' }}>Places:</div>
                      <input type="number" value={guestCount} onChange={e => setGuestCount(e.target.value)} min="1" max="10" style={{ background: 'rgba(255,255,255,.06)', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '8px', padding: '8px 12px', fontFamily: 'inherit', fontSize: '14px', outline: 'none' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => { setAddingGuest(false); setGuestName(''); setGuestCount('1') }} style={{ flex: 1, background: 'none', border: '1px solid #1F1F2E', color: '#5A5570', borderRadius: '8px', padding: '10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}>Cancel</button>
                      <button onClick={addGuest} style={{ flex: 2, background: '#C9A84C', border: 'none', color: '#0A0A0F', borderRadius: '8px', padding: '10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: 800 }}>Add</button>
                    </div>
                  </div>
                )}
                {guests?.length === 0 && !addingGuest ? (
                  <div style={{ textAlign: 'center', color: '#5A5570', fontSize: '13px', padding: '48px 0' }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎫</div>
                    No guests yet — add yours!
                  </div>
                ) : guests?.map((g: any) => (
                  <div key={g.id} style={{ background: '#13131C', border: '1px solid #1F1F2E', borderRadius: '12px', padding: '12px 14px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>{g.name}{g.count > 1 ? ` ×${g.count}` : ''}</div>
                      {g.member_id && <div style={{ fontSize: '11px', color: '#C9A84C', marginTop: '2px' }}>for {members?.find((m: any) => m.id === g.member_id)?.name || ''}</div>}
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: STATUS_COLORS[g.status] }}>{STATUS_LABELS[g.status]}</span>
                  </div>
                ))}
              </>
            )}

            {/* Chat tab */}
            {tab === 'chat' && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px', maxHeight: '50vh', overflowY: 'auto' }}>
                  {messages?.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#5A5570', fontSize: '13px', padding: '48px 0' }}>
                      <div style={{ fontSize: '32px', marginBottom: '12px' }}>💬</div>
                      No messages yet
                    </div>
                  ) : messages?.map((m: any) => (
                    <div key={m.id} style={{ alignSelf: m.is_manager ? 'flex-start' : 'flex-end', maxWidth: '82%' }}>
                      <div style={{ fontSize: '10px', color: '#5A5570', marginBottom: '3px', textAlign: m.is_manager ? 'left' : 'right' }}>
                        {m.sender_name}{m.is_manager ? ' · Manager' : ''}
                      </div>
                      <div style={{ background: m.is_manager ? '#1A1A28' : 'rgba(201,168,76,.15)', border: `1px solid ${m.is_manager ? '#1F1F2E' : 'rgba(201,168,76,.3)'}`, borderRadius: m.is_manager ? '14px 14px 14px 4px' : '14px 14px 4px 14px', padding: '10px 14px', fontSize: '14px', lineHeight: 1.5 }}>
                        {m.message}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px', position: 'sticky', bottom: '16px' }}>
                  <input value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && !sending && sendMsg()}
                    placeholder={`Message as ${memberName || 'Guest'}...`}
                    style={{ flex: 1, background: '#13131C', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '12px', padding: '12px 14px', fontFamily: 'inherit', fontSize: '14px', outline: 'none' }} />
                  <button onClick={sendMsg} disabled={sending} style={{ background: '#C9A84C', border: 'none', color: '#0A0A0F', borderRadius: '12px', padding: '12px 16px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: '14px', opacity: sending ? 0.6 : 1 }}>
                    {sending ? '...' : '→'}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Full screen ticket viewer */}
      {viewing && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#000', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#0A0A0F' }}>
            <div style={{ fontWeight: 700, fontSize: '14px', color: 'white' }}>{viewing.ticket_name}</div>
            <button onClick={() => setViewing(null)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '28px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            {viewing.ticket_data?.startsWith('data:image') && <img src={viewing.ticket_data} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />}
            {viewing.ticket_data?.startsWith('data:application/pdf') && <iframe src={viewing.ticket_data} style={{ width: '100%', height: '100%', border: 'none' }} />}
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', padding: '8px', fontSize: '10px', color: '#2A2535' }}>
        <a href="https://tourdesktop.com" style={{ color: '#3A3550', textDecoration: 'none' }}>Powered by TourDesk</a>
      </div>
    </div>
  )
}
