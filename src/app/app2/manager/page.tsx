'use client'
import { useState, useEffect, useRef } from 'react'
import { getToken } from '@/lib/store'
import { Button, Card, Input, Textarea, Modal, EmptyState, Toolbar, showToast } from '@/components/ui'

const PHONE_PREFIXES = [
  { label: '🇫🇷 +33', value: '+33' }, { label: '🇪🇸 +34', value: '+34' },
  { label: '🇵🇾 +595', value: '+595' }, { label: '🇧🇪 +32', value: '+32' },
  { label: '🇨🇭 +41', value: '+41' }, { label: '🇮🇹 +39', value: '+39' },
  { label: '🇬🇧 +44', value: '+44' }, { label: '🇩🇪 +49', value: '+49' },
  { label: '🇵🇹 +351', value: '+351' }, { label: '🇺🇸 +1', value: '+1' },
  { label: '🇦🇷 +54', value: '+54' }, { label: '🇧🇷 +55', value: '+55' },
]
function parsePhone(phone: string) {
  for (const p of PHONE_PREFIXES) {
    if (phone?.startsWith(p.value)) return { prefix: p.value, number: phone.slice(p.value.length) }
  }
  return { prefix: '+33', number: phone || '' }
}

const ROLES = ['Chanteur·se', 'Musicien·ne', 'Batteur·se', 'Pianiste', 'Guitariste', 'Bassiste', 'Ingénieur son', 'Ingénieur lumière', 'Tour manager', 'Road manager', 'Autre']

async function api(action: string, data: any = {}) {
  const res = await fetch('/api/manager', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
    body: JSON.stringify({ action, ...data })
  })
  return res.json()
}

async function loadData(params: Record<string, string> = {}) {
  const q = new URLSearchParams(params).toString()
  const res = await fetch(`/api/manager${q ? '?' + q : ''}`, { headers: { 'Authorization': `Bearer ${getToken()}` } })
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

async function extractShows(base64: string, mimeType: string) {
  try {
    const res = await fetch('/api/extract-shows', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64, mimeType })
    })
    return await res.json()
  } catch { return [] }
}

// ─── Ticket Upload Component ───────────────────────────────────────────────
function TicketUpload({ showId, memberId, tourId, tickets, onRefresh }: any) {
  const outRef = useRef<HTMLInputElement>(null)
  const retRef = useRef<HTMLInputElement>(null)
  const [scanning, setScanning] = useState<'out' | 'ret' | null>(null)
  const [viewing, setViewing] = useState<any>(null)

  const outTickets = tickets.filter((t: any) => t.direction === 'out')
  const retTickets = tickets.filter((t: any) => t.direction === 'ret')

  const handleFile = async (file: File, direction: 'out' | 'ret') => {
    const b64 = await new Promise<string>(res => {
      const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(file)
    })
    setScanning(direction)
    const info = await extractTicket(b64, file.type)
    await api('upload_ticket', { showId, memberId, tourId, direction, ticketData: b64, ticketName: file.name, ticketMime: file.type, info })
    setScanning(null)
    showToast('Ticket added ✓')
    onRefresh()
  }

  const TicketCard = ({ t, color }: any) => (
    <div style={{ background: '#0A0A0F', border: `1px solid ${color}25`, borderRadius: '10px', padding: '10px 12px', marginBottom: '6px' }}>
      {t.info?.date && <div style={{ fontSize: '11px', color: '#5A5570' }}>📅 {t.info.date}</div>}
      {(t.info?.from || t.info?.to) && <div style={{ fontSize: '14px', fontWeight: 800 }}>{t.info.from || '?'} → {t.info.to || '?'}</div>}
      {t.info?.time && <div style={{ fontSize: '11px', color: '#5A5570' }}>🕐 {t.info.time}{t.info.ref ? ` · ${t.info.ref}` : ''}</div>}
      {!t.info?.from && !t.info?.to && <div style={{ fontSize: '12px', color: '#5A5570' }}>{t.ticket_name}</div>}
      <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
        <button onClick={() => setViewing(t)} style={{ flex: 1, background: color, border: 'none', color: '#0A0A0F', borderRadius: '8px', padding: '7px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 800 }}>📱 Show</button>
        <button onClick={async () => { await api('delete_ticket', { ticketId: t.id }); onRefresh() }} style={{ background: 'none', border: `1px solid #E8453C`, color: '#E8453C', borderRadius: '8px', padding: '7px 10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px' }}>✕</button>
      </div>
    </div>
  )

  return (
    <>
      <input ref={outRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0], 'out')} />
      <input ref={retRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0], 'ret')} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 800, color: '#C9A84C', letterSpacing: '.1em', marginBottom: '8px' }}>✈ OUTBOUND</div>
          {outTickets.map((t: any) => <TicketCard key={t.id} t={t} color="#C9A84C" />)}
          <button onClick={() => outRef.current?.click()} style={{ width: '100%', background: '#0A0A0F', border: '1px dashed rgba(201,168,76,.3)', color: '#5A5570', borderRadius: '10px', padding: '10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px' }}>
            {scanning === 'out' ? '🤖 Reading...' : '+ Add ticket'}
          </button>
        </div>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 800, color: '#5DC9A0', letterSpacing: '.1em', marginBottom: '8px' }}>🔄 RETURN</div>
          {retTickets.map((t: any) => <TicketCard key={t.id} t={t} color="#5DC9A0" />)}
          <button onClick={() => retRef.current?.click()} style={{ width: '100%', background: '#0A0A0F', border: '1px dashed rgba(93,201,160,.3)', color: '#5A5570', borderRadius: '10px', padding: '10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px' }}>
            {scanning === 'ret' ? '🤖 Reading...' : '+ Add ticket'}
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

