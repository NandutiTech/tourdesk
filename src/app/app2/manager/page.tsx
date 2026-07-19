'use client'
import { useState, useEffect, useRef } from 'react'
import { useStore, getToken } from '@/lib/store'
import { Button, Card, Input, Textarea, Modal, EmptyState, Toolbar, showToast } from '@/components/ui'
import { SendToContact } from '@/components/SendToContact'

async function api(action: string, data: any) {
  const res = await fetch('/api/manager', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
    body: JSON.stringify({ action, ...data })
  })
  return res.json()
}

async function load(tourId?: string) {
  const url = tourId ? `/api/manager?tourId=${tourId}` : '/api/manager'
  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${getToken()}` } })
  return res.json()
}

async function extractTicket(base64: string, mimeType: string) {
  try {
    const res = await fetch('/api/extract-ticket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64, mimeType })
    })
    return await res.json()
  } catch { return {} }
}

function MemberModal({ open, onClose, tourId, editing, onSaved }: any) {
  const [name, setName] = useState(editing?.name || '')
  const [role, setRole] = useState(editing?.role || '')
  const [hotel, setHotel] = useState(editing?.hotel || '')
  const [room, setRoom] = useState(editing?.room || '')
  const [hotelAddr, setHotelAddr] = useState(editing?.hotel_addr || '')
  const [notes, setNotes] = useState(editing?.notes || '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!name.trim()) { showToast('Name required', false); return }
    setSaving(true)
    if (editing) {
      await api('update_member', { memberId: editing.id, name, role, hotel, room, hotelAddr, notes })
    } else {
      await api('add_member', { tourId, name, role, hotel, room, hotelAddr, notes })
    }
    onSaved()
    onClose()
    setSaving(false)
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit member' : 'Add team member'}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Input label="Name *" value={name} onChange={e => setName(e.target.value)} placeholder="Jean-Baptiste" />
        <Input label="Role" value={role} onChange={e => setRole(e.target.value)} placeholder="Drummer, Sound..." />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
        <Input label="Hotel" value={hotel} onChange={e => setHotel(e.target.value)} placeholder="Ibis Lyon Centre" />
        <Input label="Room" value={room} onChange={e => setRoom(e.target.value)} placeholder="214" />
      </div>
      <Input label="Hotel address" value={hotelAddr} onChange={e => setHotelAddr(e.target.value)} />
      <Textarea label="Notes" value={notes} onChange={e => setNotes(e.target.value)} style={{ minHeight: '60px' }} />
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
        <Button onClick={save} disabled={saving} style={{ flex: 2 }}>{saving ? 'Saving...' : 'Save'}</Button>
      </div>
    </Modal>
  )
}

export default function ManagerPage() {
  const { tours, artists } = useStore()
  const [plan, setPlan] = useState('')
  const [selectedTourId, setSelectedTourId] = useState('')
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [data, setData] = useState<any>({ members: [], tickets: [], expenses: [], guests: [], messages: [] })
  const [loading, setLoading] = useState(false)
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [editingMember, setEditingMember] = useState<any>(null)
  const [showChat, setShowChat] = useState(false)
  const [chatMsg, setChatMsg] = useState('')
  const [uploadingTicket, setUploadingTicket] = useState(false)
  const [ticketDir, setTicketDir] = useState('out')
  const [showTicketModal, setShowTicketModal] = useState(false)
  const [viewingTicket, setViewingTicket] = useState<any>(null)
  const [showInvite, setShowInvite] = useState<any>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/plan', { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json()).then(d => setPlan(d.plan || 'solo'))
  }, [])

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [data.messages, showChat])

  const refresh = async () => {
    if (!selectedTourId) return
    setLoading(true)
    const d = await load(selectedTourId)
    setData(d)
    setLoading(false)
  }

  useEffect(() => { refresh() }, [selectedTourId])

  const today = new Date().toISOString().slice(0, 10)
  const past30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const future60 = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const relevantTours = tours.filter(t => t.start >= past30 && t.start <= future60).sort((a, b) => a.start.localeCompare(b.start))
  const tourList = relevantTours.length > 0 ? relevantTours : [...tours].sort((a, b) => b.start.localeCompare(a.start)).slice(0, 15)

  const members = data.members || []
  const selectedMember = members.find((m: any) => m.id === selectedMemberId)
  const memberTickets = data.tickets?.filter((t: any) => t.member_id === selectedMemberId) || []
  const memberExpenses = data.expenses?.filter((e: any) => e.member_id === selectedMemberId) || []
  const memberGuests = data.guests?.filter((g: any) => g.member_id === selectedMemberId) || []
  const memberMessages = data.messages?.filter((m: any) => m.member_id === selectedMemberId) || []
  const unreadCount = memberMessages.filter((m: any) => !m.from_manager && !m.read_at).length

  if (plan && plan !== 'manager') {
    return (
      <div style={{ padding: '0 0 100px' }}>
        <Toolbar title="Manager" />
        <div style={{ padding: '0 16px' }}>
          <Card style={{ textAlign: 'center', padding: '32px 24px' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎭</div>
            <div style={{ fontWeight: 800, fontSize: '16px', marginBottom: '8px' }}>Manager Plan required</div>
            <div style={{ fontSize: '13px', color: '#5A5570', lineHeight: 1.6, marginBottom: '20px' }}>
              Create tour sheets, add your team, upload their tickets and track everything in one place.
            </div>
            <Button onClick={() => window.location.href = '/app2/pricing'}>Upgrade to Manager →</Button>
          </Card>
        </div>
      </div>
    )
  }

  const uploadTicket = async (file: File) => {
    if (!selectedMemberId) return
    setUploadingTicket(true)
    const b64 = await new Promise<string>(res => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(file) })
    const info = await extractTicket(b64, file.type)
    await api('upload_ticket', { memberId: selectedMemberId, direction: ticketDir, ticketData: b64, ticketName: file.name, ticketMime: file.type, info })
    showToast('Ticket uploaded ✓')
    setUploadingTicket(false)
    setShowTicketModal(false)
    refresh()
  }

  const deleteMember = async (id: string) => {
    if (!confirm('Remove this member and all their data?')) return
    await api('delete_member', { memberId: id })
    setSelectedMemberId('')
    refresh()
  }

  const sendMsg = async () => {
    if (!chatMsg.trim()) return
    await api('send_message', { memberId: selectedMemberId, tourId: selectedTourId, message: chatMsg })
    setChatMsg('')
    refresh()
  }

  const inviteLink = (member: any) => `https://www.tourdesktop.com/join/${member.invite_token}`
  const inviteText = (member: any) => {
    const tour = tours.find(t => t.id === selectedTourId)
    return `Hi ${member.name}! You're invited to join the tour "${tour?.title || ''}" on TourDesk. Create your free account to see your tickets, add guests and expenses:\n\n${inviteLink(member)}`
  }

  return (
    <div style={{ padding: '0 0 100px' }}>
      <Toolbar title="Manager" />
      <div style={{ padding: '0 16px' }}>

        {/* Step 1 — Select tour */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '10px' }}>
            1 · Select tour
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {tourList.map(t => {
              const artist = artists.find(a => a.id === t.aId)
              const mCount = data.members?.filter((m: any) => m.tour_id === t.id).length || 0
              const isSelected = selectedTourId === t.id
              return (
                <button key={t.id} onClick={() => { setSelectedTourId(t.id); setSelectedMemberId('') }} style={{ background: isSelected ? 'rgba(201,168,76,.1)' : '#12121A', border: `2px solid ${isSelected ? '#C9A84C' : '#1F1F2E'}`, borderRadius: '12px', padding: '12px 14px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                  <div style={{ fontWeight: 800, fontSize: '13px', color: isSelected ? '#C9A84C' : '#E8E0F0' }}>{t.title}</div>
                  <div style={{ fontSize: '11px', color: '#5A5570' }}>📅 {t.start}{artist ? ` · ${artist.name}` : ''}{mCount > 0 ? ` · ${mCount} members` : ''}</div>
                </button>
              )
            })}
            {tourList.length === 0 && <div style={{ fontSize: '13px', color: '#5A5570', textAlign: 'center', padding: '16px' }}>No events found. Add events in Tours & Events first.</div>}
          </div>
        </div>

        {/* Step 2 — Team */}
        {selectedTourId && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.1em' }}>
                2 · Team members
              </div>
              <Button size="sm" onClick={() => { setEditingMember(null); setShowMemberModal(true) }}>+ Add</Button>
            </div>

            {members.filter((m: any) => m.tour_id === selectedTourId).length === 0 ? (
              <Card style={{ textAlign: 'center', padding: '20px', marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', color: '#5A5570' }}>No team members yet — add musicians, technicians, crew</div>
              </Card>
            ) : (
              members.filter((m: any) => m.tour_id === selectedTourId).map((m: any) => {
                const msgs = data.messages?.filter((msg: any) => msg.member_id === m.id && !msg.from_manager && !msg.read_at).length || 0
                return (
                  <button key={m.id} onClick={() => setSelectedMemberId(m.id)} style={{ width: '100%', background: selectedMemberId === m.id ? 'rgba(201,168,76,.08)' : '#12121A', border: `2px solid ${selectedMemberId === m.id ? '#C9A84C' : '#1F1F2E'}`, borderRadius: '12px', padding: '12px 14px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px' }}>{m.name}</div>
                      <div style={{ fontSize: '11px', color: '#5A5570' }}>
                        {m.role || 'Team member'} · {m.user_id ? <span style={{ color: '#5DC9A0' }}>✓ Joined</span> : <span style={{ color: '#C9A84C' }}>⏳ Not joined yet</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {msgs > 0 && <div style={{ background: '#E8453C', color: 'white', borderRadius: '10px', padding: '2px 7px', fontSize: '11px', fontWeight: 800 }}>{msgs}</div>}
                      {selectedMemberId !== m.id && (
                        <button onClick={e => { e.stopPropagation(); setShowInvite(m) }} style={{ background: 'rgba(93,201,160,.1)', border: '1px solid rgba(93,201,160,.2)', color: '#5DC9A0', borderRadius: '8px', padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', fontWeight: 700 }}>
                          📤 Invite
                        </button>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        )}

        {/* Step 3 — Member detail */}
        {selectedMember && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '12px' }}>
              3 · {selectedMember.name}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <button onClick={() => { setEditingMember(selectedMember); setShowMemberModal(true) }} style={{ background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 700 }}>✏ Edit</button>
              <button onClick={() => setShowTicketModal(true)} style={{ background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 700 }}>🎫 Upload ticket</button>
              <button onClick={() => { setShowChat(true) }} style={{ background: unreadCount > 0 ? 'rgba(232,69,60,.1)' : '#12121A', border: `1px solid ${unreadCount > 0 ? '#E8453C' : '#1F1F2E'}`, color: unreadCount > 0 ? '#E8453C' : '#E8E0F0', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 700 }}>
                💬 Message{unreadCount > 0 ? ` (${unreadCount})` : ''}
              </button>
              <button onClick={() => setShowInvite(selectedMember)} style={{ background: 'rgba(93,201,160,.1)', border: '1px solid rgba(93,201,160,.2)', color: '#5DC9A0', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 700 }}>📤 Send invite</button>
              <button onClick={() => deleteMember(selectedMember.id)} style={{ background: 'none', border: '1px solid #E8453C', color: '#E8453C', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 700 }}>Remove</button>
            </div>

            {/* Hotel info */}
            {(selectedMember.hotel || selectedMember.notes) && (
              <Card style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '10px' }}>🏨 Hotel & Notes</div>
                {selectedMember.hotel && <div style={{ fontWeight: 700, fontSize: '14px' }}>{selectedMember.hotel}{selectedMember.room ? ` — Room ${selectedMember.room}` : ''}</div>}
                {selectedMember.hotel_addr && <div style={{ fontSize: '12px', color: '#5A5570' }}>{selectedMember.hotel_addr}</div>}
                {selectedMember.notes && <div style={{ fontSize: '12px', color: '#5A5570', marginTop: '6px', fontStyle: 'italic' }}>{selectedMember.notes}</div>}
              </Card>
            )}

            {/* Tickets */}
            <Card style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '10px' }}>🎫 Tickets</div>
              {memberTickets.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#5A5570', textAlign: 'center', padding: '12px' }}>No tickets yet — upload PDF or photo</div>
              ) : (
                ['out', 'ret'].map(dir => {
                  const dirT = memberTickets.filter((t: any) => t.direction === dir)
                  if (!dirT.length) return null
                  const color = dir === 'out' ? '#C9A84C' : '#5DC9A0'
                  return (
                    <div key={dir} style={{ marginBottom: '10px' }}>
                      <div style={{ fontSize: '10px', fontWeight: 800, color, letterSpacing: '.1em', marginBottom: '6px' }}>{dir === 'out' ? '✈ OUTBOUND' : '🔄 RETURN'}</div>
                      {dirT.map((t: any) => (
                        <div key={t.id} style={{ background: '#0D0D14', borderRadius: '10px', padding: '10px 12px', marginBottom: '6px' }}>
                          {(t.info?.from || t.info?.to) && <div style={{ fontWeight: 800, fontSize: '14px' }}>{t.info.from} → {t.info.to}</div>}
                          {t.info?.date && <div style={{ fontSize: '11px', color: '#5A5570' }}>📅 {t.info.date}{t.info.time ? ` · 🕐 ${t.info.time}` : ''}{t.info.ref ? ` · ${t.info.ref}` : ''}</div>}
                          {!t.info?.from && <div style={{ fontSize: '12px', color: '#5A5570' }}>{t.ticket_name}</div>}
                          <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                            <button onClick={() => setViewingTicket(t)} style={{ flex: 1, background: color, border: 'none', color: '#0A0A0F', borderRadius: '8px', padding: '7px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 800 }}>📱 View</button>
                            <button onClick={async () => { await api('delete_ticket', { ticketId: t.id }); refresh() }} style={{ background: 'none', border: '1px solid #E8453C', color: '#E8453C', borderRadius: '8px', padding: '7px 10px', cursor: 'pointer', fontSize: '12px' }}>✕</button>
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
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '10px' }}>👥 Guests ({memberGuests.reduce((s: number, g: any) => s + (g.count || 1), 0)} places)</div>
                {memberGuests.map((g: any) => (
                  <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1F1F2E' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700 }}>{g.name}{g.count > 1 ? ` ×${g.count}` : ''}</div>
                      {g.contact && <div style={{ fontSize: '11px', color: '#5A5570' }}>{g.contact}</div>}
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: g.status === 'confirmed' ? '#5DC9A0' : '#C9A84C' }}>
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
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.1em' }}>💰 Expenses</div>
                  <div style={{ fontWeight: 800, color: '#C9A84C' }}>€{memberExpenses.reduce((s: number, e: any) => s + (e.amount || 0), 0).toFixed(2)}</div>
                </div>
                {memberExpenses.map((e: any) => (
                  <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1F1F2E' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700 }}>{e.description || e.category}</div>
                      <div style={{ fontSize: '11px', color: '#5A5570' }}>{e.date}</div>
                    </div>
                    <div style={{ fontWeight: 700, color: '#C9A84C' }}>€{(e.amount || 0).toFixed(2)}</div>
                  </div>
                ))}
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Member modal */}
      {showMemberModal && (
        <MemberModal
          key={editingMember?.id || 'new'}
          open={showMemberModal}
          onClose={() => setShowMemberModal(false)}
          tourId={selectedTourId}
          editing={editingMember}
          onSaved={refresh}
        />
      )}

      {/* Ticket upload modal */}
      <Modal open={showTicketModal} onClose={() => setShowTicketModal(false)} title={`Upload ticket — ${selectedMember?.name}`}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {[{ v: 'out', label: '✈ Outbound', color: '#C9A84C' }, { v: 'ret', label: '🔄 Return', color: '#5DC9A0' }].map(d => (
            <button key={d.v} onClick={() => setTicketDir(d.v)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: `2px solid ${ticketDir === d.v ? d.color : '#1F1F2E'}`, background: ticketDir === d.v ? `rgba(${d.v === 'out' ? '201,168,76' : '93,201,160'},.1)` : '#12121A', color: ticketDir === d.v ? d.color : '#5A5570', fontFamily: 'inherit', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}>
              {d.label}
            </button>
          ))}
        </div>
        <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && uploadTicket(e.target.files[0])} />
        <Button onClick={() => fileRef.current?.click()} style={{ width: '100%' }} disabled={uploadingTicket}>
          {uploadingTicket ? '🤖 Reading ticket...' : '📎 Choose PDF or photo'}
        </Button>
      </Modal>

      {/* Invite via SendToContact */}
      {showInvite && (
        <SendToContact
          open={!!showInvite}
          onClose={() => setShowInvite(null)}
          subject={`TourDesk — You're invited to join the tour`}
          body={inviteText(showInvite)}
        />
      )}

      {/* 1-to-1 chat */}
      {showChat && selectedMember && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#0A0A0F', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid #1F1F2E' }}>
            <div>
              <div style={{ fontWeight: 800 }}>💬 {selectedMember.name}</div>
              <div style={{ fontSize: '11px', color: '#5A5570' }}>{selectedMember.role || 'Team member'}</div>
            </div>
            <button onClick={() => setShowChat(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>✕</button>
          </div>
          <div ref={chatRef} style={{ flex: 1, overflow: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {memberMessages.length === 0 && <div style={{ textAlign: 'center', color: '#5A5570', fontSize: '13px', padding: '32px' }}>No messages yet</div>}
            {memberMessages.map((m: any) => (
              <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.from_manager ? 'flex-end' : 'flex-start' }}>
                <div style={{ fontSize: '10px', color: '#5A5570', marginBottom: '3px' }}>{m.from_manager ? 'You' : selectedMember.name}</div>
                <div style={{ background: m.from_manager ? 'rgba(201,168,76,.15)' : '#12121A', border: `1px solid ${m.from_manager ? 'rgba(201,168,76,.2)' : '#1F1F2E'}`, borderRadius: '12px', padding: '10px 14px', maxWidth: '75%', fontSize: '14px' }}>
                  {m.message}
                </div>
                <div style={{ fontSize: '10px', color: '#3A3550', marginTop: '3px' }}>
                  {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid #1F1F2E', display: 'flex', gap: '8px' }}>
            <input value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMsg()} placeholder={`Message to ${selectedMember.name}...`} style={{ flex: 1, background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '10px', padding: '12px', fontFamily: 'inherit', fontSize: '14px', outline: 'none' }} />
            <button onClick={sendMsg} style={{ background: '#C9A84C', border: 'none', color: '#0A0A0F', borderRadius: '10px', padding: '12px 16px', cursor: 'pointer', fontWeight: 800, fontSize: '16px' }}>→</button>
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
