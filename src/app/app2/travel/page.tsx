'use client'
import { useState } from 'react'
import { useStore, newId } from '@/lib/store'
import { syncToCloud } from '@/lib/sync'
import { Button, Card, Input, Select, Textarea, Modal, EmptyState, Toolbar, showToast } from '@/components/ui'
import { Trip } from '@/lib/types'

function TripModal({ open, onClose, editing }: { open: boolean, onClose: () => void, editing?: Trip | null }) {
  const { artists, addTrip, updateTrip } = useStore()
  const [aId, setAId] = useState(editing?.aId || '')
  const [outFrom, setOutFrom] = useState(editing?.outFrom || '')
  const [outTo, setOutTo] = useState(editing?.outTo || '')
  const [outDate, setOutDate] = useState(editing?.outDate || '')
  const [outTime, setOutTime] = useState(editing?.outTime || '')
  const [outRef, setOutRef] = useState(editing?.outRef || '')
  const [retFrom, setRetFrom] = useState(editing?.retFrom || '')
  const [retTo, setRetTo] = useState(editing?.retTo || '')
  const [retDate, setRetDate] = useState(editing?.retDate || '')
  const [retTime, setRetTime] = useState(editing?.retTime || '')
  const [retRef, setRetRef] = useState(editing?.retRef || '')
  const [notes, setNotes] = useState(editing?.notes || '')

  const save = async () => {
    if (!outDate) { showToast('Departure date required', false); return }
    const trip: Trip = { id: editing?.id || newId(), aId: aId || null, outFrom, outTo, outDate, outTime, outRef, retFrom, retTo, retDate, retTime, retRef, notes }
    if (editing) updateTrip(trip)
    else addTrip(trip)
    await syncToCloud()
    showToast('Trip saved')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Trip' : 'New Trip'}>
      <Select label="Artist / Employer" value={aId} onChange={e => setAId(e.target.value)}>
        <option value="">No artist</option>
        {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
      </Select>
      <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: '8px' }}>✈ Outbound</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Input label="From" value={outFrom} onChange={e => setOutFrom(e.target.value)} placeholder="Paris CDG" />
        <Input label="To" value={outTo} onChange={e => setOutTo(e.target.value)} placeholder="Lyon" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Input label="Date *" type="date" value={outDate} onChange={e => setOutDate(e.target.value)} />
        <Input label="Time" type="time" value={outTime} onChange={e => setOutTime(e.target.value)} />
      </div>
      <Input label="Reference" value={outRef} onChange={e => setOutRef(e.target.value)} placeholder="TGV 6214 / AY123" />
      <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: '#5DC9A0', marginBottom: '8px', marginTop: '12px' }}>🔄 Return</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Input label="From" value={retFrom} onChange={e => setRetFrom(e.target.value)} placeholder="Lyon" />
        <Input label="To" value={retTo} onChange={e => setRetTo(e.target.value)} placeholder="Paris CDG" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Input label="Date" type="date" value={retDate} onChange={e => setRetDate(e.target.value)} />
        <Input label="Time" type="time" value={retTime} onChange={e => setRetTime(e.target.value)} />
      </div>
      <Input label="Reference" value={retRef} onChange={e => setRetRef(e.target.value)} placeholder="TGV 6215" />
      <Textarea label="Notes" value={notes} onChange={e => setNotes(e.target.value)} style={{ minHeight: '60px' }} />
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
        <Button onClick={save} style={{ flex: 2 }}>Save</Button>
      </div>
    </Modal>
  )
}

export default function TravelPage() {
  const { trips, artists, deleteTrip } = useStore()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Trip | null>(null)
  const sorted = [...trips].sort((a, b) => (a.outDate || '').localeCompare(b.outDate || ''))
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = sorted.filter(t => (t.outDate || '') >= today)
  const past = sorted.filter(t => (t.outDate || '') < today).reverse()
  const artistName = (id: string | null | undefined) => id ? artists.find(a => a.id === id)?.name : null
  const handleDelete = async (t: Trip) => {
    if (!confirm('Delete this trip?')) return
    deleteTrip(t.id); await syncToCloud(); showToast('Trip deleted')
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
      {(t.outFrom || t.outTo) && (
        <div style={{ background: '#12121A', borderRadius: '8px', padding: '10px', marginBottom: '8px' }}>
          <div style={{ fontSize: '10px', fontWeight: 800, color: '#C9A84C', letterSpacing: '.1em', marginBottom: '4px' }}>✈ OUTBOUND{t.outTime ? ` · ${t.outTime}` : ''}</div>
          <div style={{ fontSize: '13px', fontWeight: 700 }}>{t.outFrom} → {t.outTo}</div>
          {t.outRef && <div style={{ fontSize: '11px', color: '#5A5570', marginTop: '2px' }}>🎫 {t.outRef}</div>}
        </div>
      )}
      {(t.retFrom || t.retTo) && (
        <div style={{ background: '#12121A', borderRadius: '8px', padding: '10px' }}>
          <div style={{ fontSize: '10px', fontWeight: 800, color: '#5DC9A0', letterSpacing: '.1em', marginBottom: '4px' }}>🔄 RETURN{t.retDate ? ` · ${t.retDate}` : ''}{t.retTime ? ` ${t.retTime}` : ''}</div>
          <div style={{ fontSize: '13px', fontWeight: 700 }}>{t.retFrom} → {t.retTo}</div>
          {t.retRef && <div style={{ fontSize: '11px', color: '#5A5570', marginTop: '2px' }}>🎫 {t.retRef}</div>}
        </div>
      )}
      {t.notes && <div style={{ fontSize: '12px', color: '#5A5570', marginTop: '8px', fontStyle: 'italic' }}>{t.notes}</div>}
    </Card>
  )
  return (
    <div style={{ padding: '0 0 100px' }}>
      <Toolbar title="Travel" actions={<Button size="sm" onClick={() => { setEditing(null); setShowModal(true) }}>+ Trip</Button>} />
      <div style={{ padding: '0 16px' }}>
        {trips.length === 0 ? <EmptyState icon="✈" title="No trips yet" sub="Add your train tickets, flights and travel details." /> : (
          <>
            {upcoming.length > 0 && <><div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: '#5A5570', marginBottom: '10px' }}>Upcoming</div>{upcoming.map(t => <TripCard key={t.id} t={t} />)}</>}
            {past.length > 0 && <><div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: '#5A5570', margin: '16px 0 10px', opacity: 0.5 }}>Past</div>{past.map(t => <TripCard key={t.id} t={t} />)}</>}
          </>
        )}
      </div>
      <TripModal open={showModal} onClose={() => setShowModal(false)} editing={editing} />
    </div>
  )
}
