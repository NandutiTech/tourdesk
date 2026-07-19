'use client'
import { useState, useEffect, useRef } from 'react'
import { getToken } from '@/lib/store'
import { Button, Card, Input, Textarea, Modal, EmptyState, Toolbar, showToast } from '@/components/ui'

async function api(action: string, data: any = {}) {
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

const ROLES = ['Chanteur·se', 'Musicien·ne', 'Batteur·se', 'Pianiste', 'Guitariste', 'Bassiste', 'Ingénieur son', 'Ingénieur lumière', 'Tour manager', 'Road manager', 'Autre']

// ─── Tour Modal ────────────────────────────────────────────────────────────
function TourModal({ open, onClose, editing, onSaved }: any) {
  const [name, setName] = useState(editing?.name || '')
  const [startDate, setStartDate] = useState(editing?.startDate || '')
  const [endDate, setEndDate] = useState(editing?.endDate || '')
  const [venue, setVenue] = useState(editing?.venue || '')
  const [city, setCity] = useState(editing?.city || '')
  const [notes, setNotes] = useState(editing?.notes || '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!name.trim()) { showToast('Tour name required', false); return }
    setSaving(true)
    if (editing) {
      await api('update_tour', { tourId: editing.id, name, startDate, endDate, venue, city, notes })
    } else {
      await api('create_tour', { name, startDate, endDate, venue, city, notes })
    }
    showToast(editing ? 'Tour updated' : 'Tour created')
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Tour' : 'New Tour'}>
      <Input label="Tour name *" value={name} onChange={e => setName(e.target.value)} placeholder="Vincent Dedienne — Été 2026" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Input label="Start date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        <Input label="End date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
      </div>
      <Input label="Venue / Festival" value={venue} onChange={e => setVenue(e.target.value)} placeholder="Théâtre du Châtelet" />
      <Input label="City" value={city} onChange={e => setCity(e.target.value)} placeholder="Paris" />
      <Textarea label="Notes" value={notes} onChange={e => setNotes(e.target.value)} style={{ minHeight: '60px' }} />
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
        <Button onClick={save} disabled={saving} style={{ flex: 2 }}>{saving ? 'Saving...' : 'Save'}</Button>
      </div>
    </Modal>
  )
}

// ─── Member Modal ──────────────────────────────────────────────────────────
function MemberModal({ open, onClose, tourId, editing, onSaved }: any) {
  const [name, setName] = useState(editing?.name || '')
  const [role, setRole] = useState(editing?.role || '')
  const [email, setEmail] = useState(editing?.email || '')
  const [hotel, setHotel] = useState(editing?.hotel || '')
  const [room, setRoom] = useState(editing?.room || '')
  const [hotelAddr, setHotelAddr] = useState(editing?.hotel_addr || '')
  const [notes, setNotes] = useState(editing?.notes || '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!name.trim()) { showToast('Name required', false); return }
    setSaving(true)
    if (editing) {
      await api('update_member', { memberId: editing.id, name, role, email, hotel, room, hotelAddr, notes })
    } else {
      await api('add_member', { tourId, name, role, email, hotel, room, hotelAddr, notes })
    }
    showToast(editing ? 'Member updated' : 'Member added')
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Member' : 'Add Member'}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Input label="Name *" value={name} onChange={e => setName(e.target.value)} placeholder="Jean Dupont" />
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '4px' }}>Role</div>
          <select value={role} onChange={e => setRole(e.target.value)} style={{ width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid #1E1E2E', color: '#E8E0F0', borderRadius: '8px', padding: '10px', fontFamily: 'inherit', fontSize: '13px', outline: 'none' }}>
            <option value="">Select...</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>
      <Input label="Email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jean@email.com" />
      <div style={{ fontSize: '11px', fontWeight: 800, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.08em', margin: '8px 0 6px' }}>🏨 Hotel</div>
      <Input label="Hotel name" value={hotel} onChange={e => setHotel(e.target.value)} placeholder="Hôtel du Palais" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Input label="Room" value={room} onChange={e => setRoom(e.target.value)} placeholder="214" />
        <Input label="Address" value={hotelAddr} onChange={e => setHotelAddr(e.target.value)} placeholder="12 rue..." />
      </div>
      <Textarea label="Notes" value={notes} onChange={e => setNotes(e.target.value)} style={{ minHeight: '60px' }} />
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
        <Button onClick={save} disabled={saving} style={{ flex: 2 }}>{saving ? 'Saving...' : 'Save'}</Button>
      </div>
    </Modal>
  )
}

// ─── Ticket Uploader for member ────────────────────────────────────────────
function MemberTickets({ member, tourId, tickets, onRefresh }: any) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploadDir, setUploadDir] = useState<'out' | 'ret'>('out')
  const [scanning, setScanning] = useState(false)
  const [viewing, setViewing] = useState<any>(null)

  const memberTickets = tickets.filter((t: any) => t.member_id === member.id)
  const outTickets = memberTickets.filter((t: any) => t.direction === 'out')
  const retTickets = memberTickets.filter((t: any) => t.direction === 'ret')

  const handleFile = async (file: File) => {
    const b64 = await new Promise<string>(res => {
      const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(file)
    })
    setScanning(true)
    let info = {}
    if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
      info = await extractTicket(b64, file.type)
    }
    await api('upload_ticket', {
      memberId: member.id, tourId,
      direction: uploadDir,
      ticketData: b64, ticketName: file.name, ticketMime: file.type,
      info
    })
    setScanning(false)
    showToast('Ticket uploaded')
    onRefresh()
  }

  const TicketList = ({ list, color, label }: any) => (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ fontSize: '10px', fontWeight: 800, color, letterSpacing: '.1em', marginBottom: '6px' }}>
        {label === 'Outbound' ? '✈' : '🔄'} {label.toUpperCase()}
      </div>
      {list.map((t: any) => (
        <div key={t.id} style={{ background: '#0D0D14', border: `1px solid ${color}20`, borderRadius: '8px', padding: '10px 12px', marginBottom: '6px' }}>
          {t.info?.date && <div style={{ fontSize: '11px', color: '#5A5570' }}>📅 {t.info.date}</div>}
          {(t.info?.from || t.info?.to) && <div style={{ fontSize: '13px', fontWeight: 700 }}>{t.info.from || '?'} → {t.info.to || '?'}</div>}
          {t.info?.time && <div style={{ fontSize: '11px', color: '#5A5570' }}>🕐 {t.info.time}{t.info.ref ? ` · ${t.info.ref}` : ''}</div>}
          {!t.info?.from && !t.info?.to && <div style={{ fontSize: '11px', color: '#5A5570' }}>{t.ticket_name}</div>}
          <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
            <button onClick={() => setViewing(t)} style={{ flex: 1, background: color, border: 'none', color: '#0A0A0F', borderRadius: '6px', padding: '6px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', fontWeight: 800 }}>📱 Show</button>
            <button onClick={async () => { await api('delete_ticket', { ticketId: t.id }); onRefresh() }} style={{ background: 'none', border: '1px solid #E8453C', color: '#E8453C', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px' }}>✕</button>
          </div>
        </div>
      ))}
      <input ref={label === 'Outbound' ? fileRef : undefined} type="file" accept="image/*,.pdf" style={{ display: 'none' }}
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <button onClick={() => { setUploadDir(label === 'Outbound' ? 'out' : 'ret'); fileRef.current?.click() }}
        style={{ width: '100%', background: '#0D0D14', border: `1px dashed ${color}30`, color: '#5A5570', borderRadius: '8px', padding: '8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px' }}>
        {scanning ? '🤖 Reading...' : `+ Add ${label.toLowerCase()} ticket`}
      </button>
    </div>
  )

  const retRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <input ref={retRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }}
        onChange={e => { setUploadDir('ret'); e.target.files?.[0] && handleFile(e.target.files[0]) }} />

      <TicketList list={outTickets} color="#C9A84C" label="Outbound" />
      <div style={{ position: 'relative' }}>
        <div style={{ fontSize: '10px', fontWeight: 800, color: '#5DC9A0', letterSpacing: '.1em', marginBottom: '6px' }}>🔄 RETURN</div>
        {retTickets.map((t: any) => (
          <div key={t.id} style={{ background: '#0D0D14', border: '1px solid rgba(93,201,160,.2)', borderRadius: '8px', padding: '10px 12px', marginBottom: '6px' }}>
            {t.info?.date && <div style={{ fontSize: '11px', color: '#5A5570' }}>📅 {t.info.date}</div>}
            {(t.info?.from || t.info?.to) && <div style={{ fontSize: '13px', fontWeight: 700 }}>{t.info.from || '?'} → {t.info.to || '?'}</div>}
            {t.info?.time && <div style={{ fontSize: '11px', color: '#5A5570' }}>🕐 {t.info.time}{t.info.ref ? ` · ${t.info.ref}` : ''}</div>}
            {!t.info?.from && !t.info?.to && <div style={{ fontSize: '11px', color: '#5A5570' }}>{t.ticket_name}</div>}
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
              <button onClick={() => setViewing(t)} style={{ flex: 1, background: '#5DC9A0', border: 'none', color: '#0A0A0F', borderRadius: '6px', padding: '6px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', fontWeight: 800 }}>📱 Show</button>
              <button onClick={async () => { await api('delete_ticket', { ticketId: t.id }); onRefresh() }} style={{ background: 'none', border: '1px solid #E8453C', color: '#E8453C', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px' }}>✕</button>
            </div>
          </div>
        ))}
        <button onClick={() => retRef.current?.click()}
          style={{ width: '100%', background: '#0D0D14', border: '1px dashed rgba(93,201,160,.3)', color: '#5A5570', borderRadius: '8px', padding: '8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px' }}>
          + Add return ticket
        </button>
      </div>

      {viewing && (
        <div onClick={() => setViewing(null)} style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,.97)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '600px', marginBottom: '12px' }}>
            <div style={{ fontWeight: 700, color: 'white' }}>{viewing.ticket_name}</div>
            <button onClick={() => setViewing(null)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '28px', cursor: 'pointer' }}>✕</button>
          </div>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '600px' }}>
            {viewing.ticket_data?.startsWith('data:image') && <img src={viewing.ticket_data} alt="" style={{ width: '100%', borderRadius: '12px', maxHeight: '80vh', objectFit: 'contain' }} />}
            {viewing.ticket_data?.startsWith('data:application/pdf') && <iframe src={viewing.ticket_data} style={{ width: '100%', height: '80vh', border: 'none', borderRadius: '12px' }} />}
          </div>
        </div>
      )}
    </>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function ManagerPage() {
  const [tours, setTours] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [tickets, setTickets] = useState<any[]>([])
  const [selectedTour, setSelectedTour] = useState<any>(null)
  const [expandedMember, setExpandedMember] = useState<string | null>(null)
  const [showTourModal, setShowTourModal] = useState(false)
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [editingTour, setEditingTour] = useState<any>(null)
  const [editingMember, setEditingMember] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async (tourId?: string) => {
    const data = await load(tourId)
    // Tours come from invites with status='manager'
    const tourList = (data.invites || [])
      .filter((i: any) => i.status === 'manager')
      .map((i: any) => {
        let meta: any = {}
        try { meta = JSON.parse(i.notes || '{}') } catch {}
        return { id: i.id, name: i.role, ...meta }
      })
      .sort((a: any, b: any) => (a.startDate || '').localeCompare(b.startDate || ''))
    setTours(tourList)
    setMembers(data.members || [])
    setTickets(data.tickets || [])
    setLoading(false)
  }

  useEffect(() => { refresh() }, [])

  const selectTour = async (tour: any) => {
    setSelectedTour(tour)
    setExpandedMember(null)
    await refresh(tour.id)
  }

  const tourMembers = members.filter(m => m.tour_id === selectedTour?.id)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#5A5570' }}>Loading...</div>
  )

  return (
    <div style={{ padding: '0 0 100px' }}>
      <Toolbar title="Manager" actions={
        <Button size="sm" onClick={() => { setEditingTour(null); setShowTourModal(true) }}>+ Tour</Button>
      } />

      <div style={{ padding: '0 16px' }}>
        {/* Tour list */}
        {tours.length === 0 ? (
          <EmptyState icon="🎪" title="No tours yet" sub="Create a tour, add your team members and upload their travel tickets." />
        ) : (
          <>
            {/* Tour selector */}
            <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {tours.map(tour => (
                <div key={tour.id} onClick={() => selectTour(tour)}
                  style={{ padding: '14px 16px', borderRadius: '12px', border: `2px solid ${selectedTour?.id === tour.id ? '#C9A84C' : '#1F1F2E'}`, background: selectedTour?.id === tour.id ? 'rgba(201,168,76,.08)' : '#12121A', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '14px', color: selectedTour?.id === tour.id ? '#C9A84C' : '#E8E0F0' }}>{tour.name}</div>
                    <div style={{ fontSize: '11px', color: '#5A5570' }}>
                      {tour.startDate && `📅 ${tour.startDate}`}{tour.endDate && tour.endDate !== tour.startDate ? ` → ${tour.endDate}` : ''}
                      {tour.city && ` · ${tour.city}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={e => { e.stopPropagation(); setEditingTour(tour); setShowTourModal(true) }}
                      style={{ background: 'none', border: '1px solid #1F1F2E', color: '#5A5570', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px' }}>✏</button>
                    <button onClick={async e => { e.stopPropagation(); if (!confirm('Delete this tour?')) return; await api('delete_tour', { tourId: tour.id }); if (selectedTour?.id === tour.id) setSelectedTour(null); refresh() }}
                      style={{ background: 'none', border: '1px solid #E8453C', color: '#E8453C', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px' }}>✕</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Selected tour members */}
            {selectedTour && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#C9A84C' }}>
                    👥 {tourMembers.length} member{tourMembers.length !== 1 ? 's' : ''}
                  </div>
                  <Button size="sm" onClick={() => { setEditingMember(null); setShowMemberModal(true) }}>+ Member</Button>
                </div>

                {tourMembers.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#5A5570', fontSize: '13px', padding: '24px', background: '#12121A', borderRadius: '12px' }}>
                    Add your first team member
                  </div>
                ) : (
                  tourMembers.map(member => (
                    <Card key={member.id} style={{ marginBottom: '10px' }}>
                      {/* Member header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: expandedMember === member.id ? '14px' : 0 }}>
                        <div onClick={() => setExpandedMember(expandedMember === member.id ? null : member.id)} style={{ flex: 1, cursor: 'pointer' }}>
                          <div style={{ fontWeight: 800, fontSize: '14px' }}>{member.name}</div>
                          <div style={{ fontSize: '11px', color: '#5A5570' }}>
                            {member.role && <span style={{ color: '#C9A84C' }}>{member.role}</span>}
                            {member.email && <span> · {member.email}</span>}
                          </div>
                          {member.hotel && (
                            <div style={{ fontSize: '11px', color: '#5A5570', marginTop: '2px' }}>
                              🏨 {member.hotel}{member.room ? ` · Room ${member.room}` : ''}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <button onClick={() => setExpandedMember(expandedMember === member.id ? null : member.id)}
                            style={{ background: 'none', border: 'none', color: '#5A5570', fontSize: '18px', cursor: 'pointer', padding: '0 4px' }}>
                            {expandedMember === member.id ? '▲' : '▼'}
                          </button>
                          <button onClick={() => { setEditingMember(member); setShowMemberModal(true) }}
                            style={{ background: 'none', border: '1px solid #1F1F2E', color: '#5A5570', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px' }}>✏</button>
                          <button onClick={async () => { if (!confirm(`Remove ${member.name}?`)) return; await api('delete_member', { memberId: member.id }); refresh(selectedTour.id) }}
                            style={{ background: 'none', border: '1px solid #E8453C', color: '#E8453C', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px' }}>✕</button>
                        </div>
                      </div>

                      {/* Expanded — tickets */}
                      {expandedMember === member.id && (
                        <div style={{ borderTop: '1px solid #1F1F2E', paddingTop: '14px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 800, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '10px' }}>✈ Travel tickets</div>
                          <MemberTickets
                            member={member}
                            tourId={selectedTour.id}
                            tickets={tickets}
                            onRefresh={() => refresh(selectedTour.id)}
                          />
                          {member.notes && (
                            <div style={{ marginTop: '10px', fontSize: '12px', color: '#5A5570', fontStyle: 'italic' }}>{member.notes}</div>
                          )}
                        </div>
                      )}
                    </Card>
                  ))
                )}
              </>
            )}
          </>
        )}
      </div>

      <TourModal key={editingTour?.id || 'new-tour'} open={showTourModal} onClose={() => setShowTourModal(false)} editing={editingTour} onSaved={() => refresh()} />
      <MemberModal key={editingMember?.id || 'new-member'} open={showMemberModal} onClose={() => setShowMemberModal(false)} tourId={selectedTour?.id} editing={editingMember} onSaved={() => refresh(selectedTour?.id)} />
    </div>
  )
}
