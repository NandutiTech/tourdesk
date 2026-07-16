'use client'
import { useState } from 'react'
import { useStore, newId } from '@/lib/store'
import { syncToCloud } from '@/lib/sync'
import { Button, Card, Input, Textarea, Modal, EmptyState, Toolbar, showToast } from '@/components/ui'
import { Contact } from '@/lib/types'

function ContactModal({ open, onClose, editing }: { open: boolean, onClose: () => void, editing?: Contact | null }) {
  const { addContact, updateContact } = useStore()
  const [name, setName] = useState(editing?.name || '')
  const [role, setRole] = useState(editing?.role || '')
  const [company, setCompany] = useState(editing?.company || '')
  const [contact, setContact] = useState(editing?.contact || '')
  const [last, setLast] = useState(editing?.last || '')
  const [followup, setFollowup] = useState(editing?.followup || '')
  const [notes, setNotes] = useState(editing?.notes || '')

  const save = async () => {
    if (!name.trim()) { showToast('Name required', false); return }
    const c: Contact = { id: editing?.id || newId(), name: name.trim(), role, company, contact, last, followup, notes }
    if (editing) updateContact(c)
    else addContact(c)
    await syncToCloud()
    showToast(name + (editing ? ' updated' : ' added'))
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Contact' : 'New Contact'}>
      <Input label="Name *" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sophie Martin" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Input label="Role" value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Director" />
        <Input label="Company" value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Théâtre du Soleil" />
      </div>
      <Input label="Contact (email/phone)" value={contact} onChange={e => setContact(e.target.value)} placeholder="email or phone" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Input label="Last contact" type="date" value={last} onChange={e => setLast(e.target.value)} />
        <Input label="Follow-up date" type="date" value={followup} onChange={e => setFollowup(e.target.value)} />
      </div>
      <Textarea label="Notes" value={notes} onChange={e => setNotes(e.target.value)} style={{ minHeight: '60px' }} />
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
        <Button onClick={save} style={{ flex: 2 }}>Save</Button>
      </div>
    </Modal>
  )
}

export default function ContactsPage() {
  const { contacts, deleteContact } = useStore()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Contact | null>(null)
  const [search, setSearch] = useState('')
  const today = new Date().toISOString().slice(0, 10)

  const filtered = contacts
    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.company || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))

  const needFollowup = contacts.filter(c => c.followup && c.followup <= today).sort((a, b) => (a.followup || '').localeCompare(b.followup || ''))

  const handleDelete = async (c: Contact) => {
    if (!confirm(`Delete "${c.name}"?`)) return
    deleteContact(c.id); await syncToCloud(); showToast(c.name + ' deleted')
  }

  return (
    <div style={{ padding: '0 0 100px' }}>
      <Toolbar title="Industry Contacts" actions={<Button size="sm" onClick={() => { setEditing(null); setShowModal(true) }}>+ Add</Button>} />
      <div style={{ padding: '0 16px' }}>
        {contacts.length > 0 && (
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search contacts..." style={{ width: '100%', background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '10px', padding: '10px 14px', fontFamily: 'inherit', fontSize: '14px', outline: 'none', boxSizing: 'border-box', marginBottom: '16px' }} />
        )}

        {needFollowup.length > 0 && (
          <>
            <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: '#E8453C', marginBottom: '8px' }}>🔔 Follow-up needed</div>
            {needFollowup.map(c => (
              <Card key={c.id} style={{ marginBottom: '8px', borderColor: 'rgba(232,69,60,.3)', background: 'rgba(232,69,60,.05)', padding: '10px 12px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px' }}>{c.name}</div>
                {c.role && <div style={{ fontSize: '11px', color: '#5A5570' }}>{c.role}{c.company ? ` · ${c.company}` : ''}</div>}
                <div style={{ fontSize: '11px', color: '#E8453C', marginTop: '2px' }}>Follow-up: {c.followup}</div>
              </Card>
            ))}
            <div style={{ height: '8px' }} />
          </>
        )}

        {contacts.length === 0 ? <EmptyState icon="🤝" title="No contacts yet" sub="Build your industry network — casting directors, producers, managers." /> : (
          filtered.map(c => (
            <Card key={c.id} style={{ marginBottom: '8px', padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', background: '#C9A84C', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#0A0A0F', fontSize: '14px', flexShrink: 0 }}>
                  {c.name[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>{c.name}</div>
                  {(c.role || c.company) && <div style={{ fontSize: '12px', color: '#5A5570' }}>{c.role}{c.role && c.company ? ' · ' : ''}{c.company}</div>}
                  {c.contact && <div style={{ fontSize: '12px', color: '#5A5570' }}>{c.contact}</div>}
                  {c.last && <div style={{ fontSize: '11px', color: '#5A5570', marginTop: '2px' }}>Last contact: {c.last}</div>}
                  {c.followup && c.followup > today && <div style={{ fontSize: '11px', color: '#C9A84C', marginTop: '2px' }}>Follow-up: {c.followup}</div>}
                  {c.notes && <div style={{ fontSize: '11px', color: '#5A5570', fontStyle: 'italic', marginTop: '4px' }}>{c.notes}</div>}
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <Button variant="secondary" size="sm" onClick={() => { setEditing(c); setShowModal(true) }}>✏</Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(c)}>✕</Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
      <ContactModal open={showModal} onClose={() => setShowModal(false)} editing={editing} />
    </div>
  )
}