// ─── Modals ────────────────────────────────────────────────────────────────
function TourModal({ open, onClose, editing, onSaved }: any) {
  const [name, setName] = useState(editing?.name || '')
  const [notes, setNotes] = useState(editing?.notes || '')
  const [saving, setSaving] = useState(false)
  const save = async () => {
    if (!name.trim()) { showToast('Tour name required', false); return }
    setSaving(true)
    if (editing) await api('update_tour', { tourId: editing.id, name, notes })
    else await api('create_tour', { name, notes })
    showToast(editing ? 'Updated' : 'Tour created ✓')
    setSaving(false); onSaved(); onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Tour' : 'New Tour'}>
      <Input label="Tour name *" value={name} onChange={e => setName(e.target.value)} placeholder="Vincent Dedienne — Été 2026" />
      <Textarea label="Notes" value={notes} onChange={e => setNotes(e.target.value)} style={{ minHeight: '50px' }} />
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
        <Button onClick={save} disabled={saving} style={{ flex: 2 }}>{saving ? 'Saving...' : 'Save'}</Button>
      </div>
    </Modal>
  )
}

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
    showToast('Saved ✓')
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

function MemberModal({ open, onClose, tourId, editing, onSaved }: any) {
  const parsed = parsePhone(editing?.phone || '')
  const [name, setName] = useState(editing?.name || '')
  const [role, setRole] = useState(editing?.role || '')
  const [email, setEmail] = useState(editing?.email || '')
  const [prefix, setPrefix] = useState(parsed.prefix)
  const [phoneNum, setPhoneNum] = useState(parsed.number)
  const [notes, setNotes] = useState(editing?.notes || '')
  const [saving, setSaving] = useState(false)
  const save = async () => {
    if (!name.trim()) { showToast('Name required', false); return }
    setSaving(true)
    const phone = phoneNum ? prefix + phoneNum.replace(/^0/, '') : ''
    if (editing) await api('update_member', { memberId: editing.id, name, role, email, phone, notes })
    else await api('add_member', { tourId, name, role, email, phone, notes })
    showToast(editing ? 'Updated ✓' : `${name} added ✓`)
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
      <Input label="Email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jean@email.com" />
      <div>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '4px' }}>📱 Phone / WhatsApp</div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <select value={prefix} onChange={e => setPrefix(e.target.value)} style={{ background: 'rgba(255,255,255,.04)', border: '1px solid #1E1E2E', color: '#E8E0F0', borderRadius: '8px', padding: '10px 6px', fontFamily: 'inherit', fontSize: '12px', flexShrink: 0 }}>
            {PHONE_PREFIXES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <input value={phoneNum} onChange={e => setPhoneNum(e.target.value)} placeholder="6 12 34 56" style={{ flex: 1, background: 'rgba(255,255,255,.04)', border: '1px solid #1E1E2E', color: '#E8E0F0', borderRadius: '8px', padding: '10px', fontFamily: 'inherit', fontSize: '14px', outline: 'none' }} />
        </div>
      </div>
      <Textarea label="Notes" value={notes} onChange={e => setNotes(e.target.value)} style={{ minHeight: '50px', marginTop: '8px' }} />
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
        <Button onClick={save} disabled={saving} style={{ flex: 2 }}>{saving ? 'Saving...' : 'Save'}</Button>
      </div>
    </Modal>
  )
}

