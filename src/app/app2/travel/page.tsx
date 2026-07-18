'use client'
import { useState, useRef } from 'react'
import { useStore, newId } from '@/lib/store'
import { syncToCloud, deleteFromCloud } from '@/lib/sync'
import { Button, Card, Select, Textarea, Modal, EmptyState, Toolbar, showToast } from '@/components/ui'
import { Trip, TripTicket } from '@/lib/types'

// ─── Step 1: Select event ───────────────────────────────────────────────────
// ─── Step 2: Upload tickets (outbound + return) ─────────────────────────────
// ─── Step 3: Save → Claude reads each ticket, fills info, saves ─────────────

async function readTicket(base64: string, mimeType: string): Promise<any> {
  try {
    const res = await fetch('/api/extract-ticket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64, mimeType })
    })
    if (!res.ok) return null
    const data = await res.json()
    return Object.keys(data).length > 0 ? data : null
  } catch { return null }
}

function TicketUploader({ label, color, tickets, onChange }: {
  label: string
  color: string
  tickets: TripTicket[]
  onChange: (tickets: TripTicket[]) => void
}) {
  const ref = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    const b64 = await new Promise<string>((res) => {
      const r = new FileReader()
      r.onload = () => res(r.result as string)
      r.readAsDataURL(file)
    })
    const ticket: TripTicket = { id: newId(), data: b64, name: file.name, mime: file.type }
    onChange([...tickets, ticket])
  }

  const remove = (id: string) => onChange(tickets.filter(t => t.id !== id))

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '11px', fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '8px' }}>
        {label === 'Outbound' ? '✈' : '🔄'} {label}
      </div>
      {tickets.map((t, i) => (
        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#12121A', border: `1px solid ${color}30`, borderRadius: '10px', padding: '10px 12px', marginBottom: '6px' }}>
          <span style={{ fontSize: '18px' }}>{t.mime === 'application/pdf' ? '📄' : '🖼'}</span>
          <span style={{ flex: 1, fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Ticket {i + 1} · {t.name}
          </span>
          <button onClick={() => remove(t.id)} style={{ background: 'none', border: 'none', color: '#E8453C', cursor: 'pointer', fontSize: '16px' }}>✕</button>
        </div>
      ))}
      <input ref={ref} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <button onClick={() => ref.current?.click()} style={{ width: '100%', background: '#12121A', border: `1px dashed ${color}40`, color: '#5A5570', borderRadius: '10px', padding: '12px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}>
        + Add {label.toLowerCase()} ticket
      </button>
    </div>
  )
}

function TripModal({ open, onClose, editing }: { open: boolean, onClose: () => void, editing?: Trip | null }) {
  const { artists, addTrip, updateTrip, tours } = useStore()
  const [tourId, setTourId] = useState(editing?.tourId || '')
  const [outTickets, setOutTickets] = useState<TripTicket[]>(editing?.outTickets || [])
  const [retTickets, setRetTickets] = useState<TripTicket[]>(editing?.retTickets || [])
  const [notes, setNotes] = useState(editing?.notes || '')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  const linkedTour = tours.find(t => t.id === tourId)
  const linkedArtist = artists.find(a => a.id === linkedTour?.aId)

  const save = async () => {
    if (!tourId && outTickets.length === 0 && retTickets.length === 0) {
      showToast('Select an event or add a ticket', false); return
    }
    if (saving) return
    setSaving(true)

    // Read all tickets with Claude
    const allTickets = [...outTickets, ...retTickets]
    const hasUnread = allTickets.some(t => !t.info)

    if (hasUnread) {
      setStatus('🤖 Reading tickets...')
      const readOut = await Promise.all(outTickets.map(async t => {
        if (t.info) return t
        setStatus(`🤖 Reading ticket...`)
        const info = await readTicket(t.data, t.mime)
        return { ...t, info: info || {} }
      }))
      const readRet = await Promise.all(retTickets.map(async t => {
        if (t.info) return t
        const info = await readTicket(t.data, t.mime)
        return { ...t, info: info || {} }
      }))

      const trip: Trip = {
        id: editing?.id || newId(),
        aId: linkedTour?.aId || null,
        tourId: tourId || null,
        outTickets: readOut,
        retTickets: readRet,
        notes
      }
      if (editing) updateTrip(trip)
      else addTrip(trip)
    } else {
      const trip: Trip = {
        id: editing?.id || newId(),
        aId: linkedTour?.aId || null,
        tourId: tourId || null,
        outTickets,
        retTickets,
        notes
      }
      if (editing) updateTrip(trip)
      else addTrip(trip)
    }

    await syncToCloud()
    showToast('Trip saved ✓')
    setSaving(false)
    setStatus('')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Trip' : 'New Trip'}>
      {/* Step 1: Event */}
      <Select label="Event" value={tourId} onChange={e => setTourId(e.target.value)}>
        <option value="">Select an event...</option>
        {[...tours].sort((a, b) => b.start.localeCompare(a.start)).map(t => {
          const artist = artists.find(a => a.id === t.aId)
          return <option key={t.id} value={t.id}>{t.start} — {t.title}{artist ? ` · ${artist.name}` : ''}</option>
        })}
      </Select>

      {linkedTour && (
        <div style={{ background: 'rgba(93,201,160,.06)', border: '1px solid rgba(93,201,160,.15)', borderRadius: '10px', padding: '12px', marginBottom: '14px' }}>
          <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '2px' }}>{linkedTour.title}</div>
          <div style={{ fontSize: '12px', color: '#5A5570' }}>
            📅 {linkedTour.start}{linkedTour.end && linkedTour.end !== linkedTour.start ? ` → ${linkedTour.end}` : ''}
            {linkedArtist && <span style={{ color: linkedArtist.color }}> · {linkedArtist.name}</span>}
          </div>
        </div>
      )}

      {/* Step 2: Tickets */}
      <TicketUploader label="Outbound" color="#C9A84C" tickets={outTickets} onChange={setOutTickets} />
      <TicketUploader label="Return" color="#5DC9A0" tickets={retTickets} onChange={setRetTickets} />

      <Textarea label="Notes" value={notes} onChange={e => setNotes(e.target.value)} style={{ minHeight: '60px' }} />

      {/* Step 3: Save — Claude reads here */}
      {status && (
        <div style={{ background: 'rgba(139,92,246,.1)', border: '1px solid rgba(139,92,246,.2)', borderRadius: '10px', padding: '12px', marginBottom: '10px', fontSize: '13px', color: '#8B5CF6', textAlign: 'center' }}>
          {status}
        </div>
      )}
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button variant="secondary" onClick={onClose} style={{ flex: 1 }} disabled={saving}>Cancel</Button>
        <Button onClick={save} disabled={saving} style={{ flex: 2 }}>
          {saving ? status || 'Saving...' : 'Save & scan tickets →'}
        </Button>
      </div>
    </Modal>
  )
}

