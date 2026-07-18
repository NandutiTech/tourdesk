'use client'
import { useState, useRef } from 'react'
import { useStore, newId } from '@/lib/store'
import { syncToCloud, deleteFromCloud } from '@/lib/sync'
import { Button, Card, Select, Textarea, Modal, EmptyState, Toolbar, showToast, SectionLabel } from '@/components/ui'
import { Trip } from '@/lib/types'

// Extract ticket info using Claude
async function extractTicketInfo(base64: string, mimeType: string): Promise<any> {
  try {
    const isImage = mimeType.startsWith('image/')
    const content = isImage
      ? [
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64.split(',')[1] } },
          { type: 'text', text: 'Extract travel information from this ticket. Return ONLY a JSON object with these fields (null if not found): { "from": "departure station/airport/city", "to": "arrival station/airport/city", "date": "YYYY-MM-DD", "time": "HH:MM", "ref": "train/flight number or reference", "seat": "seat number if visible", "type": "train|plane|bus|other" }' }
        ]
      : [{ type: 'text', text: 'This is a PDF ticket. Return a JSON with: { "from": null, "to": null, "date": null, "time": null, "ref": null, "seat": null, "type": null }' }]

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        messages: [{ role: 'user', content }]
      })
    })
    const data = await res.json()
    const text = data.content?.[0]?.text || '{}'
    const clean = text.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return {}
  }
}

