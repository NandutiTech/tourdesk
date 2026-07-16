'use client'
import { useState } from 'react'
import { useStore, newId } from '@/lib/store'
import { syncToCloud, deleteFromCloud } from '@/lib/sync'
import { Button, Card, Input, Select, Textarea, Modal, EmptyState, Toolbar, showToast } from '@/components/ui'
import { Contact } from '@/lib/types'

const PHONE_PREFIXES = [
  { label: '🇫🇷 +33', value: '+33' }, { label: '🇪🇸 +34', value: '+34' },
  { label: '🇵🇾 +595', value: '+595' }, { label: '🇧🇪 +32', value: '+32' },
  { label: '🇨🇭 +41', value: '+41' }, { label: '🇮🇹 +39', value: '+39' },
  { label: '🇬🇧 +44', value: '+44' }, { label: '🇩🇪 +49', value: '+49' },
  { label: '🇵🇹 +351', value: '+351' }, { label: '🇺🇸 +1', value: '+1' },
  { label: '🇦🇷 +54', value: '+54' }, { label: '🇧🇷 +55', value: '+55' },
]

function parsePhone(phone: string): { prefix: string, number: string } {
  for (const p of PHONE_PREFIXES) {
    if (phone.startsWith(p.value)) return { prefix: p.value, number: phone.slice(p.value.length) }
  }
  return { prefix: '+33', number: phone }
}

function ContactModal({ open, onClose, editing }: { open: boolean, onClose: () => void, editing?: Contact | null }) {
  const { artists, addContact, updateContact } = useStore()
  const parsed = editing?.phone ? parsePhone(editing.phone) : { prefix: '+33', number: '' }
  const [name, setName] = useState(editing?.name || '')
  const [role, setRole] = useState(editing?.role || '')
  const [company, setCompany] = useState(editing?.company || '')
  const [prefix, setPrefix] = useState(parsed.prefix)
  const [phoneNum, setPhoneNum] = useState(parsed.number)
  const [email, setEmail] = useState(editing?.email || '')
  const [aId, setAId] = useState(editing?.aId || '')
  const [last, setLast] = useState(editing?.last || '')
  const [followup, setFollowup] = useState(editing?.followup || '')
  const [notes, setNotes] = useState(editing?.notes || '')

  const save = async () => {
    if (!name.trim()) { showToast('Name required', false); return }
    const phone = phoneNum ? prefix + phoneNum.replace(/^0/, '') : ''
    const c: Contact = {
      id: editing?.id || newId(),
      name: name.trim(), role, company,
      phone, email, aId: aId || null,
      last, followup, notes
    }
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

      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '4px' }}>📱 Phone / WhatsApp</div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <select value={prefix} onChange={e => setPrefix(e.target.value)} style={{ background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '8px', padding: '10px 6px', fontFamily: 'inherit', fontSize: '13px', flexShrink: 0, maxWidth: '120px' }}>
            {PHONE_PREFIXES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <input type="tel" value={phoneNum} onChange={e => setPhoneNum(e.target.value)} placeholder="6 12 34 56 78" style={{ flex: 1, background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '8px', padding: '10px 12px', fontFamily: 'inherit', fontSize: '14px', outline: 'none' }} />
        </div>
      </div>

      <Input label="✉ Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. sophie@production.fr" />

      <Select label="Linked artist / project" value={aId} onChange={e => setAId(e.target.value)}>
        <option value="">General contact (no project)</option>
        {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
      </Select>

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
  const { contacts, artists, deleteContact } = useStore()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Contact | null>(null)
  const [search, setSearch] = useState('')
  const [filterArtistId, setFilterArtistId] = useState('all')
  const today = new Date().toISOString().slice(0, 10)

  const filtered = contacts
    .filter(c => {
      const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.company || '').toLowerCase().includes(search.toLowerCase())
      const matchArtist = filterArtistId === 'all' || !c.aId || c.aId === filterArtistId
      return matchSearch && matchArtist
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  const needFollowup = contacts.filter(c => c.followup && c.followup <= today).sort((a, b) => (a.followup || '').localeCompare(b.followup || ''))

  const handleDelete = async (c: Contact) => {
    if (!confirm(`Delete "${c.name}"?`)) return
    deleteContact(c.id); await syncToCloud(); showToast(c.name + ' deleted')
  }

  // Group by artist
  const groupedByArtist = artists.map(a => ({
    artist: a,
    contacts: filtered.filter(c => c.aId === a.id)
  })).filter(g => g.contacts.length > 0)
  const general = filtered.filter(c => !c.aId)

  return (
    <div style={{ padding: '0 0 100px' }}>
      <Toolbar title="Industry Contacts" actions={
        <Button size="sm" onClick={() => { setEditing(null); setShowModal(true) }}>+ Add</Button>
      } />
      <div style={{ padding: '0 16px' }}>
        {contacts.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search..." style={{ flex: 1, background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '10px', padding: '10px 14px', fontFamily: 'inherit', fontSize: '14px', outline: 'none' }} />
            {artists.length > 0 && (
              <select value={filterArtistId} onChange={e => setFilterArtistId(e.target.value)} style={{ background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '10px', padding: '10px', fontFamily: 'inherit', fontSize: '13px', maxWidth: '140px' }}>
                <option value="all">All</option>
                {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            )}
          </div>
        )}

        {needFollowup.length > 0 && (
          <>
            <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: '#E8453C', marginBottom: '8px' }}>🔔 Follow-up needed</div>
            {needFollowup.map(c => (
              <Card key={c.id} style={{ marginBottom: '8px', borderColor: 'rgba(232,69,60,.3)', padding: '10px 12px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px' }}>{c.name}</div>
                <div style={{ fontSize: '11px', color: '#5A5570' }}>{c.role}{c.company ? ` · ${c.company}` : ''}</div>
                <div style={{ fontSize: '11px', color: '#E8453C' }}>Follow-up: {c.followup}</div>
              </Card>
            ))}
            <div style={{ height: '8px' }} />
          </>
        )}

        {contacts.length === 0 ? (
          <EmptyState icon="🤝" title="No contacts yet" sub="Add managers, directors, producers, bookers — anyone in your network. You can link them to a specific artist." />
        ) : (
          <>
            {/* Per artist */}
            {groupedByArtist.map(({ artist, contacts: ac }) => (
              <div key={artist.id} style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: artist.color }} />
                  <div style={{ fontSize: '11px', fontWeight: 800, color: artist.color, textTransform: 'uppercase', letterSpacing: '.1em' }}>{artist.name}</div>
                </div>
                {ac.map(c => <ContactCard key={c.id} c={c} onEdit={() => { setEditing(c); setShowModal(true) }} onDelete={() => handleDelete(c)} today={today} />)}
              </div>
            ))}

            {/* General */}
            {general.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                {groupedByArtist.length > 0 && <div style={{ fontSize: '11px', fontWeight: 800, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '8px' }}>General</div>}
                {general.map(c => <ContactCard key={c.id} c={c} onEdit={() => { setEditing(c); setShowModal(true) }} onDelete={() => handleDelete(c)} today={today} />)}
              </div>
            )}
          </>
        )}
      </div>
      <ContactModal open={showModal} onClose={() => setShowModal(false)} editing={editing} />
    </div>
  )
}

