'use client'
import { useState } from 'react'
import { useStore, newId } from '@/lib/store'
import { syncToCloud, deleteFromCloud } from '@/lib/sync'
import { Button, Card, Input, Select, Textarea, Modal, EmptyState, Toolbar, showToast } from '@/components/ui'
import { SendToContact } from '@/components/SendToContact'
import { Guest } from '@/lib/types'

const STATUS_COLORS = { confirmed: '#5DC9A0', pending: '#C9A84C', cancelled: '#E8453C' }
const STATUS_LABELS = { confirmed: '✓ Confirmed', pending: '⏳ Pending', cancelled: '✕ Cancelled' }

function GuestModal({ open, onClose, editing, defaultTourId }: {
  open: boolean, onClose: () => void, editing?: Guest | null, defaultTourId?: string
}) {
  const { tours, artists, addGuest, updateGuest } = useStore()
  const today = new Date().toISOString().slice(0, 10)
  const past30 = new Date(Date.now() - 30*24*60*60*1000).toISOString().slice(0, 10)
  const future60 = new Date(Date.now() + 60*24*60*60*1000).toISOString().slice(0, 10)
  const relevantTours = tours.filter(t => t.start >= past30 && t.start <= future60).sort((a,b) => a.start.localeCompare(b.start))
  const tourOptions = relevantTours.length > 0 ? relevantTours : [...tours].sort((a,b) => b.start.localeCompare(a.start)).slice(0, 20)

  const [tourId, setTourId] = useState(editing?.tourId || defaultTourId || '')
  const [name, setName] = useState(editing?.name || '')
  const [contact, setContact] = useState(editing?.contact || '')
  const [count, setCount] = useState(editing?.count?.toString() || '1')
  const [notes, setNotes] = useState(editing?.notes || '')
  const [saving, setSaving] = useState(false)

  const artistName = (id: string | null | undefined) => id ? artists.find(a => a.id === id)?.name : null

  const save = async () => {
    if (saving) return
    if (!name.trim()) { showToast('Name required', false); return }
    setSaving(true)
    const guest: Guest = {
      id: editing?.id || newId(),
      tourId: tourId || null, name: name.trim(),
      contact, count: parseInt(count) || 1, notes,
      status: editing?.status || 'confirmed'
    }
    if (editing) updateGuest(guest); else addGuest(guest)
    showToast(name + (editing ? ' updated' : ' added'))
    onClose()
    syncToCloud() // background, don't await
    setSaving(false)
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Guest' : 'Add Guest'}>
      <Select label="Show / Event" value={tourId} onChange={e => setTourId(e.target.value)}>
        <option value="">No specific show</option>
        {tourOptions.map(t => (
          <option key={t.id} value={t.id}>{t.start} — {t.title}{artistName(t.aId) ? ` · ${artistName(t.aId)}` : ''}</option>
        ))}
      </Select>
      <Input label="Guest name *" value={name} onChange={e => setName(e.target.value)} placeholder="Marie Dupont" />
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
        <Input label="Phone or email" value={contact} onChange={e => setContact(e.target.value)} placeholder="+33 6..." />
        <Input label="Places" type="number" value={count} onChange={e => setCount(e.target.value)} />
      </div>
      <Textarea label="Notes" value={notes} onChange={e => setNotes(e.target.value)} style={{ minHeight: '60px' }} />
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
        <Button onClick={save} disabled={saving} style={{ flex: 2 }}>{saving ? 'Saving...' : 'Save'}</Button>
      </div>
    </Modal>
  )
}

