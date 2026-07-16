'use client'
import { useState } from 'react'
import { useStore, newId } from '@/lib/store'
import { syncToCloud, deleteFromCloud } from '@/lib/sync'
import { Button, Card, Input, Select, Textarea, Modal, EmptyState, Toolbar, showToast } from '@/components/ui'
import { Meeting } from '@/lib/types'

function MeetingModal({ open, onClose, editing }: { open: boolean, onClose: () => void, editing?: Meeting | null }) {
  const { addMeeting, updateMeeting } = useStore()
  const [title, setTitle] = useState(editing?.title || '')
  const [saving, setSaving] = useState(false)
  const [type, setType] = useState<'online' | 'person'>(editing?.type || 'online')
  const [date, setDate] = useState(editing?.date || '')
  const [time, setTime] = useState(editing?.time || '')
  const [location, setLocation] = useState(editing?.location || '')
  const [notes, setNotes] = useState(editing?.notes || '')

  const save = async () => {
    if (saving) return
    setSaving(true)
    if (!title.trim() || !date) { showToast('Title and date required', false); return }
    const meeting: Meeting = {
      id: editing?.id || newId(),
      title: title.trim(), type: type as 'online' | 'person',
      date, time, location, notes
    }
    if (editing) updateMeeting(meeting)
    else addMeeting(meeting)
    await syncToCloud()
    setSaving(false)
    showToast(title + (editing ? ' updated' : ' added'))
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Meeting' : 'New Meeting'}>
      <Input label="Title *" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Production call with Pierre" />
      <Select label="Type" value={type} onChange={e => setType(e.target.value as 'online' | 'person')}>
        <option value="online">Online / Phone</option>
        <option value="person">In person</option>
      </Select>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Input label="Date *" type="date" value={date} onChange={e => setDate(e.target.value)} />
        <Input label="Time" type="time" value={time} onChange={e => setTime(e.target.value)} />
      </div>
      <Input label="Location / Link" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Zoom, or 12 rue de Paris" />
      <Textarea label="Notes" value={notes} onChange={e => setNotes(e.target.value)} />
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
        <Button onClick={save} style={{ flex: 2 }} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
      </div>
    </Modal>
  )
}

export default function MeetingsPage() {
  const { meetings, deleteMeeting } = useStore()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Meeting | null>(null)

  const sorted = [...meetings].sort((a, b) => a.date.localeCompare(b.date))
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = sorted.filter(m => m.date >= today)
  const past = sorted.filter(m => m.date < today).reverse()

  const handleDelete = async (m: Meeting) => {
    if (!confirm(`Delete "${m.title}"?`)) return
    deleteMeeting(m.id)
    await syncToCloud()
    setSaving(false)
    showToast('Meeting deleted')
  }

  const MeetingCard = ({ m }: { m: Meeting }) => (
    <Card style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{ fontSize: '24px' }}>{m.type === 'online' ? '💻' : '🤝'}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>{m.title}</div>
          <div style={{ fontSize: '12px', color: '#5A5570' }}>
            {m.date}{m.time ? ` at ${m.time}` : ''}
            {m.location ? ` · ${m.location}` : ''}
          </div>
          {m.notes && <div style={{ fontSize: '12px', color: '#5A5570', marginTop: '4px', fontStyle: 'italic' }}>{m.notes}</div>}
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <Button variant="secondary" size="sm" onClick={() => { setEditing(m); setShowModal(true) }}>✏</Button>
          <Button variant="danger" size="sm" onClick={() => handleDelete(m)}>✕</Button>
        </div>
      </div>
    </Card>
  )

  return (
    <div style={{ padding: '0 0 100px' }}>
      <Toolbar title="Meetings" actions={
        <Button size="sm" onClick={() => { setEditing(null); setShowModal(true) }}>+ Meeting</Button>
      } />
      <div style={{ padding: '0 16px' }}>
        {meetings.length === 0 ? (
          <EmptyState icon="📞" title="No meetings yet" sub="Add production calls, syncs and appointments." />
        ) : (
          <>
            {upcoming.length > 0 && (
              <>
                <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: '#5A5570', marginBottom: '10px' }}>Upcoming</div>
                {upcoming.map(m => <MeetingCard key={m.id} m={m} />)}
              </>
            )}
            {past.length > 0 && (
              <>
                <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: '#5A5570', margin: '16px 0 10px', opacity: 0.6 }}>Past</div>
                {past.map(m => <MeetingCard key={m.id} m={m} />)}
              </>
            )}
          </>
        )}
      </div>
      <MeetingModal open={showModal} onClose={() => setShowModal(false)} editing={editing} />
    </div>
  )
}