export default function TravelPage() {
  const { trips, artists, tours, deleteTrip } = useStore()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Trip | null>(null)
  const [viewing, setViewing] = useState<TripTicket | null>(null)

  const today = new Date().toISOString().slice(0, 10)

  const enriched = trips.map(t => {
    const linkedTour = tours.find(tour => tour.id === t.tourId)
    const artist = artists.find(a => a.id === (t.aId || linkedTour?.aId))
    const date = linkedTour?.start || t.outTickets?.[0]?.info?.date || ''
    return { ...t, linkedTour, artist, date }
  }).sort((a, b) => (a.date || '').localeCompare(b.date || ''))

  const upcoming = enriched.filter(t => !t.date || t.date >= today)
  const past = enriched.filter(t => t.date && t.date < today).reverse()

  const handleDelete = async (t: Trip) => {
    if (!confirm('Delete this trip?')) return
    await deleteFromCloud('trips', t.id)
    deleteTrip(t.id)
    showToast('Trip deleted')
  }

  const TicketBlock = ({ tickets, color, label }: { tickets: TripTicket[], color: string, label: string }) => {
    if (!tickets?.length) return null
    return (
      <div style={{ background: '#12121A', borderRadius: '10px', padding: '12px', marginBottom: '8px' }}>
        <div style={{ fontSize: '10px', fontWeight: 800, color, letterSpacing: '.1em', marginBottom: '8px' }}>
          {label === 'Outbound' ? '✈' : '🔄'} {label.toUpperCase()}
        </div>
        {tickets.map((tk, i) => (
          <div key={tk.id} style={{ marginBottom: i < tickets.length - 1 ? '10px' : 0 }}>
            {tickets.length > 1 && (
              <div style={{ fontSize: '10px', fontWeight: 700, color, marginBottom: '3px' }}>Ticket {i + 1}</div>
            )}
            {tk.info?.date && <div style={{ fontSize: '12px', color: '#5A5570', marginBottom: '2px' }}>📅 {tk.info.date}</div>}
            {(tk.info?.from || tk.info?.to) && (
              <div style={{ fontSize: '15px', fontWeight: 800, marginBottom: '2px' }}>{tk.info.from || '?'} → {tk.info.to || '?'}</div>
            )}
            {tk.info?.time && (
              <div style={{ fontSize: '12px', color: '#5A5570', marginBottom: '6px' }}>
                🕐 {tk.info.time}
                {tk.info.ref && ` · ${tk.info.ref}`}
                {tk.info.seat && ` · 💺 ${tk.info.seat}`}
              </div>
            )}
            {!tk.info?.from && !tk.info?.to && !tk.info?.time && (
              <div style={{ fontSize: '12px', color: '#5A5570', marginBottom: '6px' }}>{tk.name}</div>
            )}
            <button
              onClick={() => setViewing(tk)}
              style={{ background: color, border: 'none', color: '#0A0A0F', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 800, width: '100%' }}
            >
              📱 Show ticket to scan
            </button>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ padding: '0 0 100px' }}>
      <Toolbar title="Travel" actions={<Button size="sm" onClick={() => { setEditing(null); setShowModal(true) }}>+ Trip</Button>} />
      <div style={{ padding: '0 16px' }}>
        {trips.length === 0 ? (
          <EmptyState icon="✈" title="No trips yet" sub="Select an event, upload your tickets. Claude reads departure, arrival, time automatically." />
        ) : (
          <>
            {upcoming.length > 0 && (
              <>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '8px' }}>Upcoming</div>
                {upcoming.map((t: any) => (
                  <Card key={t.id} style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div style={{ flex: 1 }}>
                        {t.linkedTour && <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '2px' }}>{t.linkedTour.title}</div>}
                        {t.artist && <div style={{ fontSize: '11px', color: t.artist.color, fontWeight: 700 }}>🎤 {t.artist.name}</div>}
                        {t.linkedTour && <div style={{ fontSize: '11px', color: '#5A5570' }}>📅 {t.linkedTour.start}{t.linkedTour.end && t.linkedTour.end !== t.linkedTour.start ? ` → ${t.linkedTour.end}` : ''}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <Button variant="secondary" size="sm" onClick={() => { setEditing(t); setShowModal(true) }}>✏</Button>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(t)}>✕</Button>
                      </div>
                    </div>
                    <TicketBlock tickets={t.outTickets || []} color="#C9A84C" label="Outbound" />
                    <TicketBlock tickets={t.retTickets || []} color="#5DC9A0" label="Return" />
                    {t.notes && <div style={{ fontSize: '12px', color: '#5A5570', marginTop: '8px', fontStyle: 'italic' }}>{t.notes}</div>}
                  </Card>
                ))}
              </>
            )}
            {past.length > 0 && (
              <>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '8px', marginTop: '16px', opacity: 0.5 }}>Past</div>
                {past.map((t: any) => (
                  <Card key={t.id} style={{ marginBottom: '10px', opacity: 0.7 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        {t.linkedTour && <div style={{ fontWeight: 800, fontSize: '13px' }}>{t.linkedTour.title}</div>}
                        {t.artist && <div style={{ fontSize: '11px', color: t.artist.color }}>{t.artist.name}</div>}
                        {t.linkedTour && <div style={{ fontSize: '11px', color: '#5A5570' }}>📅 {t.linkedTour.start}</div>}
                      </div>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(t)}>✕</Button>
                    </div>
                    <TicketBlock tickets={t.outTickets || []} color="#C9A84C" label="Outbound" />
                    <TicketBlock tickets={t.retTickets || []} color="#5DC9A0" label="Return" />
                  </Card>
                ))}
              </>
            )}
          </>
        )}
      </div>

      <TripModal key={editing?.id || 'new'} open={showModal} onClose={() => { setShowModal(false); setEditing(null) }} editing={editing} />

      {viewing && (
        <div onClick={() => setViewing(null)} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.97)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '600px', marginBottom: '12px' }}>
            <div style={{ fontWeight: 700, color: 'white' }}>{viewing.name}</div>
            <button onClick={() => setViewing(null)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '28px', cursor: 'pointer' }}>✕</button>
          </div>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '600px' }}>
            {viewing.data.startsWith('data:image') && <img src={viewing.data} alt={viewing.name} style={{ width: '100%', borderRadius: '12px', maxHeight: '80vh', objectFit: 'contain' }} />}
            {viewing.data.startsWith('data:application/pdf') && <iframe src={viewing.data} style={{ width: '100%', height: '80vh', border: 'none', borderRadius: '12px' }} />}
          </div>
        </div>
      )}
    </div>
  )
}
