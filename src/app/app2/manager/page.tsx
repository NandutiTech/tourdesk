'use client'
import { useState } from 'react'
import { useStore, newId } from '@/lib/store'
import { syncToCloud, deleteFromCloud } from '@/lib/sync'
import { Button, Card, Input, Select, Textarea, Modal, EmptyState, Toolbar, showToast } from '@/components/ui'
import { ManagerTour, ManagerMember } from '@/lib/types'

function MemberModal({ open, onClose, onSave, editing }: {
  open: boolean, onClose: () => void,
  onSave: (m: ManagerMember) => void,
  editing?: ManagerMember | null
}) {
  const [name, setName] = useState(editing?.name || '')
  const [role, setRole] = useState(editing?.role || '')
  const [hotel, setHotel] = useState(editing?.hotel || '')
  const [room, setRoom] = useState(editing?.room || '')
  const [hotelAddr, setHotelAddr] = useState(editing?.hotelAddr || '')
  const [ticketRef, setTicketRef] = useState(editing?.ticketRef || '')
  const [notes, setNotes] = useState(editing?.notes || '')

  const save = () => {
    if (!name.trim()) { showToast('Name required', false); return }
    onSave({ id: editing?.id || newId(), name: name.trim(), role, hotel, room, hotelAddr, ticketRef, notes })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Member' : 'Add Team Member'}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Input label="Name *" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sophie" />
        <Input label="Role" value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Tour Manager" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Input label="Hotel" value={hotel} onChange={e => setHotel(e.target.value)} placeholder="e.g. Ibis Lyon Centre" />
        <Input label="Room #" value={room} onChange={e => setRoom(e.target.value)} placeholder="e.g. 214" />
      </div>
      <Input label="Hotel address" value={hotelAddr} onChange={e => setHotelAddr(e.target.value)} />
      <Input label="Ticket / transport ref" value={ticketRef} onChange={e => setTicketRef(e.target.value)} placeholder="e.g. TGV 6214 / vol AY123" />
      <Textarea label="Notes" value={notes} onChange={e => setNotes(e.target.value)} style={{ minHeight: '60px' }} />
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
        <Button onClick={save} style={{ flex: 2 }}>Save</Button>
      </div>
    </Modal>
  )
}