function HotelModal({ open, onClose, showId, memberId, tourId, existing, onSaved }: any) {
  const [hotel, setHotel] = useState(existing?.hotel || '')
  const [room, setRoom] = useState(existing?.room || '')
  const [hotelAddr, setHotelAddr] = useState(existing?.hotel_addr || '')
  const [notes, setNotes] = useState(existing?.notes || '')
  const [saving, setSaving] = useState(false)
  const save = async () => {
    setSaving(true)
    await api('save_show_member', { showId, memberId, tourId, hotel, room, hotelAddr, notes })
    showToast('Hotel saved ✓')
    setSaving(false); onSaved(); onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title="🏨 Hotel details">
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

// ─── Main Page ─────────────────────────────────────────────────────────────
type Screen = 'tours' | 'tour' | 'show' | 'member'

export default function ManagerPage() {
  const [screen, setScreen] = useState<Screen>('tours')
  const [tours, setTours] = useState<any[]>([])
  const [shows, setShows] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [showMembers, setShowMembers] = useState<any[]>([])
  const [tickets, setTickets] = useState<any[]>([])

  const [selTour, setSelTour] = useState<any>(null)
  const [selShow, setSelShow] = useState<any>(null)
  const [selMember, setSelMember] = useState<any>(null)
  const [tab, setTab] = useState<'shows' | 'team'>('shows')

  const [showTourModal, setShowTourModal] = useState(false)
  const [showShowModal, setShowShowModal] = useState(false)
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [showHotelModal, setShowHotelModal] = useState(false)
  const [editingTour, setEditingTour] = useState<any>(null)
  const [editingShow, setEditingShow] = useState<any>(null)
  const [editingMember, setEditingMember] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)

  const load = async (params: Record<string, string> = {}) => {
    const data = await loadData(params)
    if (data.tours) setTours(data.tours)
    if (data.shows) setShows(data.shows)
    if (data.members) setMembers(data.members)
    if (data.showMembers) setShowMembers(data.showMembers)
    if (data.tickets) setTickets(data.tickets)
    if (data.memberTickets) setTickets(data.memberTickets)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const goTours = () => { setScreen('tours'); setSelTour(null); setSelShow(null); setSelMember(null); load() }
  const goTour = async (tour: any) => { setSelTour(tour); setSelShow(null); setSelMember(null); setScreen('tour'); await load({ tourId: tour.id }) }
  const goShow = async (show: any) => { setSelShow(show); setSelMember(null); setScreen('show'); await load({ tourId: selTour.id, showId: show.id }) }
  const goMember = async (member: any) => { setSelMember(member); setScreen('member'); await load({ tourId: selTour.id, showId: selShow.id, memberId: member.id }) }

  const handleImport = async (file: File) => {
    const b64 = await new Promise<string>(res => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(file) })
    setImporting(true)
    const extracted = await extractShows(b64, file.type)
    if (Array.isArray(extracted) && extracted.length > 0) {
      await api('add_shows_bulk', { tourId: selTour.id, shows: extracted })
      showToast(`${extracted.length} shows imported ✓`)
      await load({ tourId: selTour.id })
    } else {
      showToast('No shows found — add manually', false)
    }
    setImporting(false)
  }

  const memberTickets = tickets.filter((t: any) => t.member_id === selMember?.id)
  const showMemberData = showMembers.find((sm: any) => sm.member_id === selMember?.id)
  const tourShows = shows.filter(s => s.tour_id === selTour?.id)
  const tourMembers = members.filter(m => m.tour_id === selTour?.id)

  // ── Breadcrumb ──────────────────────────────────────────────────────────
  const Breadcrumb = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 16px', marginBottom: '12px', fontSize: '12px', color: '#5A5570', flexWrap: 'wrap' }}>
      <span onClick={goTours} style={{ cursor: 'pointer', color: screen !== 'tours' ? '#C9A84C' : '#E8E0F0' }}>Tours</span>
      {selTour && <>
        <span>›</span>
        <span onClick={() => goTour(selTour)} style={{ cursor: 'pointer', color: screen === 'tour' ? '#E8E0F0' : '#C9A84C' }}>{selTour.name}</span>
      </>}
      {selShow && <>
        <span>›</span>
        <span onClick={() => goShow(selShow)} style={{ cursor: 'pointer', color: screen === 'show' ? '#E8E0F0' : '#C9A84C' }}>{selShow.date}{selShow.city ? ` · ${selShow.city}` : ''}</span>
      </>}
      {selMember && <>
        <span>›</span>
        <span style={{ color: '#E8E0F0' }}>{selMember.name}</span>
      </>}
    </div>
  )

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#5A5570' }}>Loading...</div>

  return (
    <div style={{ padding: '0 0 100px' }}>
      {/* ── SCREEN 1: Tours ── */}
      {screen === 'tours' && (
        <>
          <Toolbar title="Manager" actions={<Button size="sm" onClick={() => { setEditingTour(null); setShowTourModal(true) }}>+ Tour</Button>} />
          <div style={{ padding: '0 16px' }}>
            {tours.length === 0 ? (
              <EmptyState icon="🎪" title="No tours yet" sub="Create a tour to manage your team's travel, hotel and tickets." />
            ) : tours.map(t => (
              <Card key={t.id} style={{ marginBottom: '10px', cursor: 'pointer' }} onClick={() => goTour(t)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '15px' }}>{t.name}</div>
                    {t.notes && <div style={{ fontSize: '12px', color: '#5A5570', marginTop: '2px' }}>{t.notes}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button onClick={e => { e.stopPropagation(); setEditingTour(t); setShowTourModal(true) }} style={{ background: 'none', border: '1px solid #1F1F2E', color: '#5A5570', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px' }}>✏</button>
                    <button onClick={async e => { e.stopPropagation(); if (!confirm('Delete tour?')) return; await api('delete_tour', { tourId: t.id }); load() }} style={{ background: 'none', border: '1px solid #E8453C', color: '#E8453C', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px' }}>✕</button>
                    <span style={{ color: '#5A5570', fontSize: '18px' }}>›</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* ── SCREEN 2: Tour → Shows | Team ── */}
      {screen === 'tour' && selTour && (
        <>
          <Toolbar title={selTour.name} actions={<Button size="sm" onClick={() => { setEditingTour(selTour); setShowTourModal(true) }}>✏ Edit</Button>} />
          <Breadcrumb />
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px', padding: '0 16px', marginBottom: '16px' }}>
            {(['shows', 'team'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: `2px solid ${tab === t ? '#C9A84C' : '#1F1F2E'}`, background: tab === t ? 'rgba(201,168,76,.1)' : '#12121A', color: tab === t ? '#C9A84C' : '#5A5570', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: '13px' }}>
                {t === 'shows' ? `📅 Shows (${tourShows.length})` : `👥 Team (${tourMembers.length})`}
              </button>
            ))}
          </div>

          <div style={{ padding: '0 16px' }}>
            {tab === 'shows' && (
              <>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <input ref={importRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleImport(e.target.files[0])} />
                  <button onClick={() => importRef.current?.click()} style={{ flex: 1, background: '#12121A', border: '1px solid #1F1F2E', color: '#5A5570', borderRadius: '10px', padding: '10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 700 }}>
                    {importing ? '🤖 Reading...' : '📄 Import PDF/photo'}
                  </button>
                  <button onClick={() => { setEditingShow(null); setShowShowModal(true) }} style={{ flex: 1, background: '#C9A84C', border: 'none', color: '#0A0A0F', borderRadius: '10px', padding: '10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 800 }}>+ Add show</button>
                </div>
                {tourShows.length === 0 ? (
                  <EmptyState icon="📅" title="No shows yet" sub="Import a PDF planning or add shows manually." />
                ) : tourShows.map(s => (
                  <Card key={s.id} style={{ marginBottom: '8px', cursor: 'pointer' }} onClick={() => goShow(s)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '14px' }}>{s.venue || 'Show'}</div>
                        <div style={{ fontSize: '12px', color: '#5A5570' }}>📅 {s.date}{s.city ? ` · ${s.city}` : ''}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button onClick={e => { e.stopPropagation(); setEditingShow(s); setShowShowModal(true) }} style={{ background: 'none', border: '1px solid #1F1F2E', color: '#5A5570', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px' }}>✏</button>
                        <button onClick={async e => { e.stopPropagation(); if (!confirm('Delete show?')) return; await api('delete_show', { showId: s.id }); load({ tourId: selTour.id }) }} style={{ background: 'none', border: '1px solid #E8453C', color: '#E8453C', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px' }}>✕</button>
                        <span style={{ color: '#5A5570', fontSize: '18px' }}>›</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </>
            )}

            {tab === 'team' && (
              <>
                <Button size="sm" onClick={() => { setEditingMember(null); setShowMemberModal(true) }} style={{ marginBottom: '12px', width: '100%' }}>+ Add member</Button>
                {tourMembers.length === 0 ? (
                  <EmptyState icon="👥" title="No team members yet" sub="Add the musicians, technicians and crew." />
                ) : tourMembers.map(m => (
                  <Card key={m.id} style={{ marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '14px' }}>{m.name}</div>
                        {m.role && <div style={{ fontSize: '11px', color: '#C9A84C', fontWeight: 700 }}>{m.role}</div>}
                        {m.email && <div style={{ fontSize: '11px', color: '#5A5570' }}>✉ {m.email}</div>}
                        {m.phone && <div style={{ fontSize: '11px', color: '#5A5570' }}>📱 {m.phone}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => { setEditingMember(m); setShowMemberModal(true) }} style={{ background: 'none', border: '1px solid #1F1F2E', color: '#5A5570', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px' }}>✏</button>
                        <button onClick={async () => { if (!confirm(`Remove ${m.name}?`)) return; await api('delete_member', { memberId: m.id }); load({ tourId: selTour.id }) }} style={{ background: 'none', border: '1px solid #E8453C', color: '#E8453C', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px' }}>✕</button>
                      </div>
                    </div>
                  </Card>
                ))}
              </>
            )}
          </div>
        </>
      )}

      {/* ── SCREEN 3: Show → Members ── */}
      {screen === 'show' && selShow && (
        <>
          <Toolbar title={selShow.venue || selShow.date} actions={<Button size="sm" onClick={() => { setEditingShow(selShow); setShowShowModal(true) }}>✏ Edit</Button>} />
          <Breadcrumb />
          <div style={{ padding: '0 16px' }}>
            <div style={{ background: 'rgba(201,168,76,.06)', border: '1px solid rgba(201,168,76,.15)', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px' }}>
              <div style={{ fontWeight: 800, fontSize: '15px' }}>{selShow.venue}</div>
              <div style={{ fontSize: '12px', color: '#5A5570' }}>📅 {selShow.date}{selShow.city ? ` · ${selShow.city}` : ''}</div>
              {selShow.notes && <div style={{ fontSize: '12px', color: '#5A5570', marginTop: '4px', fontStyle: 'italic' }}>{selShow.notes}</div>}
            </div>

            <div style={{ fontSize: '12px', fontWeight: 800, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '10px' }}>
              👥 Team for this show
            </div>

            {tourMembers.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#5A5570', fontSize: '13px', padding: '20px', background: '#12121A', borderRadius: '12px' }}>
                Add team members in the Team tab first
              </div>
            ) : tourMembers.map(m => {
              const sm = showMembers.find(sm => sm.member_id === m.id)
              const memberTix = tickets.filter(t => t.member_id === m.id)
              return (
                <Card key={m.id} style={{ marginBottom: '8px', cursor: 'pointer' }} onClick={() => goMember(m)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '14px' }}>{m.name}</div>
                      {m.role && <div style={{ fontSize: '11px', color: '#C9A84C' }}>{m.role}</div>}
                      {sm?.hotel && <div style={{ fontSize: '11px', color: '#5A5570' }}>🏨 {sm.hotel}{sm.room ? ` · Room ${sm.room}` : ''}</div>}
                      <div style={{ fontSize: '11px', color: '#5A5570', marginTop: '2px' }}>
                        {memberTix.filter(t => t.direction === 'out').length > 0 && <span>✈ {memberTix.filter(t => t.direction === 'out').length} out · </span>}
                        {memberTix.filter(t => t.direction === 'ret').length > 0 && <span>🔄 {memberTix.filter(t => t.direction === 'ret').length} ret</span>}
                        {memberTix.length === 0 && <span style={{ color: '#E8453C' }}>No tickets yet</span>}
                      </div>
                    </div>
                    <span style={{ color: '#5A5570', fontSize: '18px' }}>›</span>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {/* ── SCREEN 4: Member detail ── */}
      {screen === 'member' && selMember && selShow && (
        <>
          <Toolbar title={selMember.name} />
          <Breadcrumb />
          <div style={{ padding: '0 16px' }}>
            {/* Member info */}
            <Card style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '15px' }}>{selMember.name}</div>
                  {selMember.role && <div style={{ fontSize: '12px', color: '#C9A84C', fontWeight: 700 }}>{selMember.role}</div>}
                  {selMember.email && <div style={{ fontSize: '12px', color: '#5A5570' }}>✉ {selMember.email}</div>}
                  {selMember.phone && <div style={{ fontSize: '12px', color: '#5A5570' }}>📱 {selMember.phone}</div>}
                </div>
                <button onClick={() => { setEditingMember(selMember); setShowMemberModal(true) }} style={{ background: 'none', border: '1px solid #1F1F2E', color: '#5A5570', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px' }}>✏</button>
              </div>
            </Card>

            {/* Hotel */}
            <Card style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showMemberData?.hotel ? '8px' : 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 800 }}>🏨 Hotel — {selShow.city || selShow.date}</div>
                <button onClick={() => setShowHotelModal(true)} style={{ background: 'rgba(201,168,76,.1)', border: '1px solid rgba(201,168,76,.2)', color: '#C9A84C', borderRadius: '8px', padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 700 }}>
                  {showMemberData?.hotel ? '✏ Edit' : '+ Add'}
                </button>
              </div>
              {showMemberData?.hotel ? (
                <div>
                  <div style={{ fontWeight: 700 }}>{showMemberData.hotel}</div>
                  {showMemberData.room && <div style={{ fontSize: '12px', color: '#5A5570' }}>Room {showMemberData.room}</div>}
                  {showMemberData.hotel_addr && <div style={{ fontSize: '12px', color: '#5A5570' }}>{showMemberData.hotel_addr}</div>}
                  {showMemberData.notes && <div style={{ fontSize: '12px', color: '#5A5570', fontStyle: 'italic' }}>{showMemberData.notes}</div>}
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: '#5A5570' }}>No hotel added yet</div>
              )}
            </Card>

            {/* Tickets */}
            <Card style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, marginBottom: '12px' }}>✈ Travel tickets</div>
              <TicketUpload
                showId={selShow.id}
                memberId={selMember.id}
                tourId={selTour.id}
                tickets={memberTickets}
                onRefresh={() => load({ tourId: selTour.id, showId: selShow.id, memberId: selMember.id })}
              />
            </Card>
          </div>
        </>
      )}

      {/* Modals */}
      <TourModal key={editingTour?.id || 'new-tour'} open={showTourModal} onClose={() => setShowTourModal(false)} editing={editingTour} onSaved={() => { load(); setShowTourModal(false) }} />
      <ShowModal key={editingShow?.id || 'new-show'} open={showShowModal} onClose={() => setShowShowModal(false)} tourId={selTour?.id} editing={editingShow} onSaved={() => load({ tourId: selTour?.id })} />
      <MemberModal key={editingMember?.id || 'new-member'} open={showMemberModal} onClose={() => setShowMemberModal(false)} tourId={selTour?.id} editing={editingMember} onSaved={() => { load({ tourId: selTour?.id }); if (selMember?.id === editingMember?.id) setSelMember({ ...selMember, ...editingMember }) }} />
      <HotelModal key={`hotel-${selMember?.id}-${selShow?.id}`} open={showHotelModal} onClose={() => setShowHotelModal(false)} showId={selShow?.id} memberId={selMember?.id} tourId={selTour?.id} existing={showMemberData} onSaved={() => load({ tourId: selTour?.id, showId: selShow?.id, memberId: selMember?.id })} />
    </div>
  )
}
