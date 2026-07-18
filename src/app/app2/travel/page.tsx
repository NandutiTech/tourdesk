'use client'
import { useState, useRef } from 'react'
import { useStore, newId } from '@/lib/store'
import { syncToCloud, deleteFromCloud } from '@/lib/sync'
import { Button, Card, Select, Textarea, Modal, EmptyState, Toolbar, showToast } from '@/components/ui'
import { Trip, TripTicket } from '@/lib/types'

async function extractTicketInfo(base64: string, mimeType: string): Promise<any> {
  try {
    if (!mimeType.startsWith('image/')) return {}
    const res = await fetch('/api/extract-ticket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64, mimeType })
    })
    if (!res.ok) return {}
    return await res.json()
  } catch { return {} }
}

function TicketSection({ label, color, tickets, onAdd, onRemove, viewing, setViewing }: {
  label: string
  color: string
  tickets: TripTicket[]
  onAdd: (t: TripTicket) => void
  onRemove: (id: string) => void
  viewing: TripTicket | null
  setViewing: (t: TripTicket | null) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)

  const handleFile = async (file: File) => {
    const b64 = await new Promise<string>((res) => {
      const r = new FileReader()
      r.onload = () => res(r.result as string)
      r.readAsDataURL(file)
    })
    const ticket: TripTicket = { id: newId(), data: b64, name: file.name, mime: file.type }
    onAdd(ticket)
    if (file.type.startsWith('image/')) {
      setLoading(true)
      try {
        const info = await extractTicketInfo(b64, file.type)
        console.log('Extracted info:', info)
        onAdd({ ...ticket, info: Object.keys(info).length > 0 ? info : { _error: 'No data extracted' } })
      } catch (e) {
        console.error('Extraction failed:', e)
        onAdd({ ...ticket, info: { _error: String(e) } })
      }
      setLoading(false)
    }
  }

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '11px', fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '8px' }}>
        {label === 'Outbound' ? '✈' : '🔄'} {label} tickets
      </div>

      {tickets.map((t, i) => (
        <div key={t.id} style={{ background: '#12121A', border: `1px solid ${color}30`, borderRadius: '10px', padding: '12px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color }}>
              Ticket {i + 1} {t.info?.ref ? `· ${t.info.ref}` : ''}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => setViewing(t)} style={{ background: color, border: 'none', color: '#0A0A0F', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', fontWeight: 800 }}>📱 Scan</button>
              <button onClick={() => onRemove(t.id)} style={{ background: 'none', border: 'none', color: '#E8453C', cursor: 'pointer', fontSize: '16px', padding: '0 2px' }}>✕</button>
            </div>
          </div>
          {t.info?.date && (
            <div style={{ fontSize: '12px', color: '#5A5570', marginBottom: '3px' }}>
              📅 {t.info.date}
            </div>
          )}
          {(t.info?.from || t.info?.to) && (
            <div style={{ fontSize: '14px', fontWeight: 800, marginBottom: '3px' }}>
              {t.info.from || '?'} → {t.info.to || '?'}
            </div>
          )}
          {t.info?.time && (
            <div style={{ fontSize: '12px', color: '#5A5570' }}>
              🕐 {t.info.time}{t.info.seat ? ` · 💺 ${t.info.seat}` : ''}
            </div>
          )}
          {!t.info && !loading && (
            <div style={{ fontSize: '12px', color: '#5A5570' }}>{t.name}</div>
          )}
        </div>
      ))}

      {loading && (
        <div style={{ background: '#12121A', border: '1px solid #1F1F2E', borderRadius: '10px', padding: '12px', marginBottom: '8px', fontSize: '13px', color: '#5A5570' }}>
          🤖 Reading ticket with AI...
        </div>
      )}

      <input ref={ref} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <button onClick={() => ref.current?.click()} style={{ width: '100%', background: '#12121A', border: `1px dashed ${color}50`, color: '#5A5570', borderRadius: '10px', padding: '12px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}>
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
  const [viewing, setViewing] = useState<TripTicket | null>(null)

  const linkedTour = tours.find(t => t.id === tourId)
  const linkedArtist = artists.find(a => a.id === linkedTour?.aId)

  const addOut = (t: TripTicket) => setOutTickets(prev => {
    const idx = prev.findIndex(x => x.id === t.id)
    return idx >= 0 ? prev.map(x => x.id === t.id ? t : x) : [...prev, t]
  })
  const addRet = (t: TripTicket) => setRetTickets(prev => {
    const idx = prev.findIndex(x => x.id === t.id)
    return idx >= 0 ? prev.map(x => x.id === t.id ? t : x) : [...prev, t]
  })

  const save = async () => {
    if (!tourId && outTickets.length === 0 && retTickets.length === 0) {
      showToast('Select an event or upload a ticket', false); return
    }
    if (saving) return
    setSaving(true)
    const trip: Trip = {
      id: editing?.id || newId(),
      aId: linkedTour?.aId || null,
      tourId: tourId || null,
      outTickets, retTickets, notes
    }
    if (editing) updateTrip(trip)
    else addTrip(trip)
    await syncToCloud()
    showToast('Trip saved ✓')
    setSaving(false)
    onClose()
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title={editing ? 'Edit Trip' : 'New Trip'}>
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

        <TicketSection
          label="Outbound" color="#C9A84C"
          tickets={outTickets}
          onAdd={addOut}
          onRemove={id => setOutTickets(p => p.filter(t => t.id !== id))}
          viewing={viewing} setViewing={setViewing}
        />
        <TicketSection
          label="Return" color="#5DC9A0"
          tickets={retTickets}
          onAdd={addRet}
          onRemove={id => setRetTickets(p => p.filter(t => t.id !== id))}
          viewing={viewing} setViewing={setViewing}
        />

        <Textarea label="Notes" value={notes} onChange={e => setNotes(e.target.value)} style={{ minHeight: '60px' }} />
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
          <Button onClick={save} disabled={saving} style={{ flex: 2 }}>{saving ? 'Saving...' : 'Save'}</Button>
        </div>
      </Modal>

      {/* Ticket viewer */}
      {viewing && (
        <div onClick={() => setViewing(null)} style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,.97)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
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
    </>
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
  }).sort((a, b) => a.date.localeCompare(b.date))

  const upcoming = enriched.filter(t => !t.date || t.date >= today)
  const past = enriched.filter(t => t.date && t.date < today).reverse()

  const handleDelete = async (t: Trip) => {
    if (!confirm('Delete this trip?')) return
    await deleteFromCloud('trips', t.id)
    deleteTrip(t.id)
    showToast('Trip deleted')
  }

  const TripCard = ({ t }: { t: any }) => (
    <Card style={{ marginBottom: '10px' }}>
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

      {/* Outbound tickets */}
      {t.outTickets?.length > 0 && (
        <div style={{ background: '#12121A', borderRadius: '10px', padding: '12px', marginBottom: '8px' }}>
          <div style={{ fontSize: '10px', fontWeight: 800, color: '#C9A84C', letterSpacing: '.1em', marginBottom: '8px' }}>✈ OUTBOUND</div>
          {t.outTickets.map((tk: TripTicket, i: number) => (
            <div key={tk.id} style={{ marginBottom: i < t.outTickets.length - 1 ? '10px' : 0 }}>
              {t.outTickets.length > 1 && <div style={{ fontSize: '10px', fontWeight: 700, color: '#C9A84C', marginBottom: '3px' }}>Ticket {i + 1}</div>}
              {tk.info?.date && <div style={{ fontSize: '12px', color: '#5A5570', marginBottom: '2px' }}>📅 {tk.info.date}</div>}
              {(tk.info?.from || tk.info?.to) && <div style={{ fontSize: '14px', fontWeight: 800, marginBottom: '2px' }}>{tk.info.from || '?'} → {tk.info.to || '?'}</div>}
              {tk.info?.time && <div style={{ fontSize: '12px', color: '#5A5570', marginBottom: '6px' }}>🕐 {tk.info.time}{tk.info.ref ? ` · ${tk.info.ref}` : ''}{tk.info.seat ? ` · 💺 ${tk.info.seat}` : ''}</div>}
              <button onClick={() => setViewing(tk)} style={{ background: '#C9A84C', border: 'none', color: '#0A0A0F', borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 800, width: '100%' }}>
                📱 Show ticket to scan
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Return tickets */}
      {t.retTickets?.length > 0 && (
        <div style={{ background: '#12121A', borderRadius: '10px', padding: '12px' }}>
          <div style={{ fontSize: '10px', fontWeight: 800, color: '#5DC9A0', letterSpacing: '.1em', marginBottom: '8px' }}>🔄 RETURN</div>
          {t.retTickets.map((tk: TripTicket, i: number) => (
            <div key={tk.id} style={{ marginBottom: i < t.retTickets.length - 1 ? '10px' : 0 }}>
              {t.retTickets.length > 1 && <div style={{ fontSize: '10px', fontWeight: 700, color: '#5DC9A0', marginBottom: '3px' }}>Ticket {i + 1}</div>}
              {tk.info?.date && <div style={{ fontSize: '12px', color: '#5A5570', marginBottom: '2px' }}>📅 {tk.info.date}</div>}
              {(tk.info?.from || tk.info?.to) && <div style={{ fontSize: '14px', fontWeight: 800, marginBottom: '2px' }}>{tk.info.from || '?'} → {tk.info.to || '?'}</div>}
              {tk.info?.time && <div style={{ fontSize: '12px', color: '#5A5570', marginBottom: '6px' }}>🕐 {tk.info.time}{tk.info.ref ? ` · ${tk.info.ref}` : ''}{tk.info.seat ? ` · 💺 ${tk.info.seat}` : ''}</div>}
              <button onClick={() => setViewing(tk)} style={{ background: '#5DC9A0', border: 'none', color: '#0A0A0F', borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 800, width: '100%' }}>
                📱 Show ticket to scan
              </button>
            </div>
          ))}
        </div>
      )}

      {t.notes && <div style={{ fontSize: '12px', color: '#5A5570', marginTop: '8px', fontStyle: 'italic' }}>{t.notes}</div>}
    </Card>
  )

  return (
    <div style={{ padding: '0 0 100px' }}>
      <Toolbar title="Travel" actions={<Button size="sm" onClick={() => { setEditing(null); setShowModal(true) }}>+ Trip</Button>} />
      <div style={{ padding: '0 16px' }}>
        {trips.length === 0 ? (
          <EmptyState icon="✈" title="No trips yet" sub="Link events to tickets. Claude reads them automatically — departure, arrival, time, seat." />
        ) : (
          <>
            {upcoming.length > 0 && <>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '8px' }}>Upcoming</div>
              {upcoming.map(t => <TripCard key={t.id} t={t} />)}
            </>}
            {past.length > 0 && <>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '8px', marginTop: '16px', opacity: 0.5 }}>Past</div>
              {past.map(t => <TripCard key={t.id} t={t} />)}
            </>}
          </>
        )}
      </div>

      <TripModal open={showModal} onClose={() => { setShowModal(false); setEditing(null) }} editing={editing} />

      {/* Full screen viewer */}
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