export default function GuestsPage() {
  const { guests, tours, artists, deleteGuest, cycleGuestStatus } = useStore()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Guest | null>(null)
  const [showSend, setShowSend] = useState(false)
  const [defaultTourId, setDefaultTourId] = useState('')
  const [sendTourId, setSendTourId] = useState<string | null>(null)

  const today = new Date().toISOString().slice(0, 10)
  const artistName = (id: string | null | undefined) => id ? artists.find(a => a.id === id)?.name : null

  const handleDelete = async (g: Guest) => {
    if (!confirm(`Remove "${g.name}"?`)) return
    deleteGuest(g.id); await syncToCloud(); showToast('Guest removed')
  }

  const handleCycleStatus = async (g: Guest) => {
    cycleGuestStatus(g.id); await syncToCloud()
  }

  // Group by show
  const sorted = [...guests].sort((a, b) => {
    const ta = tours.find(t => t.id === a.tourId)?.start || ''
    const tb = tours.find(t => t.id === b.tourId)?.start || ''
    return ta.localeCompare(tb) || a.name.localeCompare(b.name)
  })

  const grouped: { tourId: string | null, label: string, date: string, items: Guest[] }[] = []
  const seen = new Set<string>()
  for (const g of sorted) {
    const key = g.tourId || '__none__'
    if (!seen.has(key)) {
      seen.add(key)
      const t = g.tourId ? tours.find(t => t.id === g.tourId) : null
      grouped.push({
        tourId: g.tourId || null,
        label: t ? `${t.start} — ${t.title}` : 'No show',
        date: t?.start || '',
        items: []
      })
    }
    grouped.find(gr => (gr.tourId || '__none__') === key)!.items.push(g)
  }

  // Build share body
  const shareBody = (tourId: string | null) => {
    const items = tourId ? guests.filter(g => g.tourId === tourId) : guests
    const tour = tourId ? tours.find(t => t.id === tourId) : null
    const header = tour ? `Guest list — ${tour.title} (${tour.start})\n\n` : 'Guest list\n\n'
    const list = items.map(g => `• ${g.name}${g.count > 1 ? ` ×${g.count}` : ''} — ${STATUS_LABELS[g.status]}`).join('\n')
    const total = items.reduce((s, g) => s + (g.count || 1), 0)
    return header + list + `\n\nTotal: ${total} places`
  }

  return (
    <div style={{ padding: '0 0 100px' }}>
      <Toolbar title="Guest List" actions={
        <Button size="sm" onClick={() => { setEditing(null); setDefaultTourId(''); setShowModal(true) }}>+ Guest</Button>
      } />

      <div style={{ padding: '0 16px' }}>
        {guests.length === 0 ? (
          <EmptyState icon="🎫" title="No guests yet" sub="Add guests per show and manage their status." />
        ) : (
          grouped.map(group => {
            const totalPlaces = group.items.reduce((s, g) => s + (g.count || 1), 0)
            const tourArtist = group.tourId ? artists.find(a => a.id === tours.find(t => t.id === group.tourId)?.aId) : null
            return (
              <div key={group.tourId || 'none'} style={{ marginBottom: '24px' }}>
                {/* Group header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: group.tourId ? '#C9A84C' : '#5A5570' }}>
                      🎫 {group.label}
                    </div>
                    {tourArtist && <div style={{ fontSize: '11px', color: tourArtist.color }}>🎤 {tourArtist.name}</div>}
                    <div style={{ fontSize: '11px', color: '#5A5570' }}>{group.items.length} guests · {totalPlaces} places</div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {group.tourId && (
                      <button onClick={() => { setSendTourId(group.tourId); setShowSend(true) }} style={{ background: 'rgba(93,201,160,.1)', border: '1px solid rgba(93,201,160,.2)', color: '#5DC9A0', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', fontWeight: 700 }}>📤</button>
                    )}
                    <button onClick={() => { setEditing(null); setDefaultTourId(group.tourId || ''); setShowModal(true) }} style={{ background: 'rgba(201,168,76,.1)', border: '1px solid rgba(201,168,76,.2)', color: '#C9A84C', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', fontWeight: 700 }}>+ Add</button>
                  </div>
                </div>

                {/* Guests in group */}
                {group.items.map(g => (
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
              </div>
            )
          })
        )}
      </div>

      <GuestModal key={editing?.id || defaultTourId || 'new'} open={showModal} onClose={() => { setShowModal(false); setEditing(null); setDefaultTourId('') }} editing={editing} defaultTourId={defaultTourId} />
      <SendToContact
        open={showSend}
        onClose={() => { setShowSend(false); setSendTourId(null) }}
        subject={sendTourId ? `Guest list — ${tours.find(t => t.id === sendTourId)?.title || ''}` : 'Guest list'}
        body={shareBody(sendTourId)}
      />
    </div>
  )
}
