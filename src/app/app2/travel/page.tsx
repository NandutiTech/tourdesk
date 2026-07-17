'use client'
import { useState, useRef } from 'react'
import { useStore, newId } from '@/lib/store'
import { syncToCloud, deleteFromCloud } from '@/lib/sync'
import { Button, Card, Input, Select, Textarea, Modal, EmptyState, Toolbar, showToast } from '@/components/ui'
import { Trip } from '@/lib/types'

function TicketUploader({ label, ticket, ticketName, onUpload, onRemove }: {
  label: string
  ticket?: string
  ticketName?: string
  onUpload: (data: string, name: string) => void
  onRemove: () => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [viewing, setViewing] = useState(false)

  const handleFile = async (file: File) => {
    const b64 = await new Promise<string>((res) => {
      const reader = new FileReader()
      reader.onload = () => res(reader.result as string)
      reader.readAsDataURL(file)
    })
    onUpload(b64, file.name)
  }

  const isImage = ticket?.startsWith('data:image')
  const isPDF = ticket?.startsWith('data:application/pdf')

  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '6px' }}>{label}</div>
      {!ticket ? (
        <>
          <input ref={ref} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <button onClick={() => ref.current?.click()} style={{ width: '100%', background: '#12121A', border: '1px dashed #1F1F2E', color: '#5A5570', borderRadius: '8px', padding: '10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}>
            📎 Upload ticket (photo or PDF)
          </button>
        </>
      ) : (
        <div style={{ background: '#12121A', border: '1px solid #1F1F2E', borderRadius: '8px', padding: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '20px' }}>{isImage ? '🖼' : '📄'}</div>
          <div style={{ flex: 1, fontSize: '12px', color: '#E8E0F0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ticketName}</div>
          <button onClick={() => setViewing(true)} style={{ background: '#C9A84C', border: 'none', color: '#0A0A0F', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', fontWeight: 700 }}>View</button>
          <button onClick={onRemove} style={{ background: 'none', border: 'none', color: '#E8453C', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }}>✕</button>
        </div>
      )}

      {/* Viewer modal */}
      {viewing && ticket && (
        <div onClick={() => setViewing(false)} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: '100%', maxHeight: '90vh', position: 'relative' }}>
            <button onClick={() => setViewing(false)} style={{ position: 'absolute', top: '-40px', right: 0, background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>✕</button>
            {isImage && <img src={ticket} alt={ticketName} style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '12px' }} />}
            {isPDF && <iframe src={ticket} style={{ width: '90vw', height: '85vh', border: 'none', borderRadius: '12px' }} />}
          </div>
        </div>
      )}
    </div>
  )
}

function TripModal({ open, onClose, editing }: { open: boolean, onClose: () => void, editing?: Trip | null }) {
  const { artists, addTrip, updateTrip } = useStore()
  const [aId, setAId] = useState(editing?.aId || '')
  const [outFrom, setOutFrom] = useState(editing?.outFrom || '')
  const [outTo, setOutTo] = useState(editing?.outTo || '')
  const [outDate, setOutDate] = useState(editing?.outDate || '')
  const [outTime, setOutTime] = useState(editing?.outTime || '')
  const [outRef, setOutRef] = useState(editing?.outRef || '')
  const [outTicket, setOutTicket] = useState(editing?.outTicket || '')
  const [outTicketName, setOutTicketName] = useState(editing?.outTicketName || '')
  const [retFrom, setRetFrom] = useState(editing?.retFrom || '')
  const [retTo, setRetTo] = useState(editing?.retTo || '')
  const [retDate, setRetDate] = useState(editing?.retDate || '')
  const [retTime, setRetTime] = useState(editing?.retTime || '')
  const [retRef, setRetRef] = useState(editing?.retRef || '')
  const [retTicket, setRetTicket] = useState(editing?.retTicket || '')
  const [retTicketName, setRetTicketName] = useState(editing?.retTicketName || '')
  const [notes, setNotes] = useState(editing?.notes || '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!outDate) { showToast('Departure date required', false); return }
    if (saving) return
    setSaving(true)
    const trip: Trip = {
      id: editing?.id || newId(),
      aId: aId || null,
      outFrom, outTo, outDate, outTime, outRef, outTicket, outTicketName,
      retFrom, retTo, retDate, retTime, retRef, retTicket, retTicketName,
      notes
    }
    if (editing) updateTrip(trip)
    else addTrip(trip)
    await syncToCloud()
    showToast('Trip saved')
    setSaving(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Trip' : 'New Trip'}>
      <Select label="Artist / Employer" value={aId} onChange={e => setAId(e.target.value)}>
        <option value="">No artist</option>
        {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
      </Select>

      <div style={{ fontSize: '11px', fontWeight: 800, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '8px', marginTop: '4px' }}>✈ Outbound</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Input label="From" value={outFrom} onChange={e => setOutFrom(e.target.value)} placeholder="Paris CDG" />
        <Input label="To" value={outTo} onChange={e => setOutTo(e.target.value)} placeholder="Lyon" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Input label="Date *" type="date" value={outDate} onChange={e => setOutDate(e.target.value)} />
        <Input label="Time" type="time" value={outTime} onChange={e => setOutTime(e.target.value)} />
      </div>
      <Input label="Reference" value={outRef} onChange={e => setOutRef(e.target.value)} placeholder="TGV 6214 / AY123" />
      <TicketUploader
        label="🎫 Outbound ticket"
        ticket={outTicket}
        ticketName={outTicketName}
        onUpload={(data, name) => { setOutTicket(data); setOutTicketName(name) }}
        onRemove={() => { setOutTicket(''); setOutTicketName('') }}
      />

      <div style={{ fontSize: '11px', fontWeight: 800, color: '#5DC9A0', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '8px', marginTop: '12px' }}>🔄 Return</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Input label="From" value={retFrom} onChange={e => setRetFrom(e.target.value)} placeholder="Lyon" />
        <Input label="To" value={retTo} onChange={e => setRetTo(e.target.value)} placeholder="Paris CDG" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Input label="Date" type="date" value={retDate} onChange={e => setRetDate(e.target.value)} />
        <Input label="Time" type="time" value={retTime} onChange={e => setRetTime(e.target.value)} />
      </div>
      <Input label="Reference" value={retRef} onChange={e => setRetRef(e.target.value)} placeholder="TGV 6215" />
      <TicketUploader
        label="🎫 Return ticket"
        ticket={retTicket}
        ticketName={retTicketName}
        onUpload={(data, name) => { setRetTicket(data); setRetTicketName(name) }}
        onRemove={() => { setRetTicket(''); setRetTicketName('') }}
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
  const { trips, artists, deleteTrip } = useStore()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Trip | null>(null)
  const [viewingTicket, setViewingTicket] = useState<{ src: string, name: string } | null>(null)

  const sorted = [...trips].sort((a, b) => (a.outDate || '').localeCompare(b.outDate || ''))
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = sorted.filter(t => (t.outDate || '') >= today)
  const past = sorted.filter(t => (t.outDate || '') < today).reverse()
  const artistName = (id: string | null | undefined) => id ? artists.find(a => a.id === id)?.name : null

  const handleDelete = async (t: Trip) => {
    if (!confirm('Delete this trip?')) return
    await deleteFromCloud('trips', t.id)
    deleteTrip(t.id)
    showToast('Trip deleted')
  }

  const TripCard = ({ t }: { t: Trip }) => (
    <Card style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div>
          {artistName(t.aId) && <div style={{ fontSize: '11px', color: '#C9A84C', fontWeight: 700, marginBottom: '4px' }}>🎤 {artistName(t.aId)}</div>}
          <div style={{ fontSize: '13px', fontWeight: 700 }}>{t.outDate}{t.retDate ? ` → ${t.retDate}` : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <Button variant="secondary" size="sm" onClick={() => { setEditing(t); setShowModal(true) }}>✏</Button>
          <Button variant="danger" size="sm" onClick={() => handleDelete(t)}>✕</Button>
        </div>
      </div>

      {/* Outbound */}
      {(t.outFrom || t.outTo || t.outTicket) && (
        <div style={{ background: '#12121A', borderRadius: '8px', padding: '10px', marginBottom: '8px' }}>
          <div style={{ fontSize: '10px', fontWeight: 800, color: '#C9A84C', letterSpacing: '.1em', marginBottom: '6px' }}>✈ OUTBOUND{t.outTime ? ` · ${t.outTime}` : ''}</div>
          {(t.outFrom || t.outTo) && <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>{t.outFrom} → {t.outTo}</div>}
          {t.outRef && <div style={{ fontSize: '11px', color: '#5A5570', marginBottom: '6px' }}>🎫 {t.outRef}</div>}
          {t.outTicket && (
            <button onClick={() => setViewingTicket({ src: t.outTicket!, name: t.outTicketName || 'Ticket' })} style={{ background: '#C9A84C', border: 'none', color: '#0A0A0F', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 800 }}>
              📱 View ticket
            </button>
          )}
        </div>
      )}

      {/* Return */}
      {(t.retFrom || t.retTo || t.retTicket) && (
        <div style={{ background: '#12121A', borderRadius: '8px', padding: '10px' }}>
          <div style={{ fontSize: '10px', fontWeight: 800, color: '#5DC9A0', letterSpacing: '.1em', marginBottom: '6px' }}>🔄 RETURN{t.retDate ? ` · ${t.retDate}` : ''}{t.retTime ? ` ${t.retTime}` : ''}</div>
          {(t.retFrom || t.retTo) && <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>{t.retFrom} → {t.retTo}</div>}
          {t.retRef && <div style={{ fontSize: '11px', color: '#5A5570', marginBottom: '6px' }}>🎫 {t.retRef}</div>}
          {t.retTicket && (
            <button onClick={() => setViewingTicket({ src: t.retTicket!, name: t.retTicketName || 'Return ticket' })} style={{ background: '#5DC9A0', border: 'none', color: '#0A0A0F', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 800 }}>
              📱 View ticket
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
          <EmptyState icon="✈" title="No trips yet" sub="Add your tickets and travel details. Upload your tickets to view them on the go." />
        ) : (
          <>
            {upcoming.length > 0 && <>
              <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: '#5A5570', marginBottom: '10px' }}>Upcoming</div>
              {upcoming.map(t => <TripCard key={t.id} t={t} />)}
            </>}
            {past.length > 0 && <>
              <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: '#5A5570', margin: '16px 0 10px', opacity: 0.5 }}>Past</div>
              {past.map(t => <TripCard key={t.id} t={t} />)}
            </>}
          </>
        )}
      </div>

      <TripModal open={showModal} onClose={() => { setShowModal(false); setEditing(null) }} editing={editing} />

      {/* Ticket viewer */}
      {viewingTicket && (
        <div onClick={() => setViewingTicket(null)} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '600px', marginBottom: '12px' }}>
            <div style={{ fontWeight: 700, color: 'white' }}>{viewingTicket.name}</div>
            <button onClick={() => setViewingTicket(null)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>✕</button>
          </div>
          {viewingTicket.src.startsWith('data:image') && (
            <img src={viewingTicket.src} alt={viewingTicket.name} style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '12px', objectFit: 'contain' }} onClick={e => e.stopPropagation()} />
          )}
          {viewingTicket.src.startsWith('data:application/pdf') && (
            <iframe src={viewingTicket.src} style={{ width: '100%', maxWidth: '600px', height: '80vh', border: 'none', borderRadius: '12px' }} onClick={(e: any) => e.stopPropagation()} />
          )}
        </div>
      )}
    </div>
  )
}