function TourSheetModal({ open, onClose, editing }: { open: boolean, onClose: () => void, editing?: ManagerTour | null }) {
  const { artists, addMgrTour, updateMgrTour } = useStore()
  const [name, setName] = useState(editing?.name || '')
  const [aId, setAId] = useState(editing?.aId || '')
  const [start, setStart] = useState(editing?.start || '')
  const [end, setEnd] = useState(editing?.end || '')
  const [notes, setNotes] = useState(editing?.notes || '')
  const [members, setMembers] = useState<ManagerMember[]>(editing?.members || [])
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [editingMember, setEditingMember] = useState<ManagerMember | null>(null)

  const addMember = (m: ManagerMember) => setMembers(prev => [...prev, m])
  const updateMember = (m: ManagerMember) => setMembers(prev => prev.map(x => x.id === m.id ? m : x))
  const removeMember = (id: string) => setMembers(prev => prev.filter(m => m.id !== id))

  const save = async () => {
    if (!name.trim()) { showToast('Tour name required', false); return }
    const tour: ManagerTour = { id: editing?.id || newId(), name: name.trim(), aId: aId || null, start, end, notes, members }
    if (editing) updateMgrTour(tour)
    else addMgrTour(tour)
    await syncToCloud()
    showToast(name + (editing ? ' updated' : ' created'))
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Tour Sheet' : 'New Tour Sheet'}>
      <Input label="Tour name *" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Summer Tour 2026" />
      <Select label="Artist" value={aId} onChange={e => setAId(e.target.value)}>
        <option value="">No artist</option>
        {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
      </Select>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Input label="Start date" type="date" value={start} onChange={e => setStart(e.target.value)} />
        <Input label="End date" type="date" value={end} onChange={e => setEnd(e.target.value)} />
      </div>
      <Textarea label="Notes" value={notes} onChange={e => setNotes(e.target.value)} style={{ minHeight: '60px' }} />

      {/* Members */}
      <div style={{ fontSize: '11px', fontWeight: 800, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.1em', margin: '12px 0 8px' }}>Team members</div>
      {members.map(m => (
        <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid #1F1F2E' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 700 }}>{m.name}</div>
            {m.role && <div style={{ fontSize: '11px', color: '#5A5570' }}>{m.role}</div>}
          </div>
          <Button variant="secondary" size="sm" onClick={() => { setEditingMember(m); setShowMemberModal(true) }}>✏</Button>
          <Button variant="danger" size="sm" onClick={() => removeMember(m.id)}>✕</Button>
        </div>
      ))}
      <button onClick={() => { setEditingMember(null); setShowMemberModal(true) }} style={{ width: '100%', background: 'none', border: '1px dashed #1F1F2E', color: '#5A5570', borderRadius: '8px', padding: '8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', marginTop: '8px', marginBottom: '12px' }}>
        + Add team member
      </button>

      <div style={{ display: 'flex', gap: '8px' }}>
        <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
        <Button onClick={save} style={{ flex: 2 }}>Save tour sheet</Button>
      </div>

      <MemberModal
        open={showMemberModal}
        onClose={() => setShowMemberModal(false)}
        editing={editingMember}
        onSave={m => editingMember ? updateMember(m) : addMember(m)}
      />
    </Modal>
  )
}

export default function ManagerPage() {
  const { mgrTours, artists, deleteMgrTour } = useStore()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<ManagerTour | null>(null)

  const handleDelete = async (t: ManagerTour) => {
    if (!confirm(`Delete "${t.name}"?`)) return
    deleteMgrTour(t.id); await syncToCloud(); showToast('Tour sheet deleted')
  }

  const share = (t: ManagerTour) => {
    const artist = artists.find(a => a.id === t.aId)
    const lines = [`🎭 ${t.name}${artist ? ` — ${artist.name}` : ''}`, '']
    if (t.start) lines.push(`📅 ${t.start}${t.end ? ` → ${t.end}` : ''}`, '')
    if (t.notes) lines.push(t.notes, '')
    if (t.members.length > 0) {
      lines.push('👥 Team:')
      for (const m of t.members) {
        lines.push(`• ${m.name}${m.role ? ` (${m.role})` : ''}`)
        if (m.hotel) lines.push(`  🏨 ${m.hotel}${m.room ? ` #${m.room}` : ''}${m.hotelAddr ? `, ${m.hotelAddr}` : ''}`)
        if (m.ticketRef) lines.push(`  🎫 ${m.ticketRef}`)
        if (m.notes) lines.push(`  📝 ${m.notes}`)
      }
    }
    const text = lines.join('\n')
    navigator.clipboard?.writeText(text)
    showToast('Tour sheet copied!')
  }

  return (
    <div style={{ padding: '0 0 100px' }}>
      <Toolbar title="Manager Tour Sheet" actions={<Button size="sm" onClick={() => { setEditing(null); setShowModal(true) }}>+ New tour</Button>} />
      <div style={{ padding: '0 16px' }}>
        {mgrTours.length === 0 ? (
          <EmptyState icon="🎭" title="No tour sheets yet" sub="Create tour sheets to share hotel and transport info with your team." />
        ) : (
          mgrTours.map(t => {
            const artist = artists.find(a => a.id === t.aId)
            return (
              <Card key={t.id} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '15px' }}>{t.name}</div>
                    {artist && <div style={{ fontSize: '12px', color: artist.color }}>🎤 {artist.name}</div>}
                    {t.start && <div style={{ fontSize: '12px', color: '#5A5570' }}>📅 {t.start}{t.end ? ` → ${t.end}` : ''}</div>}
                    {t.notes && <div style={{ fontSize: '12px', color: '#5A5570', marginTop: '4px' }}>{t.notes}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <Button size="sm" onClick={() => share(t)}>📋</Button>
                    <Button variant="secondary" size="sm" onClick={() => { setEditing(t); setShowModal(true) }}>✏</Button>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(t)}>✕</Button>
                  </div>
                </div>

                {t.members.length > 0 && (
                  <div style={{ borderTop: '1px solid #1F1F2E', paddingTop: '10px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '8px' }}>Team ({t.members.length})</div>
                    {t.members.map(m => (
                      <div key={m.id} style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #1F1F2E' }}>
                        <div style={{ fontWeight: 700, fontSize: '13px' }}>{m.name}{m.role ? ` · ${m.role}` : ''}</div>
                        {m.hotel && <div style={{ fontSize: '11px', color: '#5A5570' }}>🏨 {m.hotel}{m.room ? ` #${m.room}` : ''}</div>}
                        {m.ticketRef && <div style={{ fontSize: '11px', color: '#5A5570' }}>🎫 {m.ticketRef}</div>}
                        {m.notes && <div style={{ fontSize: '11px', color: '#5A5570', fontStyle: 'italic' }}>{m.notes}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )
          })
        )}
      </div>
      <TourSheetModal open={showModal} onClose={() => setShowModal(false)} editing={editing} />
    </div>
  )
}
