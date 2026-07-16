'use client'
import { useState } from 'react'
import { useStore, newId } from '@/lib/store'
import { syncToCloud } from '@/lib/sync'
import { Button, Card, Input, Select, Textarea, Modal, EmptyState, Toolbar, showToast } from '@/components/ui'
import { SendToContact } from '@/components/SendToContact'
import { Guest } from '@/lib/types'

const STATUS_COLORS = { confirmed: '#5DC9A0', pending: '#C9A84C', cancelled: '#E8453C' }
const STATUS_LABELS = { confirmed: '✓ Confirmed', pending: '⏳ Pending', cancelled: '✕ Cancelled' }

function GuestModal({ open, onClose, editing }: { open: boolean, onClose: () => void, editing?: Guest | null }) {
  const { tours, artists, addGuest, updateGuest } = useStore()
  const [tourId, setTourId] = useState(editing?.tourId || '')
  const [name, setName] = useState(editing?.name || '')
  const [contact, setContact] = useState(editing?.contact || '')
  const [count, setCount] = useState(editing?.count?.toString() || '1')
  const [notes, setNotes] = useState(editing?.notes || '')

  const save = async () => {
    if (!name.trim()) { showToast('Name required', false); return }
    const guest: Guest = { id: editing?.id || newId(), tourId: tourId || null, name: name.trim(), contact, count: parseInt(count) || 1, notes, status: editing?.status || 'confirmed' }
    if (editing) updateGuest(guest)
    else addGuest(guest)
    await syncToCloud()
    showToast(name + (editing ? ' updated' : ' added'))
    onClose()
  }

  const upcomingTours = tours.filter(t => t.start >= new Date().toISOString().slice(0, 10)).sort((a, b) => a.start.localeCompare(b.start))
  const artistName = (id: string | null) => id ? artists.find(a => a.id === id)?.name : null

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Guest' : 'Add Guest'}>
      <Select label="Show / Event" value={tourId} onChange={e => setTourId(e.target.value)}>
        <option value="">No specific show</option>
        {upcomingTours.map(t => <option key={t.id} value={t.id}>{t.start} — {t.title}{artistName(t.aId) ? ` (${artistName(t.aId)})` : ''}</option>)}
      </Select>
      <Input label="Name *" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Marie Dupont" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Input label="Contact (email/phone)" value={contact} onChange={e => setContact(e.target.value)} />
        <Input label="# of places" type="number" value={count} onChange={e => setCount(e.target.value)} min="1" />
      </div>
      <Textarea label="Notes" value={notes} onChange={e => setNotes(e.target.value)} style={{ minHeight: '60px' }} />
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
        <Button onClick={save} style={{ flex: 2 }}>Save</Button>
      </div>
    </Modal>
  )
}

export default function GuestsPage() {
  const { guests, tours, artists, deleteGuest, cycleGuestStatus } = useStore()
  const [showModal, setShowModal] = useState(false)
  const [showSend, setShowSend] = useState(false)
  const [editing, setEditing] = useState<Guest | null>(null)
  const [filterTourId, setFilterTourId] = useState('all')

  const upcomingTours = tours.filter(t => t.start >= new Date().toISOString().slice(0, 10)).sort((a, b) => a.start.localeCompare(b.start))
  const filteredGuests = filterTourId === 'all' ? guests : guests.filter(g => g.tourId === filterTourId)
  const sorted = [...filteredGuests].sort((a, b) => a.name.localeCompare(b.name))
  const totalPlaces = sorted.reduce((s, g) => s + (g.count || 1), 0)
  const artistName = (id: string | null) => id ? artists.find(a => a.id === id)?.name : null

  const handleDelete = async (g: Guest) => {
    if (!confirm(`Remove "${g.name}" from guest list?`)) return
    deleteGuest(g.id); await syncToCloud(); showToast('Guest removed')
  }

  const handleCycleStatus = async (g: Guest) => {
    cycleGuestStatus(g.id); await syncToCloud()
  }

  return (
    <div style={{ padding: '0 0 100px' }}>
      <Toolbar title="Guest List" actions={<><Button variant="secondary" size="sm" onClick={() => setShowSend(true)}>📤 Send</Button><Button size="sm" onClick={() => { setEditing(null); setShowModal(true) }}>+ Guest</Button></>} />
      <div style={{ padding: '0 16px' }}>
        {upcomingTours.length > 0 && (
          <select value={filterTourId} onChange={e => setFilterTourId(e.target.value)} style={{ width: '100%', background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '8px', padding: '10px', fontFamily: 'inherit', fontSize: '13px', marginBottom: '16px' }}>
            <option value="all">All shows ({guests.length} guests)</option>
            {upcomingTours.map(t => {
              const count = guests.filter(g => g.tourId === t.id).length
              return <option key={t.id} value={t.id}>{t.start} — {t.title}{artistName(t.aId) ? ` (${artistName(t.aId)})` : ''} · {count}</option>
            })}
          </select>
        )}

        {guests.length === 0 ? <EmptyState icon="🎫" title="No guests yet" sub="Manage your guest list and invitations per show." /> : (
          <>
            {sorted.length > 0 && (
              <div style={{ fontSize: '12px', color: '#5A5570', marginBottom: '12px' }}>
                {sorted.length} guest{sorted.length !== 1 ? 's' : ''} · {totalPlaces} place{totalPlaces !== 1 ? 's' : ''}
              </div>
            )}
            {sorted.map(g => (
              <Card key={g.id} style={{ marginBottom: '8px', padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '13px' }}>{g.name}{g.count > 1 ? ` ×${g.count}` : ''}</div>
                    {g.contact && <div style={{ fontSize: '11px', color: '#5A5570' }}>{g.contact}</div>}
                    {g.notes && <div style={{ fontSize: '11px', color: '#5A5570', fontStyle: 'italic' }}>{g.notes}</div>}
                  </div>
                  <button onClick={() => handleCycleStatus(g)} style={{ background: 'none', border: `1px solid ${STATUS_COLORS[g.status]}`, color: STATUS_COLORS[g.status], borderRadius: '6px', padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
                    {STATUS_LABELS[g.status]}
                  </button>
                  <Button variant="secondary" size="sm" onClick={() => { setEditing(g); setShowModal(true) }}>✏</Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(g)}>✕</Button>
                </div>
              </Card>
            ))}
          </>
        )}
      </div>
      <GuestModal open={showModal} onClose={() => setShowModal(false)} editing={editing} />
      <SendToContact
        open={showSend}
        onClose={() => setShowSend(false)}
        subject="Guest list"
        body={guests.map(g => `• ${g.name}${g.count > 1 ? ` ×${g.count}` : ''} — ${g.status}`).join('\n')}
      />
    </div>
  )
}
