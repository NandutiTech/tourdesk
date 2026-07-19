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

async function loadData(tourId?: string) {
  const url = tourId ? `/api/manager?tourId=${tourId}` : '/api/manager'
  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${getToken()}` } })
  return res.json()
}

async function extractTicket(base64: string, mimeType: string) {
  try {
    const res = await fetch('/api/extract-ticket', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64, mimeType })
    })
    return await res.json()
  } catch { return {} }
}

async function extractShows(base64: string, mimeType: string): Promise<any[]> {
  try {
    const res = await fetch('/api/extract-ticket', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64, mimeType,
        prompt: 'This is a tour schedule or planning document. Extract ALL shows/dates listed. Return ONLY a valid JSON array with no markdown: [{ "date": "YYYY-MM-DD", "venue": "venue or theatre name", "city": "city name" }]. If you cannot find dates, return an empty array [].'
      })
    })
    const data = await res.json()
    // Response might be array directly or wrapped
    if (Array.isArray(data)) return data
    if (Array.isArray(data.shows)) return data.shows
    return []
  } catch { return [] }
}

const ROLES = ['Chanteur·se', 'Musicien·ne', 'Batteur·se', 'Pianiste', 'Guitariste', 'Bassiste', 'Ingénieur son', 'Ingénieur lumière', 'Tour manager', 'Road manager', 'Autre']

// ─── Tour Modal ────────────────────────────────────────────────────────────
function TourModal({ open, onClose, editing, onSaved }: any) {
  const [name, setName] = useState(editing?.name || '')
  const [notes, setNotes] = useState(editing?.notes || '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!name.trim()) { showToast('Tour name required', false); return }
    setSaving(true)
    if (editing) await api('update_tour', { tourId: editing.id, name, notes })
    else await api('create_tour', { name, notes })
    showToast(editing ? 'Tour updated' : 'Tour created')
    setSaving(false); onSaved(); onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Tour' : 'New Tour'}>
      <Input label="Tour name *" value={name} onChange={e => setName(e.target.value)} placeholder="Vincent Dedienne — Été 2026" />
      <Textarea label="Notes" value={notes} onChange={e => setNotes(e.target.value)} style={{ minHeight: '60px' }} />
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
        <Button onClick={save} disabled={saving} style={{ flex: 2 }}>{saving ? 'Saving...' : 'Save'}</Button>
      </div>
    </Modal>
  )
}

// ─── Show Modal ────────────────────────────────────────────────────────────
function ShowModal({ open, onClose, tourId, editing, onSaved }: any) {
  const [date, setDate] = useState(editing?.date || '')
  const [venue, setVenue] = useState(editing?.venue || '')
  const [city, setCity] = useState(editing?.city || '')
  const [notes, setNotes] = useState(editing?.notes || '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!date) { showToast('Date required', false); return }
    setSaving(true)
    if (editing) await api('update_show', { showId: editing.id, date, venue, city, notes })
    else await api('add_show', { tourId, date, venue, city, notes })
    showToast(editing ? 'Show updated' : 'Show added')
    setSaving(false); onSaved(); onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Show' : 'Add Show'}>
      <Input label="Date *" type="date" value={date} onChange={e => setDate(e.target.value)} />
      <Input label="Venue" value={venue} onChange={e => setVenue(e.target.value)} placeholder="Théâtre du Châtelet" />
      <Input label="City" value={city} onChange={e => setCity(e.target.value)} placeholder="Paris" />
      <Textarea label="Notes" value={notes} onChange={e => setNotes(e.target.value)} style={{ minHeight: '50px' }} />
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
  const [phone, setPhone] = useState(editing?.phone || '')
  const [hotel, setHotel] = useState(editing?.hotel || '')
  const [room, setRoom] = useState(editing?.room || '')
  const [hotelAddr, setHotelAddr] = useState(editing?.hotel_addr || '')
  const [notes, setNotes] = useState(editing?.notes || '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!name.trim()) { showToast('Name required', false); return }
    setSaving(true)
    if (editing) await api('update_member', { memberId: editing.id, name, role, email, phone, hotel, room, hotelAddr, notes })
    else await api('add_member', { tourId, name, role, email, phone, hotel, room, hotelAddr, notes })
    showToast(editing ? 'Updated' : `${name} added`)
    setSaving(false); onSaved(); onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Member' : 'Add Member'}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Input label="Name *" value={name} onChange={e => setName(e.target.value)} placeholder="Jean Dupont" />
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '4px' }}>Role</div>
          <select value={role} onChange={e => setRole(e.target.value)} style={{ width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid #1E1E2E', color: role ? '#E8E0F0' : '#5A5570', borderRadius: '8px', padding: '10px', fontFamily: 'inherit', fontSize: '13px', outline: 'none' }}>
            <option value="">Select...</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Input label="Email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jean@email.com" />
        <Input label="Phone / WhatsApp" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+33 6..." />
      </div>
      <div style={{ fontSize: '11px', fontWeight: 800, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.08em', margin: '8px 0 4px' }}>🏨 Hotel</div>
      <Input label="Hotel name" value={hotel} onChange={e => setHotel(e.target.value)} placeholder="Hôtel du Palais" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px' }}>
        <Input label="Room" value={room} onChange={e => setRoom(e.target.value)} placeholder="214" />
        <Input label="Address" value={hotelAddr} onChange={e => setHotelAddr(e.target.value)} placeholder="12 rue..." />
      </div>
      <Textarea label="Notes" value={notes} onChange={e => setNotes(e.target.value)} style={{ minHeight: '50px' }} />
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
        <Button onClick={save} disabled={saving} style={{ flex: 2 }}>{saving ? 'Saving...' : 'Save'}</Button>
      </div>
    </Modal>
  )
}

// ─── Member Tickets ────────────────────────────────────────────────────────
function MemberTickets({ member, tourId, showId, tickets, onRefresh }: any) {
  const outRef = useRef<HTMLInputElement>(null)
  const retRef = useRef<HTMLInputElement>(null)
  const [scanning, setScanning] = useState<'out' | 'ret' | null>(null)
  const [viewing, setViewing] = useState<any>(null)

  const memberTickets = tickets.filter((t: any) => t.member_id === member.id && (!showId || t.show_id === showId))
  const outTickets = memberTickets.filter((t: any) => t.direction === 'out')
  const retTickets = memberTickets.filter((t: any) => t.direction === 'ret')

  const handleFile = async (file: File, direction: 'out' | 'ret') => {
    const b64 = await new Promise<string>(res => {
      const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(file)
    })
    setScanning(direction)
    const info = await extractTicket(b64, file.type)
    await api('upload_ticket', {
      memberId: member.id, tourId, showId: showId || null, direction,
      ticketData: b64, ticketName: file.name, ticketMime: file.type, info
    })
    setScanning(null)
    showToast('Ticket added')
    onRefresh()
  }

  const TicketRow = ({ t, color }: any) => (
    <div style={{ background: '#0A0A0F', border: `1px solid ${color}20`, borderRadius: '8px', padding: '10px', marginBottom: '6px' }}>
      {t.info?.date && <div style={{ fontSize: '11px', color: '#5A5570' }}>📅 {t.info.date}</div>}
      {(t.info?.from || t.info?.to) && <div style={{ fontSize: '13px', fontWeight: 700 }}>{t.info.from || '?'} → {t.info.to || '?'}</div>}
      {t.info?.time && <div style={{ fontSize: '11px', color: '#5A5570' }}>🕐 {t.info.time}{t.info.ref ? ` · ${t.info.ref}` : ''}</div>}
      {!t.info?.from && !t.info?.to && <div style={{ fontSize: '11px', color: '#5A5570' }}>{t.ticket_name}</div>}
      <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
        <button onClick={() => setViewing(t)} style={{ flex: 1, background: color, border: 'none', color: '#0A0A0F', borderRadius: '6px', padding: '6px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', fontWeight: 800 }}>📱 Show</button>
        <button onClick={async () => { await api('delete_ticket', { ticketId: t.id }); onRefresh() }} style={{ background: 'none', border: '1px solid #E8453C', color: '#E8453C', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px' }}>✕</button>
      </div>
    </div>
  )

  return (
    <>
      <input ref={outRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0], 'out')} />
      <input ref={retRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0], 'ret')} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 800, color: '#C9A84C', letterSpacing: '.1em', marginBottom: '6px' }}>✈ OUTBOUND</div>
          {outTickets.map((t: any) => <TicketRow key={t.id} t={t} color="#C9A84C" />)}
          <button onClick={() => outRef.current?.click()} style={{ width: '100%', background: '#0A0A0F', border: '1px dashed rgba(201,168,76,.3)', color: '#5A5570', borderRadius: '8px', padding: '8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px' }}>
            {scanning === 'out' ? '🤖 Reading...' : '+ Add'}
          </button>
        </div>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 800, color: '#5DC9A0', letterSpacing: '.1em', marginBottom: '6px' }}>🔄 RETURN</div>
          {retTickets.map((t: any) => <TicketRow key={t.id} t={t} color="#5DC9A0" />)}
          <button onClick={() => retRef.current?.click()} style={{ width: '100%', background: '#0A0A0F', border: '1px dashed rgba(93,201,160,.3)', color: '#5A5570', borderRadius: '8px', padding: '8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px' }}>
            {scanning === 'ret' ? '🤖 Reading...' : '+ Add'}
          </button>
        </div>
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
  const [shows, setShows] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [tickets, setTickets] = useState<any[]>([])
  const [selectedTour, setSelectedTour] = useState<any>(null)
  const [selectedShow, setSelectedShow] = useState<any>(null)
  const [expandedMember, setExpandedMember] = useState<string | null>(null)
  const [showTourModal, setShowTourModal] = useState(false)
  const [showShowModal, setShowShowModal] = useState(false)
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [editingTour, setEditingTour] = useState<any>(null)
  const [editingShow, setEditingShow] = useState<any>(null)
  const [editingMember, setEditingMember] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [importingShows, setImportingShows] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)

  const refresh = async (tourId?: string) => {
    const data = await loadData(tourId)
    const tourList = (data.tours || []).map((t: any) => ({
      id: t.id, name: t.name, notes: t.notes
    }))
    setTours(tourList)
    setMembers(data.members || [])
    setTickets(data.tickets || [])
    setShows((data.shows || []).sort((a: any, b: any) => a.date.localeCompare(b.date)))
    setLoading(false)
  }

  useEffect(() => { refresh() }, [])

  const selectTour = async (tour: any) => {
    setSelectedTour(tour)
    setSelectedShow(null)
    setExpandedMember(null)
    await refresh(tour.id)
  }

  const handleImport = async (file: File) => {
    if (!selectedTour) return
    const b64 = await new Promise<string>(res => {
      const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(file)
    })
    setImportingShows(true)
    const extracted = await extractShows(b64, file.type)
    if (extracted.length > 0) {
      await api('add_shows_bulk', { tourId: selectedTour.id, shows: extracted })
      showToast(`${extracted.length} shows imported`)
      await refresh(selectedTour.id)
    } else {
      showToast('No shows found — add manually', false)
    }
    setImportingShows(false)
  }

  const tourShows = shows.filter(s => s.tour_id === selectedTour?.id)
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
        {tours.length === 0 ? (
          <EmptyState icon="🎪" title="No tours yet" sub="Create a tour to manage your team's travel, hotel and tickets." />
        ) : (
          <>
            {/* Tour list */}
            <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {tours.map(tour => (
                <div key={tour.id} onClick={() => selectTour(tour)}
                  style={{ padding: '14px 16px', borderRadius: '12px', border: `2px solid ${selectedTour?.id === tour.id ? '#C9A84C' : '#1F1F2E'}`, background: selectedTour?.id === tour.id ? 'rgba(201,168,76,.08)' : '#12121A', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: '14px', color: selectedTour?.id === tour.id ? '#C9A84C' : '#E8E0F0' }}>{tour.name}</div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={e => { e.stopPropagation(); setEditingTour(tour); setShowTourModal(true) }}
                      style={{ background: 'none', border: '1px solid #1F1F2E', color: '#5A5570', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px' }}>✏</button>
                    <button onClick={async e => { e.stopPropagation(); if (!confirm('Delete tour?')) return; await api('delete_tour', { tourId: tour.id }); if (selectedTour?.id === tour.id) setSelectedTour(null); refresh() }}
                      style={{ background: 'none', border: '1px solid #E8453C', color: '#E8453C', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px' }}>✕</button>
                  </div>
                </div>
              ))}
            </div>

            {selectedTour && (
              <>
                {/* ── SHOWS ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.1em' }}>
                    📅 Shows ({tourShows.length})
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input ref={importRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleImport(e.target.files[0])} />
                    <button onClick={() => importRef.current?.click()} style={{ background: '#12121A', border: '1px solid #1F1F2E', color: '#5A5570', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', fontWeight: 700 }}>
                      {importingShows ? '🤖 Reading...' : '📄 Import PDF'}
                    </button>
                    <button onClick={() => { setEditingShow(null); setShowShowModal(true) }} style={{ background: '#C9A84C', border: 'none', color: '#0A0A0F', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', fontWeight: 800 }}>
                      + Add
                    </button>
                  </div>
                </div>

                {tourShows.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '16px', paddingBottom: '4px' }}>
                    <button onClick={() => setSelectedShow(null)}
                      style={{ flexShrink: 0, padding: '8px 14px', borderRadius: '20px', border: `1px solid ${!selectedShow ? '#C9A84C' : '#1F1F2E'}`, background: !selectedShow ? 'rgba(201,168,76,.1)' : '#12121A', color: !selectedShow ? '#C9A84C' : '#5A5570', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 700 }}>
                      All
                    </button>
                    {tourShows.map(show => (
                      <div key={show.id} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button onClick={() => setSelectedShow(selectedShow?.id === show.id ? null : show)}
                          style={{ padding: '8px 14px', borderRadius: '20px', border: `1px solid ${selectedShow?.id === show.id ? '#C9A84C' : '#1F1F2E'}`, background: selectedShow?.id === show.id ? 'rgba(201,168,76,.1)' : '#12121A', color: selectedShow?.id === show.id ? '#C9A84C' : '#5A5570', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {show.date} {show.city ? `· ${show.city}` : ''}
                        </button>
                        <button onClick={async () => { if (!confirm('Delete show?')) return; await api('delete_show', { showId: show.id }); if (selectedShow?.id === show.id) setSelectedShow(null); refresh(selectedTour.id) }}
                          style={{ background: 'none', border: 'none', color: '#E8453C', cursor: 'pointer', fontSize: '14px', padding: '0 2px' }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected show details */}
                {selectedShow && (
                  <Card style={{ marginBottom: '16px', background: 'rgba(201,168,76,.04)', border: '1px solid rgba(201,168,76,.15)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '15px' }}>{selectedShow.venue || 'Show'}</div>
                        <div style={{ fontSize: '12px', color: '#5A5570' }}>📅 {selectedShow.date}{selectedShow.city ? ` · ${selectedShow.city}` : ''}</div>
                        {selectedShow.notes && <div style={{ fontSize: '12px', color: '#5A5570', marginTop: '4px', fontStyle: 'italic' }}>{selectedShow.notes}</div>}
                      </div>
                      <button onClick={() => { setEditingShow(selectedShow); setShowShowModal(true) }}
                        style={{ background: 'none', border: '1px solid #1F1F2E', color: '#5A5570', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px' }}>✏</button>
                    </div>
                  </Card>
                )}

                {/* ── MEMBERS ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.1em' }}>
                    👥 Team ({tourMembers.length})
                  </div>
                  <Button size="sm" onClick={() => { setEditingMember(null); setShowMemberModal(true) }}>+ Member</Button>
                </div>

                {tourMembers.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#5A5570', fontSize: '13px', padding: '20px', background: '#12121A', borderRadius: '12px', marginBottom: '16px' }}>
                    Add your team members
                  </div>
                ) : (
                  tourMembers.map(member => (
                    <Card key={member.id} style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div onClick={() => setExpandedMember(expandedMember === member.id ? null : member.id)} style={{ flex: 1, cursor: 'pointer' }}>
                          <div style={{ fontWeight: 800, fontSize: '14px' }}>{member.name}</div>
                          {member.role && <div style={{ fontSize: '11px', color: '#C9A84C', fontWeight: 700 }}>{member.role}</div>}
                          {member.hotel && <div style={{ fontSize: '11px', color: '#5A5570' }}>🏨 {member.hotel}{member.room ? ` · Room ${member.room}` : ''}</div>}
                          {member.email && <div style={{ fontSize: '11px', color: '#5A5570' }}>✉ {member.email}</div>}
          {member.phone && <div style={{ fontSize: '11px', color: '#5A5570' }}>📱 {member.phone}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <button onClick={() => setExpandedMember(expandedMember === member.id ? null : member.id)}
                            style={{ background: 'none', border: 'none', color: '#5A5570', fontSize: '16px', cursor: 'pointer' }}>
                            {expandedMember === member.id ? '▲' : '▼'}
                          </button>
                          <button onClick={() => { setEditingMember(member); setShowMemberModal(true) }}
                            style={{ background: 'none', border: '1px solid #1F1F2E', color: '#5A5570', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px' }}>✏</button>
                          <button onClick={async () => { if (!confirm(`Remove ${member.name}?`)) return; await api('delete_member', { memberId: member.id }); refresh(selectedTour.id) }}
                            style={{ background: 'none', border: '1px solid #E8453C', color: '#E8453C', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px' }}>✕</button>
                        </div>
                      </div>

                      {expandedMember === member.id && (
                        <div style={{ borderTop: '1px solid #1F1F2E', paddingTop: '14px', marginTop: '12px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 800, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '10px' }}>
                            ✈ Tickets {selectedShow ? `— ${selectedShow.date}` : '(all shows)'}
                          </div>
                          <MemberTickets
                            member={member}
                            tourId={selectedTour.id}
                            showId={selectedShow?.id || null}
                            tickets={tickets}
                            onRefresh={() => refresh(selectedTour.id)}
                          />
                          {member.notes && <div style={{ marginTop: '10px', fontSize: '12px', color: '#5A5570', fontStyle: 'italic' }}>{member.notes}</div>}
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
      <ShowModal key={editingShow?.id || 'new-show'} open={showShowModal} onClose={() => setShowShowModal(false)} tourId={selectedTour?.id} editing={editingShow} onSaved={() => refresh(selectedTour?.id)} />
      <MemberModal key={editingMember?.id || 'new-member'} open={showMemberModal} onClose={() => setShowMemberModal(false)} tourId={selectedTour?.id} editing={editingMember} onSaved={() => refresh(selectedTour?.id)} />
    </div>
  )
}