function TicketCard({ label, ticket, ticketName, info, onUpload, onRemove, loading }: {
  label: string
  ticket?: string
  ticketName?: string
  info?: any
  onUpload: (data: string, name: string, mime: string) => void
  onRemove: () => void
  loading?: boolean
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [viewing, setViewing] = useState(false)

  const handleFile = async (file: File) => {
    const b64 = await new Promise<string>((res) => {
      const reader = new FileReader()
      reader.onload = () => res(reader.result as string)
      reader.readAsDataURL(file)
    })
    onUpload(b64, file.name, file.type)
  }

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ fontSize: '11px', fontWeight: 800, color: label.includes('Outbound') ? '#C9A84C' : '#5DC9A0', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '8px' }}>
        {label.includes('Outbound') ? '✈ ' : '🔄 '}{label}
      </div>
      {!ticket ? (
        <>
          <input ref={ref} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <button onClick={() => ref.current?.click()} style={{ width: '100%', background: '#12121A', border: `1px dashed ${label.includes('Outbound') ? 'rgba(201,168,76,.3)' : 'rgba(93,201,160,.3)'}`, color: '#5A5570', borderRadius: '10px', padding: '14px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}>
            📎 Upload ticket (photo or PDF)
          </button>
        </>
      ) : (
        <div>
          {/* Auto-extracted info */}
          {loading && (
            <div style={{ background: '#12121A', border: '1px solid #1F1F2E', borderRadius: '10px', padding: '12px', marginBottom: '8px', fontSize: '13px', color: '#5A5570' }}>
              🤖 Reading ticket...
            </div>
          )}
          {info && !loading && (info.from || info.to || info.time) && (
            <div style={{ background: '#12121A', border: `1px solid ${label.includes('Outbound') ? 'rgba(201,168,76,.2)' : 'rgba(93,201,160,.2)'}`, borderRadius: '10px', padding: '12px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.08em' }}>🤖 Auto-detected</span>
              </div>
              {(info.from || info.to) && (
                <div style={{ fontSize: '15px', fontWeight: 800, marginBottom: '4px' }}>
                  {info.from || '?'} → {info.to || '?'}
                </div>
              )}
              <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#5A5570' }}>
                {info.date && <span>📅 {info.date}</span>}
                {info.time && <span>🕐 {info.time}</span>}
                {info.ref && <span>🎫 {info.ref}</span>}
                {info.seat && <span>💺 {info.seat}</span>}
              </div>
            </div>
          )}
          {/* Ticket file */}
          <div style={{ background: '#12121A', border: '1px solid #1F1F2E', borderRadius: '10px', padding: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontSize: '20px' }}>{ticket.startsWith('data:image') ? '🖼' : '📄'}</div>
            <div style={{ flex: 1, fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ticketName}</div>
            <button onClick={() => setViewing(true)} style={{ background: label.includes('Outbound') ? '#C9A84C' : '#5DC9A0', border: 'none', color: '#0A0A0F', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', fontWeight: 800, flexShrink: 0 }}>
              📱 Scan
            </button>
            <button onClick={onRemove} style={{ background: 'none', border: 'none', color: '#E8453C', cursor: 'pointer', fontSize: '16px', padding: '0 2px', flexShrink: 0 }}>✕</button>
          </div>
        </div>
      )}

      {/* Viewer */}
      {viewing && ticket && (
        <div onClick={() => setViewing(false)} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '600px', marginBottom: '12px' }}>
            <div style={{ fontWeight: 700, color: 'white', fontSize: '14px' }}>{ticketName}</div>
            <button onClick={() => setViewing(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '28px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
          </div>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '600px' }}>
            {ticket.startsWith('data:image') && (
              <img src={ticket} alt={ticketName} style={{ width: '100%', borderRadius: '12px', objectFit: 'contain', maxHeight: '80vh' }} />
            )}
            {ticket.startsWith('data:application/pdf') && (
              <iframe src={ticket} style={{ width: '100%', height: '80vh', border: 'none', borderRadius: '12px' }} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function TripModal({ open, onClose, editing }: { open: boolean, onClose: () => void, editing?: Trip | null }) {
  const { artists, addTrip, updateTrip, tours } = useStore()
  const [tourId, setTourId] = useState(editing?.tourId || '')
  const [aId, setAId] = useState(editing?.aId || '')
  const [notes, setNotes] = useState(editing?.notes || '')
  const [saving, setSaving] = useState(false)

  // Outbound ticket
  const [outTicket, setOutTicket] = useState(editing?.outTicket || '')
  const [outTicketName, setOutTicketName] = useState(editing?.outTicketName || '')
  const [outInfo, setOutInfo] = useState<any>(editing?.outInfo || null)
  const [outLoading, setOutLoading] = useState(false)

  // Return ticket
  const [retTicket, setRetTicket] = useState(editing?.retTicket || '')
  const [retTicketName, setRetTicketName] = useState(editing?.retTicketName || '')
  const [retInfo, setRetInfo] = useState<any>(editing?.retInfo || null)
  const [retLoading, setRetLoading] = useState(false)

  const linkedTour = tours.find(t => t.id === tourId)
  const linkedArtist = artists.find(a => a.id === (aId || linkedTour?.aId))

  const handleOutUpload = async (data: string, name: string, mime: string) => {
    setOutTicket(data)
    setOutTicketName(name)
    setOutLoading(true)
    const info = await extractTicketInfo(data, mime)
    setOutInfo(info)
    setOutLoading(false)
  }

  const handleRetUpload = async (data: string, name: string, mime: string) => {
    setRetTicket(data)
    setRetTicketName(name)
    setRetLoading(true)
    const info = await extractTicketInfo(data, mime)
    setRetInfo(info)
    setRetLoading(false)
  }

  const save = async () => {
    if (!tourId && !outTicket && !retTicket) { showToast('Select an event or upload a ticket', false); return }
    if (saving) return
    setSaving(true)
    const effectiveAId = aId || linkedTour?.aId || null
    const trip: Trip = {
      id: editing?.id || newId(),
      aId: effectiveAId,
      tourId: tourId || null,
      outTicket, outTicketName, outInfo,
      retTicket, retTicketName, retInfo,
      notes
    }
    if (editing) updateTrip(trip)
    else addTrip(trip)
    await syncToCloud()
    showToast('Trip saved ✓')
    setSaving(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Trip' : 'New Trip'}>
      {/* Event selector */}
      <Select label="Event" value={tourId} onChange={e => {
        setTourId(e.target.value)
        const t = tours.find(t => t.id === e.target.value)
        if (t?.aId) setAId(t.aId)
      }}>
        <option value="">Select an event...</option>
        {[...tours].sort((a, b) => b.start.localeCompare(a.start)).map(t => {
          const artist = artists.find(a => a.id === t.aId)
          return <option key={t.id} value={t.id}>{t.start} — {t.title}{artist ? ` · ${artist.name}` : ''}</option>
        })}
      </Select>

      {/* Event summary */}
      {linkedTour && (
        <div style={{ background: 'rgba(93,201,160,.06)', border: '1px solid rgba(93,201,160,.15)', borderRadius: '10px', padding: '12px', marginBottom: '12px' }}>
          <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '4px' }}>{linkedTour.title}</div>
          <div style={{ fontSize: '12px', color: '#5A5570' }}>
            📅 {linkedTour.start}{linkedTour.end && linkedTour.end !== linkedTour.start ? ` → ${linkedTour.end}` : ''}
            {linkedArtist && <span style={{ color: linkedArtist.color }}> · {linkedArtist.name}</span>}
          </div>
        </div>
      )}

      <TicketCard
        label="Outbound ticket"
        ticket={outTicket}
        ticketName={outTicketName}
        info={outInfo}
        loading={outLoading}
        onUpload={handleOutUpload}
        onRemove={() => { setOutTicket(''); setOutTicketName(''); setOutInfo(null) }}
      />

      <TicketCard
        label="Return ticket"
        ticket={retTicket}
        ticketName={retTicketName}
        info={retInfo}
        loading={retLoading}
        onUpload={handleRetUpload}
        onRemove={() => { setRetTicket(''); setRetTicketName(''); setRetInfo(null) }}
      />

      <Textarea label="Notes" value={notes} onChange={e => setNotes(e.target.value)} style={{ minHeight: '60px' }} />

      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
        <Button onClick={save} disabled={saving} style={{ flex: 2 }}>{saving ? 'Saving...' : 'Save'}</Button>
      </div>
    </Modal>
  )
}

export default function TravelPage() {
  const { trips, artists, tours, deleteTrip } = useStore()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Trip | null>(null)
  const [viewingTicket, setViewingTicket] = useState<{ src: string, name: string } | null>(null)

  const today = new Date().toISOString().slice(0, 10)

  const enriched = trips.map(t => {
    const linkedTour = tours.find(tour => tour.id === t.tourId)
    const artist = artists.find(a => a.id === (t.aId || linkedTour?.aId))
    const date = linkedTour?.start || t.outInfo?.date || t.retInfo?.date || ''
    return { ...t, linkedTour, artist, date }
  }).sort((a, b) => a.date.localeCompare(b.date))

  const upcoming = enriched.filter(t => t.date >= today || !t.date)
  const past = enriched.filter(t => t.date && t.date < today).reverse()

  const handleDelete = async (t: Trip) => {
    if (!confirm('Delete this trip?')) return
    await deleteFromCloud('trips', t.id)
    deleteTrip(t.id)
    showToast('Trip deleted')
  }

  const TripCard = ({ t }: { t: any }) => (
    <Card style={{ marginBottom: '10px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div style={{ flex: 1 }}>
          {t.linkedTour && (
            <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '2px' }}>{t.linkedTour.title}</div>
          )}
          {t.artist && (
            <div style={{ fontSize: '11px', color: t.artist.color, fontWeight: 700 }}>🎤 {t.artist.name}</div>
          )}
          {t.linkedTour && (
            <div style={{ fontSize: '11px', color: '#5A5570' }}>📅 {t.linkedTour.start}{t.linkedTour.end && t.linkedTour.end !== t.linkedTour.start ? ` → ${t.linkedTour.end}` : ''}</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <Button variant="secondary" size="sm" onClick={() => { setEditing(t); setShowModal(true) }}>✏</Button>
          <Button variant="danger" size="sm" onClick={() => handleDelete(t)}>✕</Button>
        </div>
      </div>

      {/* Outbound */}
      {(t.outInfo || t.outTicket) && (
        <div style={{ background: '#12121A', borderRadius: '10px', padding: '12px', marginBottom: '8px' }}>
          <div style={{ fontSize: '10px', fontWeight: 800, color: '#C9A84C', letterSpacing: '.1em', marginBottom: '6px' }}>✈ OUTBOUND</div>
          {t.outInfo?.from && t.outInfo?.to && (
            <div style={{ fontSize: '15px', fontWeight: 800, marginBottom: '4px' }}>{t.outInfo.from} → {t.outInfo.to}</div>
          )}
          <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#5A5570', marginBottom: t.outTicket ? '8px' : 0 }}>
            {t.outInfo?.date && <span>📅 {t.outInfo.date}</span>}
            {t.outInfo?.time && <span>🕐 {t.outInfo.time}</span>}
            {t.outInfo?.ref && <span>🎫 {t.outInfo.ref}</span>}
            {t.outInfo?.seat && <span>💺 {t.outInfo.seat}</span>}
          </div>
          {t.outTicket && (
            <button onClick={() => setViewingTicket({ src: t.outTicket, name: t.outTicketName || 'Outbound ticket' })} style={{ background: '#C9A84C', border: 'none', color: '#0A0A0F', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: 800, width: '100%' }}>
              📱 Show ticket to scan
            </button>
          )}
        </div>
      )}

      {/* Return */}
      {(t.retInfo || t.retTicket) && (
        <div style={{ background: '#12121A', borderRadius: '10px', padding: '12px' }}>
          <div style={{ fontSize: '10px', fontWeight: 800, color: '#5DC9A0', letterSpacing: '.1em', marginBottom: '6px' }}>🔄 RETURN</div>
          {t.retInfo?.from && t.retInfo?.to && (
            <div style={{ fontSize: '15px', fontWeight: 800, marginBottom: '4px' }}>{t.retInfo.from} → {t.retInfo.to}</div>
          )}
          <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#5A5570', marginBottom: t.retTicket ? '8px' : 0 }}>
            {t.retInfo?.date && <span>📅 {t.retInfo.date}</span>}
            {t.retInfo?.time && <span>🕐 {t.retInfo.time}</span>}
            {t.retInfo?.ref && <span>🎫 {t.retInfo.ref}</span>}
            {t.retInfo?.seat && <span>💺 {t.retInfo.seat}</span>}
          </div>
          {t.retTicket && (
            <button onClick={() => setViewingTicket({ src: t.retTicket, name: t.retTicketName || 'Return ticket' })} style={{ background: '#5DC9A0', border: 'none', color: '#0A0A0F', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: 800, width: '100%' }}>
              📱 Show ticket to scan
            </button>
          )}
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
          <EmptyState icon="✈" title="No trips yet" sub="Link your events to tickets. Claude reads them automatically — no typing needed." />
        ) : (
          <>
            {upcoming.length > 0 && (
              <>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '8px' }}>Upcoming</div>
                {upcoming.map(t => <TripCard key={t.id} t={t} />)}
              </>
            )}
            {past.length > 0 && (
              <>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '8px', marginTop: '16px', opacity: 0.5 }}>Past</div>
                {past.map(t => <TripCard key={t.id} t={t} />)}
              </>
            )}
          </>
        )}
      </div>

      <TripModal open={showModal} onClose={() => { setShowModal(false); setEditing(null) }} editing={editing} />

      {/* Full screen ticket viewer */}
      {viewingTicket && (
        <div onClick={() => setViewingTicket(null)} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.97)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '600px', marginBottom: '12px' }}>
            <div style={{ fontWeight: 700, color: 'white' }}>{viewingTicket.name}</div>
            <button onClick={() => setViewingTicket(null)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '28px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
          </div>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '600px' }}>
            {viewingTicket.src.startsWith('data:image') && (
              <img src={viewingTicket.src} alt={viewingTicket.name} style={{ width: '100%', borderRadius: '12px', objectFit: 'contain', maxHeight: '80vh' }} />
            )}
            {viewingTicket.src.startsWith('data:application/pdf') && (
              <iframe src={viewingTicket.src} style={{ width: '100%', height: '80vh', border: 'none', borderRadius: '12px' }} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
