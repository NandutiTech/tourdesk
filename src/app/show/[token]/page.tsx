'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'

const CATS: Record<string, string> = { transport: '🚆 Transport', hotel: '🏨 Hotel', food: '🍽 Food', equipment: '🎛 Equipment', other: '📦 Other' }
const STATUS_COLORS: Record<string, string> = { confirmed: '#5DC9A0', pending: '#C9A84C', cancelled: '#E8453C' }
const STATUS_LABELS: Record<string, string> = { confirmed: '✓ Confirmed', pending: '⏳ Pending', cancelled: '✕ Cancelled' }

async function api(action: string, data: any = {}) {
  const res = await fetch('/api/show-public', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...data })
  })
  return res.json()
}

function makeId() { return Math.random().toString(36).slice(2, 18) }

export default function ShowPublicPage() {
  const { token } = useParams()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [memberName, setMemberName] = useState('')
  const [memberNameInput, setMemberNameInput] = useState('')
  const [matchedMember, setMatchedMember] = useState<any>(null)
  const [tab, setTab] = useState<string>('info')
  const [viewing, setViewing] = useState<any>(null)
  const [chatMsg, setChatMsg] = useState('')
  const [sending, setSending] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/show-public?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setData(d)
        setLoading(false)
      })
  }, [token])

  const identifyMember = () => {
    if (!memberNameInput.trim()) return
    const name = memberNameInput.trim().toLowerCase()
    const match = data?.members?.find((m: any) =>
      m.name.toLowerCase().includes(name) || name.includes(m.name.toLowerCase())
    )
    if (match) {
      setMatchedMember(match)
      setMemberName(memberNameInput.trim())
      localStorage.setItem(`show-member-${token}`, JSON.stringify({ id: match.id, name: match.name }))
    } else {
      setMemberName(memberNameInput.trim())
      localStorage.setItem(`show-member-${token}`, JSON.stringify({ id: null, name: memberNameInput.trim() }))
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem(`show-member-${token}`)
    if (saved) {
      try {
        const { id, name } = JSON.parse(saved)
        setMemberName(name)
        setMemberNameInput(name)
        if (id && data?.members) {
          const m = data.members.find((m: any) => m.id === id)
          if (m) setMatchedMember(m)
        }
      } catch {}
    }
  }, [data])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5A5570', fontFamily: 'system-ui' }}>
      Loading...
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#E8E0F0', fontFamily: 'system-ui', padding: '16px', textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎭</div>
      <div style={{ fontWeight: 800, fontSize: '18px', marginBottom: '8px' }}>Show not found</div>
      <div style={{ fontSize: '13px', color: '#5A5570' }}>This link may have expired or is invalid.</div>
    </div>
  )

  const { show, tour, members, tickets, guests, messages, docs } = data

  const myTickets = matchedMember ? tickets.filter((t: any) => t.member_id === matchedMember.id) : []
  const outTickets = myTickets.filter((t: any) => t.direction === 'out')
  const retTickets = myTickets.filter((t: any) => t.direction === 'ret')

  const TABS = [
    { id: 'info', icon: '📋', label: 'Info' },
    { id: 'tickets', icon: '✈', label: 'My tickets' },
    { id: 'guests', icon: '🎫', label: 'Guests' },
    { id: 'chat', icon: '💬', label: 'Chat' },
  ]

  const sendMessage = async () => {
    if (!chatMsg.trim() || sending) return
    setSending(true)
    const newMsg = { id: makeId(), is_manager: false, sender_name: memberName || 'Guest', message: chatMsg, created_at: new Date().toISOString() }
    setData((d: any) => ({ ...d, messages: [...(d.messages || []), newMsg] }))
    setChatMsg('')
    await api('send_message', { token, message: chatMsg, senderName: memberName || 'Guest', isManager: false })
    setSending(false)
  }

  const addGuest = async (name: string, count: number) => {
    await api('add_guest', { token, name, count, memberId: matchedMember?.id || null, memberName: memberName || 'Guest' })
    const updated = await fetch(`/api/show-public?token=${token}`).then(r => r.json())
    if (updated.guests) setData((d: any) => ({ ...d, guests: updated.guests }))
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', color: '#E8E0F0', fontFamily: 'system-ui', maxWidth: '600px', margin: '0 auto', padding: '0 0 80px' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(180deg, #13131C 0%, #0A0A0F 100%)', padding: '24px 16px 16px', borderBottom: '1px solid #1F1F2E' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <img src="/images/tourdesk-logo.png" alt="TourDesk" style={{ height: '24px', opacity: 0.8 }} />
        </div>
        <div style={{ fontWeight: 900, fontSize: '20px', lineHeight: 1.2, marginBottom: '4px' }}>{show.venue || 'Show'}</div>
        <div style={{ fontSize: '13px', color: '#5A5570' }}>
          📅 {show.date}{show.city ? ` · ${show.city}` : ''}
          {tour?.name && <span style={{ color: '#C9A84C' }}> · {tour.name}</span>}
        </div>
      </div>

      {/* Identity */}
      {!memberName ? (
        <div style={{ padding: '24px 16px' }}>
          <div style={{ background: '#13131C', border: '1px solid #1F1F2E', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>👋</div>
            <div style={{ fontWeight: 800, fontSize: '16px', marginBottom: '8px' }}>Who are you?</div>
            <div style={{ fontSize: '13px', color: '#5A5570', marginBottom: '20px' }}>Enter your name to see your tickets and info</div>
            <input
              value={memberNameInput} onChange={e => setMemberNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && identifyMember()}
              placeholder="Your name..."
              style={{ width: '100%', background: 'rgba(255,255,255,.06)', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '10px', padding: '12px 16px', fontFamily: 'inherit', fontSize: '16px', outline: 'none', boxSizing: 'border-box', marginBottom: '12px' }}
            />
            <button onClick={identifyMember} style={{ width: '100%', background: '#C9A84C', border: 'none', color: '#0A0A0F', borderRadius: '10px', padding: '13px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: '15px' }}>
              Enter →
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Member greeting */}
          <div style={{ padding: '12px 16px', background: matchedMember ? 'rgba(93,201,160,.06)' : 'rgba(201,168,76,.06)', borderBottom: '1px solid #1F1F2E', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '13px' }}>
              {matchedMember ? <span style={{ color: '#5DC9A0' }}>✓ Hi {matchedMember.name}{matchedMember.role ? ` · ${matchedMember.role}` : ''}</span>
                : <span style={{ color: '#C9A84C' }}>👤 {memberName}</span>}
            </div>
            <button onClick={() => { setMemberName(''); setMatchedMember(null); localStorage.removeItem(`show-member-${token}`) }} style={{ background: 'none', border: 'none', color: '#5A5570', cursor: 'pointer', fontSize: '11px' }}>Change</button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #1F1F2E', background: '#13131C' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: '12px 4px', border: 'none', background: 'none', color: tab === t.id ? '#C9A84C' : '#5A5570', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', fontWeight: 700, borderBottom: `2px solid ${tab === t.id ? '#C9A84C' : 'transparent'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <span style={{ fontSize: '16px' }}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ padding: '16px' }}>
            {/* Info tab */}
            {tab === 'info' && (
              <>
                {[
                  { key: 'hotel', icon: '🏨', label: 'Accommodation', notes: show.hotel_notes, addr: show.hotel_addr },
                  { key: 'transfers', icon: '🚌', label: 'Transfers' },
                  { key: 'meals', icon: '🍽', label: 'Meals' },
                  { key: 'planning', icon: '📅', label: 'Planning' },
                  { key: 'technique', icon: '🎛', label: 'Technical' },
                  { key: 'setlist', icon: '🎵', label: 'Setlist' },
                ].filter(f => show[f.key]).map(f => (
                  <div key={f.key} style={{ background: '#13131C', border: '1px solid #1F1F2E', borderRadius: '12px', padding: '14px 16px', marginBottom: '10px' }}>
                    <div style={{ fontWeight: 800, fontSize: '13px', marginBottom: '8px', color: '#C9A84C' }}>{f.icon} {f.label}</div>
                    <div style={{ fontSize: '13px', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{show[f.key]}</div>
                    {f.addr && (
                      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(f.addr)}`} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '10px', background: '#4285F4', color: 'white', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: 800, textDecoration: 'none' }}>
                        🗺 Open in Maps
                      </a>
                    )}
                    {f.notes && <div style={{ fontSize: '12px', color: '#C9A84C', marginTop: '8px', fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>{f.notes}</div>}
                  </div>
                ))}
                {/* Documents */}
                {docs?.length > 0 && (
                  <div style={{ background: '#13131C', border: '1px solid #1F1F2E', borderRadius: '12px', padding: '14px 16px', marginBottom: '10px' }}>
                    <div style={{ fontWeight: 800, fontSize: '13px', marginBottom: '10px', color: '#C9A84C' }}>📄 Documents</div>
                    {docs.map((d: any) => (
                      <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid #1F1F2E' }}>
                        <span style={{ fontSize: '18px' }}>{d.mime?.startsWith('image') ? '🖼' : '📄'}</span>
                        <span style={{ flex: 1, fontSize: '13px' }}>{d.name}</span>
                        <button onClick={async () => {
                          const res = await api('get_document', { token, docId: d.id })
                          if (res.data) setViewing({ ...res, name: d.name })
                        }} style={{ background: '#C9A84C', border: 'none', color: '#0A0A0F', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', fontWeight: 800 }}>View</button>
                      </div>
                    ))}
                  </div>
                )}
                {!show.hotel && !show.transfers && !show.meals && !show.planning && !show.technique && docs?.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#5A5570', fontSize: '13px', padding: '40px 0' }}>No info added yet by the manager</div>
                )}
              </>
            )}

            {/* My tickets tab */}
            {tab === 'tickets' && (
              <>
                {!matchedMember ? (
                  <div style={{ textAlign: 'center', color: '#5A5570', fontSize: '13px', padding: '40px 0' }}>
                    Your name wasn't found in the team list.<br />Ask your manager to add you.
                  </div>
                ) : myTickets.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#5A5570', fontSize: '13px', padding: '40px 0' }}>No tickets uploaded yet</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {[{ list: outTickets, color: '#C9A84C', label: '✈ Outbound' }, { list: retTickets, color: '#5DC9A0', label: '🔄 Return' }].map(({ list, color, label }) => (
                      <div key={label}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color, letterSpacing: '.1em', marginBottom: '8px' }}>{label}</div>
                        {list.length === 0 ? <div style={{ fontSize: '12px', color: '#5A5570' }}>—</div> : list.map((t: any) => (
                          <div key={t.id} style={{ background: '#13131C', border: `1px solid ${color}25`, borderRadius: '10px', padding: '10px', marginBottom: '8px' }}>
                            {t.info?.date && <div style={{ fontSize: '10px', color: '#5A5570' }}>📅 {t.info.date}</div>}
                            {(t.info?.from || t.info?.to) && <div style={{ fontSize: '13px', fontWeight: 800 }}>{t.info.from} → {t.info.to}</div>}
                            {t.info?.time && <div style={{ fontSize: '11px', color: '#5A5570' }}>🕐 {t.info.time}{t.info.ref ? ` · ${t.info.ref}` : ''}</div>}
                            {!t.info?.from && <div style={{ fontSize: '11px', color: '#5A5570' }}>{t.ticket_name}</div>}
                            <button onClick={async () => {
                              const res = await api('get_ticket', { token, ticketId: t.id })
                              if (res.ticket_data) setViewing({ ticket_data: res.ticket_data, ticket_name: t.ticket_name })
                            }} style={{ width: '100%', marginTop: '8px', background: color, border: 'none', color: '#0A0A0F', borderRadius: '8px', padding: '8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 800 }}>📱 Show</button>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Guests tab */}
            {tab === 'guests' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#5A5570' }}>{guests?.length || 0} guests</div>
                  <button onClick={async () => {
                    const name = prompt('Guest name?')
                    if (!name) return
                    const count = parseInt(prompt('Number of places?') || '1') || 1
                    await addGuest(name, count)
                    showToast('Guest added ✓')
                  }} style={{ background: '#C9A84C', border: 'none', color: '#0A0A0F', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 800 }}>+ Add guest</button>
                </div>
                {guests?.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#5A5570', fontSize: '13px', padding: '40px 0' }}>No guests yet</div>
                ) : guests?.map((g: any) => (
                  <div key={g.id} style={{ background: '#13131C', border: '1px solid #1F1F2E', borderRadius: '10px', padding: '12px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px' }}>{g.name}{g.count > 1 ? ` ×${g.count}` : ''}</div>
                      {g.member_id && <div style={{ fontSize: '11px', color: '#C9A84C' }}>for {members?.find((m: any) => m.id === g.member_id)?.name || g.member_name}</div>}
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: STATUS_COLORS[g.status] }}>{STATUS_LABELS[g.status]}</span>
                  </div>
                ))}
              </>
            )}

            {/* Chat tab */}
            {tab === 'chat' && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', maxHeight: '400px', overflowY: 'auto' }}>
                  {messages?.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#5A5570', fontSize: '13px', padding: '40px 0' }}>No messages yet</div>
                  ) : messages?.map((m: any) => (
                    <div key={m.id} style={{ alignSelf: m.is_manager ? 'flex-start' : 'flex-end', maxWidth: '85%' }}>
                      <div style={{ fontSize: '10px', color: '#5A5570', marginBottom: '3px', textAlign: m.is_manager ? 'left' : 'right' }}>
                        {m.sender_name}{m.is_manager ? ' · Manager' : ''}
                      </div>
                      <div style={{ background: m.is_manager ? '#1A1A28' : 'rgba(201,168,76,.15)', border: `1px solid ${m.is_manager ? '#1F1F2E' : 'rgba(201,168,76,.3)'}`, borderRadius: m.is_manager ? '12px 12px 12px 4px' : '12px 12px 4px 12px', padding: '10px 14px', fontSize: '13px', lineHeight: 1.5 }}>
                        {m.message}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && !sending && sendMessage()}
                    placeholder="Message..." style={{ flex: 1, background: 'rgba(255,255,255,.06)', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '10px', padding: '12px', fontFamily: 'inherit', fontSize: '13px', outline: 'none' }} />
                  <button onClick={sendMessage} disabled={sending} style={{ background: '#C9A84C', border: 'none', color: '#0A0A0F', borderRadius: '10px', padding: '12px 16px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: '13px' }}>
                    {sending ? '...' : 'Send'}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Ticket/Doc viewer */}
      {viewing && (
        <div onClick={() => setViewing(null)} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.97)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '600px', marginBottom: '12px' }}>
            <div style={{ fontWeight: 700, color: 'white' }}>{viewing.ticket_name || viewing.name}</div>
            <button onClick={() => setViewing(null)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '28px', cursor: 'pointer' }}>✕</button>
          </div>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '600px' }}>
            {(viewing.ticket_data || viewing.data)?.startsWith('data:image') && <img src={viewing.ticket_data || viewing.data} alt="" style={{ width: '100%', borderRadius: '12px', maxHeight: '80vh', objectFit: 'contain' }} />}
            {(viewing.ticket_data || viewing.data)?.startsWith('data:application/pdf') && <iframe src={viewing.ticket_data || viewing.data} style={{ width: '100%', height: '80vh', border: 'none', borderRadius: '12px' }} />}
          </div>
        </div>
      )}

      {/* Powered by */}
      <div style={{ textAlign: 'center', padding: '16px', fontSize: '11px', color: '#3A3550' }}>
        Powered by <a href="https://tourdesktop.com" style={{ color: '#C9A84C', textDecoration: 'none' }}>TourDesk</a>
      </div>
    </div>
  )
}

function showToast(msg: string) {
  const el = document.createElement('div')
  el.textContent = msg
  el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#5DC9A0;color:#0A0A0F;padding:10px 20px;border-radius:10px;font-weight:800;font-size:13px;z-index:9999;'
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 2500)
}