function ContactCard({ c, onEdit, onDelete, today }: { c: Contact, onEdit: () => void, onDelete: () => void, today: string }) {
  const phone = c.phone || (c.contact && !c.contact.includes('@') ? c.contact : '')
  const email = c.email || (c.contact?.includes('@') ? c.contact : '')
  const cleanPhone = phone.replace(/[^+0-9]/g, '')

  return (
    <Card style={{ marginBottom: '8px', padding: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{ width: '36px', height: '36px', background: '#C9A84C', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#0A0A0F', fontSize: '14px', flexShrink: 0 }}>
          {c.name[0]?.toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '14px' }}>{c.name}</div>
          {(c.role || c.company) && <div style={{ fontSize: '12px', color: '#5A5570' }}>{c.role}{c.role && c.company ? ' · ' : ''}{c.company}</div>}
          {phone && <div style={{ fontSize: '12px', color: '#5A5570' }}>📱 {phone}</div>}
          {email && <div style={{ fontSize: '12px', color: '#5A5570' }}>✉ {email}</div>}
          {c.last && <div style={{ fontSize: '11px', color: '#5A5570', marginTop: '2px' }}>Last: {c.last}</div>}
          {c.followup && c.followup > today && <div style={{ fontSize: '11px', color: '#C9A84C', marginTop: '2px' }}>Follow-up: {c.followup}</div>}
          {c.notes && <div style={{ fontSize: '11px', color: '#5A5570', fontStyle: 'italic', marginTop: '4px' }}>{c.notes}</div>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {phone && (
            <button onClick={() => window.open(`https://wa.me/${cleanPhone}`, '_blank')} style={{ background: '#25D366', border: 'none', color: 'white', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', fontWeight: 700 }}>💬</button>
          )}
          {email && (
            <button onClick={() => window.open(`https://mail.google.com/mail/?view=cm&tf=1&to=${encodeURIComponent(email)}`, '_blank')} style={{ background: '#EA4335', border: 'none', color: 'white', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', fontWeight: 700 }}>✉</button>
          )}
          <Button variant="secondary" size="sm" onClick={onEdit}>✏</Button>
          <Button variant="danger" size="sm" onClick={onDelete}>✕</Button>
        </div>
      </div>
    </Card>
  )
}
