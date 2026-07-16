'use client'
import { useState } from 'react'
import { useStore, newId } from '@/lib/store'
import { syncToCloud, deleteFromCloud } from '@/lib/sync'
import { Button, Card, Input, Textarea, Modal, EmptyState, Toolbar, showToast } from '@/components/ui'
import { Replacement } from '@/lib/types'

const PHONE_PREFIXES = [
  { label: '🇫🇷 +33', value: '+33' }, { label: '🇪🇸 +34', value: '+34' },
  { label: '🇵🇾 +595', value: '+595' }, { label: '🇧🇪 +32', value: '+32' },
  { label: '🇨🇭 +41', value: '+41' }, { label: '🇮🇹 +39', value: '+39' },
  { label: '🇬🇧 +44', value: '+44' }, { label: '🇩🇪 +49', value: '+49' },
  { label: '🇵🇹 +351', value: '+351' }, { label: '🇳🇱 +31', value: '+31' },
  { label: '🇺🇸 +1', value: '+1' }, { label: '🇦🇷 +54', value: '+54' },
  { label: '🇧🇷 +55', value: '+55' }, { label: '🇲🇽 +52', value: '+52' },
]

function parsePhone(phone: string): { prefix: string, number: string } {
  for (const p of PHONE_PREFIXES) {
    if (phone.startsWith(p.value)) return { prefix: p.value, number: phone.slice(p.value.length) }
  }
  return { prefix: '+33', number: phone }
}

function SubModal({ open, onClose, editing }: { open: boolean, onClose: () => void, editing?: Replacement | null }) {
  const { addReplacement, updateReplacement } = useStore()
  const parsed = editing?.phone ? parsePhone(editing.phone) : { prefix: '+33', number: '' }
  const [name, setName] = useState(editing?.name || '')
  const [saving, setSaving] = useState(false)
  const [inst, setInst] = useState(editing?.inst || '')
  const [prefix, setPrefix] = useState(parsed.prefix)
  const [phoneNum, setPhoneNum] = useState(parsed.number)
  const [email, setEmail] = useState(editing?.email || '')
  const [genre, setGenre] = useState(editing?.genre || '')
  const [notes, setNotes] = useState(editing?.notes || '')

  const save = async () => {
    if (saving) return
    setSaving(true)
    if (!name.trim()) { showToast('Name required', false); return }
    const phone = phoneNum ? prefix + phoneNum.replace(/^0/, '') : ''
    const sub: Replacement = { id: editing?.id || newId(), name: name.trim(), inst, phone, email, genre, notes }
    if (editing) updateReplacement(sub)
    else addReplacement(sub)
    await syncToCloud()
    setSaving(false)
    showToast(name + (editing ? ' updated' : ' added'))
    onClose()
  }

  const shareViaWhatsApp = (phone: string, text: string) => {
    const clean = phone.replace(/[^+0-9]/g, '')
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(text)}`, '_blank')
  }
  const shareViaSMS = (phone: string, text: string) => {
    const clean = phone.replace(/[^+0-9]/g, '')
    window.open(`sms:${clean}?body=${encodeURIComponent(text)}`)
  }
  const shareViaGmail = (emailAddr: string, text: string) => {
    window.open(`https://mail.google.com/mail/?view=cm&tf=1&to=${encodeURIComponent(emailAddr)}&su=${encodeURIComponent('Available dates')}&body=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Replacement' : 'New Replacement'}>
      <Input label="Name *" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Marco Rossi" />
      <Input label="Role / Instrument" value={inst} onChange={e => setInst(e.target.value)} placeholder="e.g. Drums, Actor, Dancer" />
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '4px' }}>📱 Phone / WhatsApp</div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <select value={prefix} onChange={e => setPrefix(e.target.value)} style={{ background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '8px', padding: '10px 6px', fontFamily: 'inherit', fontSize: '13px', flexShrink: 0, maxWidth: '120px' }}>
            {PHONE_PREFIXES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <input type="tel" value={phoneNum} onChange={e => setPhoneNum(e.target.value)} placeholder="6 12 34 56 78" style={{ flex: 1, background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '8px', padding: '10px 12px', fontFamily: 'inherit', fontSize: '14px', outline: 'none' }} />
        </div>
      </div>
      <Input label="✉ Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. marco@email.com" />
      <Input label="Style / Specialty" value={genre} onChange={e => setGenre(e.target.value)} placeholder="e.g. Jazz, Contemporary dance" />
      <Textarea label="Notes" value={notes} onChange={e => setNotes(e.target.value)} style={{ minHeight: '60px' }} />
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
        <Button onClick={save} style={{ flex: 2 }} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
      </div>
    </Modal>
  )
}

