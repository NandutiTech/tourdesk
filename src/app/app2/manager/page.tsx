'use client'
import { useState, useEffect, useRef } from 'react'
import { useStore, getToken, newId } from '@/lib/store'
import { Button, Card, Input, Modal, EmptyState, Toolbar, showToast } from '@/components/ui'

const CATS: Record<string, string> = { transport: '🚆', hotel: '🏨', food: '🍽', equipment: '🎛', other: '📦' }

async function managerAPI(action: string, data: any) {
  const token = getToken()
  const res = await fetch('/api/manager', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ action, ...data })
  })
  return res.json()
}

async function loadManagerData() {
  const token = getToken()
  const res = await fetch('/api/manager', { headers: { 'Authorization': `Bearer ${token}` } })
  return res.json()
}

async function extractTicketInfo(base64: string, mimeType: string) {
  try {
    const res = await fetch('/api/extract-ticket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64, mimeType })
    })
    return await res.json()
  } catch { return {} }
}

export default function ManagerPage() {
  const { tours, artists } = useStore()
  const [plan, setPlan] = useState('')
  const [data, setData] = useState<any>({ invites: [], tickets: [], guests: [], expenses: [], messages: [] })
  const [loading, setLoading] = useState(true)
  const [selectedTourId, setSelectedTourId] = useState('')
  const [selectedMemberEmail, setSelectedMemberEmail] = useState('')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showTicketModal, setShowTicketModal] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('')
  const [chatMsg, setChatMsg] = useState('')
  const [uploading, setUploading] = useState(false)
  const [viewingTicket, setViewingTicket] = useState<any>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)



  useEffect(() => {
    const token = getToken()
    fetch('/api/plan', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setPlan(d.plan || 'solo'))
    loadManagerData().then(d => { setData(d); setLoading(false) })
  }, [])

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [data.messages, showChat])

  if (plan && plan !== 'manager') {
    return (
      <div style={{ padding: '0 0 100px' }}>
        <Toolbar title="Manager" />
        <div style={{ padding: '0 16px' }}>
          <Card style={{ textAlign: 'center', padding: '32px 24px' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎭</div>
            <div style={{ fontWeight: 800, fontSize: '16px', marginBottom: '8px' }}>Manager Plan required</div>
            <div style={{ fontSize: '13px', color: '#5A5570', lineHeight: 1.6, marginBottom: '20px' }}>
              Invite artists and technicians to your tours, upload their tickets, track guests and expenses per member.
            </div>
            <Button onClick={() => window.location.href = '/app2/pricing'}>Upgrade to Manager →</Button>
          </Card>
        </div>
      </div>
    )
  }

  // Group invites by tour
  const today = new Date().toISOString().slice(0, 10)
  const past30 = new Date(Date.now() - 30*24*60*60*1000).toISOString().slice(0, 10)
  const future60 = new Date(Date.now() + 60*24*60*60*1000).toISOString().slice(0, 10)
  const relevantTours = tours
    .filter(t => t.start >= past30 && t.start <= future60)
    .sort((a, b) => a.start.localeCompare(b.start))
  const allTours = relevantTours.length > 0 ? relevantTours : [...tours].sort((a,b) => b.start.localeCompare(a.start)).slice(0, 20)

  const tourIds = [...new Set(data.invites.map((i: any) => i.tour_id))]
  const managedTours = tourIds.map(tid => {
    const tour = tours.find(t => t.id === tid)
    const artist = tour ? artists.find(a => a.id === tour.aId) : null
    const members = data.invites.filter((i: any) => i.tour_id === tid)
    return { tourId: tid, tour, artist, members }
  }).sort((a, b) => (a.tour?.start || '').localeCompare(b.tour?.start || ''))

  const selectedTour = managedTours.find(t => t.tourId === selectedTourId)
  const selectedMember = selectedTour?.members.find((m: any) => m.email === selectedMemberEmail)
  const memberTickets = data.tickets.filter((t: any) => t.tour_id === selectedTourId && t.member_email === selectedMemberEmail)
  const memberGuests = data.guests.filter((g: any) => g.tour_id === selectedTourId && g.user_id === selectedMember?.user_id)
  const memberExpenses = data.expenses.filter((e: any) => e.tour_id === selectedTourId && e.user_id === selectedMember?.user_id)
  const tourMessages = data.messages.filter((m: any) => m.tour_id === selectedTourId)

  const invite = async () => {
    if (!inviteEmail.trim()) { showToast('Email required', false); return }
    if (!selectedTourId) { showToast('Select a tour first', false); return }
    const result = await managerAPI('invite', { tourId: selectedTourId, email: inviteEmail.trim(), role: inviteRole })
    if (result.error) { showToast(result.error, false); return }
    showToast('Invitation sent ✓')
    setInviteEmail(''); setInviteRole('')
    setShowInviteModal(false)
    const d = await loadManagerData(); setData(d)
  }

  const uploadTicket = async (file: File, direction: string) => {
    if (!selectedMemberEmail || !selectedTourId) return
    setUploading(true)
    const b64 = await new Promise<string>(res => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(file) })
    const info = await extractTicketInfo(b64, file.type)
    await managerAPI('upload_ticket', {
      tourId: selectedTourId, memberEmail: selectedMemberEmail,
      direction, ticketData: b64, ticketName: file.name, ticketMime: file.type, info
    })
    showToast('Ticket uploaded ✓')
    setUploading(false)
    const d = await loadManagerData(); setData(d)
  }

  const deleteTicket = async (ticketId: string) => {
    if (!confirm('Delete this ticket?')) return
    await managerAPI('delete_ticket', { ticketId })
    const d = await loadManagerData(); setData(d)
  }

  const removeInvite = async (inviteId: string) => {
    if (!confirm('Remove this member?')) return
    await managerAPI('delete_invite', { inviteId })
    const d = await loadManagerData(); setData(d)
  }

  const sendMessage = async () => {
    if (!chatMsg.trim() || !selectedTourId) return
    await managerAPI('send_message', { tourId: selectedTourId, message: chatMsg.trim(), userName: 'Manager' })
    setChatMsg('')
    const d = await loadManagerData(); setData(d)
  }

  const [ticketDirection, setTicketDirection] = useState('out')
  const [uploadRef, setUploadRef] = useState<HTMLInputElement | null>(null)

  return (
    <div style={{ padding: '0 0 100px' }}>
      <Toolbar title="Manager" actions={
        selectedTourId
          ? <div style={{ display: 'flex', gap: '6px' }}>
              <Button size="sm" variant="secondary" onClick={() => setShowChat(true)}>💬</Button>
              <Button size="sm" onClick={() => setShowInviteModal(true)}>+ Invite</Button>
            </div>
          : undefined
      } />

      <div style={{ padding: '0 16px' }}>
        {/* Tour selector */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '8px' }}>Select tour</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {allTours.map(t => {
              const artist = artists.find(a => a.id === t.aId)
              const managed = managedTours.find(mt => mt.tourId === t.id)
              const memberCount = managed?.members.length || 0
              return (
                <button key={t.id} onClick={() => { setSelectedTourId(t.id); setSelectedMemberEmail('') }} style={{ background: selectedTourId === t.id ? 'rgba(201,168,76,.1)' : '#12121A', border: `2px solid ${selectedTourId === t.id ? '#C9A84C' : '#1F1F2E'}`, borderRadius: '12px', padding: '12px 14px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                  <div style={{ fontWeight: 800, fontSize: '13px', color: selectedTourId === t.id ? '#C9A84C' : '#E8E0F0' }}>{t.title}</div>
                  <div style={{ fontSize: '11px', color: '#5A5570' }}>
                    📅 {t.start}{artist ? ` · ${artist.name}` : ''}
                    {memberCount > 0 && <span style={{ color: '#5DC9A0', marginLeft: '8px' }}>· {memberCount} members</span>}
                  </div>
                </button>
              )
            })}
            {allTours.length === 0 && <div style={{ fontSize: '13px', color: '#5A5570', padding: '16px', textAlign: 'center' }}>No upcoming events. Add events in Tours & Events first.</div>}
          </div>
        </div>

        {/* Members list */}
        {selectedTourId && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.08em' }}>Team</div>
              <Button size="sm" onClick={() => setShowInviteModal(true)}>+ Invite member</Button>
            </div>

            {selectedTour?.members.length === 0 || !selectedTour ? (
              <Card style={{ textAlign: 'center', padding: '24px', marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', color: '#5A5570' }}>No members yet — invite artists and technicians</div>
              </Card>
            ) : (
              selectedTour.members.map((m: any) => (
                <button key={m.id} onClick={() => setSelectedMemberEmail(m.email)} style={{ width: '100%', background: selectedMemberEmail === m.email ? 'rgba(201,168,76,.08)' : '#12121A', border: `2px solid ${selectedMemberEmail === m.email ? '#C9A84C' : '#1F1F2E'}`, borderRadius: '12px', padding: '12px 14px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13px' }}>{m.email}</div>
                    <div style={{ fontSize: '11px', color: '#5A5570' }}>
                      {m.role || 'Team member'} · {m.status === 'accepted' ? <span style={{ color: '#5DC9A0' }}>✓ Joined</span> : <span style={{ color: '#C9A84C' }}>⏳ Pending</span>}
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); removeInvite(m.id) }} style={{ background: 'none', border: 'none', color: '#E8453C', cursor: 'pointer', fontSize: '16px', padding: '4px' }}>✕</button>
                </button>
              ))
            )}

            {/* Member detail */}
            {selectedMemberEmail && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '10px' }}>
                  {selectedMemberEmail}
                </div>

                {/* Tickets section */}
                <Card style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800 }}>🎫 Tickets</div>
                    <Button size="sm" onClick={() => setShowTicketModal(true)} disabled={uploading}>
                      {uploading ? 'Uploading...' : '+ Upload'}
                    </Button>
                  </div>
                  {memberTickets.length === 0 ? (
                    <div style={{ fontSize: '12px', color: '#5A5570', textAlign: 'center', padding: '12px' }}>No tickets yet</div>
                  ) : (
                    ['out', 'ret'].map(dir => {
                      const dirTickets = memberTickets.filter((t: any) => t.direction === dir)
                      if (dirTickets.length === 0) return null
                      return (
                        <div key={dir} style={{ marginBottom: '10px' }}>
                          <div style={{ fontSize: '10px', fontWeight: 800, color: dir === 'out' ? '#C9A84C' : '#5DC9A0', letterSpacing: '.1em', marginBottom: '6px' }}>
                            {dir === 'out' ? '✈ OUTBOUND' : '🔄 RETURN'}
                          </div>
                          {dirTickets.map((t: any) => (
                            <div key={t.id} style={{ background: '#0D0D14', borderRadius: '10px', padding: '10px 12px', marginBottom: '6px' }}>
                              {t.info?.from && <div style={{ fontSize: '14px', fontWeight: 800 }}>{t.info.from} → {t.info.to}</div>}
                              {t.info?.date && <div style={{ fontSize: '11px', color: '#5A5570' }}>📅 {t.info.date}{t.info.time ? ` · 🕐 ${t.info.time}` : ''}{t.info.ref ? ` · ${t.info.ref}` : ''}</div>}
                              {!t.info?.from && <div style={{ fontSize: '12px', color: '#5A5570' }}>{t.ticket_name}</div>}
                              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                                <button onClick={() => setViewingTicket(t)} style={{ flex: 1, background: dir === 'out' ? '#C9A84C' : '#5DC9A0', border: 'none', color: '#0A0A0F', borderRadius: '8px', padding: '7px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 800 }}>📱 Show</button>
                                <button onClick={() => deleteTicket(t.id)} style={{ background: 'none', border: '1px solid #E8453C', color: '#E8453C', borderRadius: '8px', padding: '7px 10px', cursor: 'pointer', fontSize: '12px' }}>✕</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })
                  )}
                </Card>

                {/* Guests from member */}
                {memberGuests.length > 0 && (
                  <Card style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, marginBottom: '10px' }}>🎫 Guests ({memberGuests.length})</div>
                    {memberGuests.map((g: any) => (
                      <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1F1F2E' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700 }}>{g.name}{g.count > 1 ? ` ×${g.count}` : ''}</div>
                          {g.contact && <div style={{ fontSize: '11px', color: '#5A5570' }}>{g.contact}</div>}
                        </div>
                        <div style={{ fontSize: '11px', color: g.status === 'confirmed' ? '#5DC9A0' : '#C9A84C', fontWeight: 700 }}>
                          {g.status === 'confirmed' ? '✓' : '⏳'}
                        </div>
                      </div>
                    ))}
                  </Card>
                )}

                {/* Expenses from member */}
                {memberExpenses.length > 0 && (
                  <Card style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 800 }}>💰 Expenses</div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#C9A84C' }}>
                        €{memberExpenses.reduce((s: number, e: any) => s + (e.amount || 0), 0).toFixed(2)}
                      </div>
                    </div>
                    {memberExpenses.map((e: any) => (
                      <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1F1F2E' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700 }}>{CATS[e.category] || '📦'} {e.description || e.category}</div>
                          <div style={{ fontSize: '11px', color: '#5A5570' }}>{e.date}</div>
                        </div>
                        <div style={{ fontWeight: 700, color: '#C9A84C' }}>€{(e.amount || 0).toFixed(2)}</div>
                      </div>
                    ))}
                  </Card>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Invite Modal */}
      <Modal open={showInviteModal} onClose={() => setShowInviteModal(false)} title="Invite team member">
        <div style={{ fontSize: '12px', color: '#5A5570', marginBottom: '16px' }}>
          They'll receive an email and can join with a free account to see their tickets, add guests and expenses.
        </div>
        <Input label="Email *" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="musician@gmail.com" />
        <Input label="Role" value={inviteRole} onChange={e => setInviteRole(e.target.value)} placeholder="Drummer, Sound Engineer, Tour Manager..." />
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <Button variant="secondary" onClick={() => setShowInviteModal(false)} style={{ flex: 1 }}>Cancel</Button>
          <Button onClick={invite} style={{ flex: 2 }}>Send invitation →</Button>
        </div>
      </Modal>

      {/* Upload ticket modal */}
      <Modal open={showTicketModal} onClose={() => setShowTicketModal(false)} title="Upload ticket">
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '8px' }}>Direction</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[{ v: 'out', label: '✈ Outbound', color: '#C9A84C' }, { v: 'ret', label: '🔄 Return', color: '#5DC9A0' }].map(d => (
              <button key={d.v} onClick={() => setTicketDirection(d.v)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: `2px solid ${ticketDirection === d.v ? d.color : '#1F1F2E'}`, background: ticketDirection === d.v ? `rgba(${d.v === 'out' ? '201,168,76' : '93,201,160'},.1)` : '#12121A', color: ticketDirection === d.v ? d.color : '#5A5570', fontFamily: 'inherit', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}>
                {d.label}
              </button>
            ))}
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) { uploadTicket(e.target.files[0], ticketDirection); setShowTicketModal(false) } }} />
        <Button onClick={() => fileRef.current?.click()} style={{ width: '100%' }}>📎 Choose file (PDF or photo)</Button>
      </Modal>

      {/* Chat */}
      {showChat && selectedTourId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#0A0A0F', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid #1F1F2E' }}>
            <div style={{ fontWeight: 800 }}>💬 Tour chat</div>
            <button onClick={() => setShowChat(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>✕</button>
          </div>
          <div ref={chatRef} style={{ flex: 1, overflow: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {tourMessages.length === 0 && <div style={{ textAlign: 'center', color: '#5A5570', fontSize: '13px', padding: '32px' }}>No messages yet</div>}
            {tourMessages.map((m: any) => (
              <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.is_manager ? 'flex-end' : 'flex-start' }}>
                <div style={{ fontSize: '10px', color: '#5A5570', marginBottom: '3px' }}>{m.user_name}</div>
                <div style={{ background: m.is_manager ? 'rgba(201,168,76,.2)' : '#12121A', border: `1px solid ${m.is_manager ? 'rgba(201,168,76,.3)' : '#1F1F2E'}`, borderRadius: '12px', padding: '10px 14px', maxWidth: '75%', fontSize: '14px' }}>
                  {m.message}
                </div>
                <div style={{ fontSize: '10px', color: '#3A3550', marginTop: '3px' }}>{new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid #1F1F2E', display: 'flex', gap: '8px' }}>
            <input value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Message..." style={{ flex: 1, background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '10px', padding: '12px', fontFamily: 'inherit', fontSize: '14px', outline: 'none' }} />
            <button onClick={sendMessage} style={{ background: '#C9A84C', border: 'none', color: '#0A0A0F', borderRadius: '10px', padding: '12px 16px', cursor: 'pointer', fontWeight: 800, fontSize: '16px' }}>→</button>
          </div>
        </div>
      )}

      {/* Ticket viewer */}
      {viewingTicket && (
        <div onClick={() => setViewingTicket(null)} style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,.97)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '600px', marginBottom: '12px' }}>
            <div style={{ fontWeight: 700, color: 'white' }}>{viewingTicket.ticket_name}</div>
            <button onClick={() => setViewingTicket(null)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '28px', cursor: 'pointer' }}>✕</button>
          </div>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '600px' }}>
            {viewingTicket.ticket_data?.startsWith('data:image') && <img src={viewingTicket.ticket_data} style={{ width: '100%', borderRadius: '12px', maxHeight: '80vh', objectFit: 'contain' }} />}
            {viewingTicket.ticket_data?.startsWith('data:application/pdf') && <iframe src={viewingTicket.ticket_data} style={{ width: '100%', height: '80vh', border: 'none', borderRadius: '12px' }} />}
          </div>
        </div>
      )}
    </div>
  )
}