// Share dates modal
function ShareModal({ sub, open, onClose }: { sub: Replacement, open: boolean, onClose: () => void }) {
  const { tours, artists } = useStore()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const upcoming = tours.filter(t => t.start >= new Date().toISOString().slice(0, 10)).sort((a, b) => a.start.localeCompare(b.start))
  
  const toggle = (id: string) => {
    const s = new Set(selected)
    if (s.has(id)) s.delete(id)
    else s.add(id)
    setSelected(s)
  }

  const buildText = () => {
    const lines = ['Bonjour,', '', 'Voici les dates disponibles:']
    for (const t of upcoming.filter(t => selected.has(t.id))) {
      const a = artists.find(a => a.id === t.aId)
      lines.push(`• ${t.start}${t.end && t.end !== t.start ? ` → ${t.end}` : ''} — ${t.title}${t.city ? `, ${t.city}` : ''}${a ? ` (${a.name})` : ''}`)
    }
    return lines.join('\n')
  }

  const text = buildText()
  const phone = sub.phone || ''
  const emailAddr = sub.email || ''

  const share = (via: string) => {
    const clean = phone.replace(/[^+0-9]/g, '')
    if (via === 'wa') window.open(`https://wa.me/${clean}?text=${encodeURIComponent(text)}`, '_blank')
    if (via === 'sms') window.open(`sms:${clean}?body=${encodeURIComponent(text)}`)
    if (via === 'gmail') window.open(`https://mail.google.com/mail/?view=cm&tf=1&to=${encodeURIComponent(emailAddr)}&su=${encodeURIComponent('Dates disponibles')}&body=${encodeURIComponent(text)}`, '_blank')
    if (via === 'copy') { navigator.clipboard?.writeText(text); showToast('Copied!') }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Share with ${sub.name}`}>
      <p style={{ fontSize: '13px', color: '#5A5570', marginBottom: '12px' }}>Select dates to share:</p>
      <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '16px' }}>
        {upcoming.map(t => (
          <div key={t.id} onClick={() => toggle(t.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '8px', cursor: 'pointer', background: selected.has(t.id) ? 'rgba(201,168,76,.1)' : 'transparent', marginBottom: '2px' }}>
            <div style={{ width: '16px', height: '16px', border: `2px solid ${selected.has(t.id) ? '#C9A84C' : '#1F1F2E'}`, borderRadius: '4px', background: selected.has(t.id) ? '#C9A84C' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {selected.has(t.id) && <span style={{ color: '#0A0A0F', fontSize: '10px', fontWeight: 900 }}>✓</span>}
            </div>
            <div style={{ flex: 1, fontSize: '13px' }}>{t.start} — {t.title}</div>
          </div>
        ))}
        {upcoming.length === 0 && <p style={{ color: '#5A5570', fontSize: '13px' }}>No upcoming events.</p>}
      </div>
      {selected.size > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {phone && <button onClick={() => share('wa')} style={{ background: '#25D366', border: 'none', color: 'white', borderRadius: '10px', padding: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: '13px' }}>💬 WhatsApp</button>}
          {phone && <button onClick={() => share('sms')} style={{ background: '#4C9AC9', border: 'none', color: 'white', borderRadius: '10px', padding: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: '13px' }}>📱 SMS</button>}
          {emailAddr && <button onClick={() => share('gmail')} style={{ background: '#EA4335', border: 'none', color: 'white', borderRadius: '10px', padding: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: '13px' }}>✉ Gmail</button>}
          <button onClick={() => share('copy')} style={{ background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '10px', padding: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '13px' }}>📋 Copy</button>
        </div>
      )}
    </Modal>
  )
}

export default function ReplacementsPage() {
  const { subs, deleteReplacement } = useStore()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Replacement | null>(null)
  const [shareFor, setShareFor] = useState<Replacement | null>(null)

  const handleDelete = async (s: Replacement) => {
    if (!confirm(`Remove "${s.name}"?`)) return
    deleteReplacement(s.id); await syncToCloud(); showToast(s.name + ' removed')
  }

  return (
    <div style={{ padding: '0 0 100px' }}>
      <Toolbar title="Replacements" actions={<Button size="sm" onClick={() => { setEditing(null); setShowModal(true) }}>+ Add</Button>} />
      <div style={{ padding: '0 16px' }}>
        {subs.length === 0 ? <EmptyState icon="🔄" title="No replacements yet" sub="Add performers and crew you can call when you're unavailable." /> : (
          subs.map(s => (
            <Card key={s.id} style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>{s.name}</div>
                  {s.inst && <div style={{ fontSize: '12px', color: '#5A5570' }}>🎭 {s.inst}</div>}
                  {s.phone && <div style={{ fontSize: '12px', color: '#5A5570' }}>📱 {s.phone}</div>}
                  {s.email && <div style={{ fontSize: '12px', color: '#5A5570' }}>✉ {s.email}</div>}
                  {s.genre && <div style={{ fontSize: '12px', color: '#5A5570' }}>{s.genre}</div>}
                  {s.notes && <div style={{ fontSize: '11px', color: '#5A5570', fontStyle: 'italic', marginTop: '4px' }}>{s.notes}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <Button size="sm" onClick={() => setShareFor(s)}>📋 Dates</Button>
                  <Button variant="secondary" size="sm" onClick={() => { setEditing(s); setShowModal(true) }}>✏ Edit</Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(s)}>✕</Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
      <SubModal open={showModal} onClose={() => setShowModal(false)} editing={editing} />
      {shareFor && <ShareModal sub={shareFor} open={!!shareFor} onClose={() => setShareFor(null)} />}
    </div>
  )
}
