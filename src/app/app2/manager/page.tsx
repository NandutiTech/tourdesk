'use client'
import React, { useState, useEffect, useRef } from 'react'
import { getToken } from '@/lib/store'
import { Button, Card, Input, Textarea, Modal, EmptyState, Toolbar, showToast } from '@/components/ui'

const PHONE_PREFIXES = [
  { label: '🇫🇷 +33', value: '+33' }, { label: '🇪🇸 +34', value: '+34' },
  { label: '🇵🇾 +595', value: '+595' }, { label: '🇧🇪 +32', value: '+32' },
  { label: '🇨🇭 +41', value: '+41' }, { label: '🇮🇹 +39', value: '+39' },
  { label: '🇬🇧 +44', value: '+44' }, { label: '🇩🇪 +49', value: '+49' },
  { label: '🇵🇹 +351', value: '+351' }, { label: '🇺🇸 +1', value: '+1' },
  { label: '🇦🇷 +54', value: '+54' }, { label: '🇧🇷 +55', value: '+55' },
]
function parsePhone(phone: string) {
  for (const p of PHONE_PREFIXES) {
    if (phone?.startsWith(p.value)) return { prefix: p.value, number: phone.slice(p.value.length) }
  }
  return { prefix: '+33', number: phone || '' }
}

const ROLES = ['Chanteur·se', 'Musicien·ne', 'Batteur·se', 'Pianiste', 'Guitariste', 'Bassiste', 'Ingénieur son', 'Ingénieur lumière', 'Tour manager', 'Road manager', 'Autre']

async function api(action: string, data: any = {}) {
  const res = await fetch('/api/manager', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
    body: JSON.stringify({ action, ...data })
  })
  return res.json()
}

async function loadData(params: Record<string, string> = {}) {
  const q = new URLSearchParams(params).toString()
  const res = await fetch(`/api/manager${q ? '?' + q : ''}`, { headers: { 'Authorization': `Bearer ${getToken()}` } })
  return res.json()
}

async function extractTicket(base64: string, mimeType: string) {
  try {
    const res = await fetch('/api/extract-ticket', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64, mimeType })
    })
    return await res.json()
  } catch { return {} }
}

async function extractShows(base64: string, mimeType: string) {
  try {
    const res = await fetch('/api/extract-shows', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64, mimeType })
    })
    return await res.json()
  } catch { return [] }
}

// ─── Show Info Section (shared) ────────────────────────────────────────────
const SHOW_INFO_FIELDS: Record<string, { label: string, placeholder: string }> = {
  hotel: { label: '🏨 Hébergement', placeholder: 'Hôtel du Palais, 12 rue...\nPiscine sur place, prévoir maillots!' },
  transfers: { label: '🚌 Transfers', placeholder: 'Bus collectif départ 14h depuis le théâtre\nRetour prévu 23h30' },
  meals: { label: '🍽 Repas', placeholder: 'Prise en charge directe sur place\nDîner 19h — restaurant La Brasserie' },
  planning: { label: '📅 Planning', placeholder: 'Arrivée: 14h\nBalance: 16h\nCatering: 18h30\nShow: 20h30\nFin: 22h30' },
  technique: { label: '🎛 Technique', placeholder: 'EOS demande pupitage possible J-1\nProjection sur le mur de fond\nSon: L-Acoustics K2' },
}

function ShowInfoSection({ show, field, onSave }: any) {
  const info = SHOW_INFO_FIELDS[field]
  const fieldKey = field === 'hotel' ? 'hotel' : field
  const notesKey = field === 'hotel' ? 'hotel_notes' : null
  const [value, setValue] = useState(show[fieldKey] || '')
  const [notes, setNotes] = useState(notesKey ? (show[notesKey] || '') : '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    const updates: any = { [fieldKey]: value }
    if (notesKey) updates[notesKey] = notes
    await onSave(updates)
    setSaving(false)
  }

  return (
    <Card style={{ marginBottom: '12px' }}>
      <div style={{ fontSize: '13px', fontWeight: 800, marginBottom: '10px' }}>{info?.label}</div>
      <textarea value={value} onChange={e => setValue(e.target.value)} placeholder={info?.placeholder}
        style={{ width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid #1E1E2E', color: '#E8E0F0', borderRadius: '10px', padding: '12px', fontFamily: 'inherit', fontSize: '13px', outline: 'none', minHeight: '100px', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6 }} />
      {notesKey && (
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes supplémentaires..."
          style={{ width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid #1E1E2E', color: '#C9A84C', borderRadius: '10px', padding: '12px', fontFamily: 'inherit', fontSize: '12px', outline: 'none', minHeight: '60px', resize: 'vertical', boxSizing: 'border-box', marginTop: '6px' }} />
      )}
      <Button onClick={save} disabled={saving} style={{ marginTop: '10px', width: '100%' }}>
        {saving ? 'Saving...' : 'Save'}
      </Button>
    </Card>
  )
}

// ─── Show Documents ─────────────────────────────────────────────────────────
function ShowDocuments({ showId, tourId, docs, onRefresh }: any) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [viewing, setViewing] = useState<any>(null)

  const handleFile = async (file: File) => {
    const b64 = await new Promise<string>(res => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(file) })
    setUploading(true)
    await api('add_show_document', { showId, tourId, name: file.name, data: b64, mime: file.type })
    showToast('Document added ✓')
    setUploading(false)
    onRefresh()
  }

  const viewDoc = async (doc: any) => {
    const res = await api('get_show_document', { docId: doc.id })
    setViewing({ ...res, name: doc.name })
  }

  return (
    <>
      <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <div style={{ marginBottom: '12px' }}>
        <button onClick={() => fileRef.current?.click()} style={{ width: '100%', background: '#12121A', border: '1px dashed rgba(201,168,76,.3)', color: '#5A5570', borderRadius: '10px', padding: '12px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', marginBottom: '10px' }}>
          {uploading ? '⏳ Uploading...' : '📎 Add document or photo'}
        </button>
        {docs.map((d: any) => (
          <Card key={d.id} style={{ marginBottom: '8px', padding: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>{d.mime?.startsWith('image') ? '🖼' : '📄'}</span>
              <span style={{ flex: 1, fontSize: '13px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
              <button onClick={() => viewDoc(d)} style={{ background: '#C9A84C', border: 'none', color: '#0A0A0F', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', fontWeight: 800 }}>View</button>
              <button onClick={async () => { if (!confirm('Delete?')) return; await api('delete_show_document', { docId: d.id }); onRefresh() }} style={{ background: 'none', border: 'none', color: '#E8453C', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>
          </Card>
        ))}
        {docs.length === 0 && <div style={{ textAlign: 'center', color: '#5A5570', fontSize: '13px', padding: '16px' }}>No documents yet</div>}
      </div>
      {viewing?.data && (
        <div onClick={() => setViewing(null)} style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,.97)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '600px', marginBottom: '12px' }}>
            <div style={{ fontWeight: 700, color: 'white' }}>{viewing.name}</div>
            <button onClick={() => setViewing(null)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '28px', cursor: 'pointer' }}>✕</button>
          </div>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '600px' }}>
            {viewing.mime?.startsWith('image') && <img src={viewing.data} alt="" style={{ width: '100%', borderRadius: '12px', maxHeight: '80vh', objectFit: 'contain' }} />}
            {viewing.mime === 'application/pdf' && <iframe src={viewing.data} style={{ width: '100%', height: '80vh', border: 'none', borderRadius: '12px' }} />}
          </div>
        </div>
      )}
    </>
  )
}

// ─── Show Chat (group) ──────────────────────────────────────────────────────
function ShowChat({ showId, tourId, messages, onSend }: any) {
  return (
    <Card style={{ marginBottom: '12px' }}>
      <div style={{ fontSize: '13px', fontWeight: 800, marginBottom: '12px' }}>💬 Group chat</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px', maxHeight: '300px', overflowY: 'auto' }}>
        {messages.length === 0 ? (
          <div style={{ fontSize: '12px', color: '#5A5570', textAlign: 'center', padding: '24px' }}>No messages yet</div>
        ) : messages.map((m: any) => (
          <div key={m.id} style={{ alignSelf: m.is_manager ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
            <div style={{ fontSize: '10px', color: '#5A5570', marginBottom: '3px', textAlign: m.is_manager ? 'right' : 'left' }}>{m.sender_name}</div>
            <div style={{ background: m.is_manager ? 'rgba(201,168,76,.15)' : '#1A1A28', border: `1px solid ${m.is_manager ? 'rgba(201,168,76,.3)' : '#1F1F2E'}`, borderRadius: m.is_manager ? '12px 12px 4px 12px' : '12px 12px 12px 4px', padding: '10px 14px', fontSize: '13px', lineHeight: 1.5 }}>
              {m.message}
            </div>
          </div>
        ))}
      </div>
      <MessageInput onSend={onSend} />
    </Card>
  )
}

// ─── Guests Section ────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = { confirmed: '#5DC9A0', pending: '#C9A84C', cancelled: '#E8453C' }
const STATUS_LABELS: Record<string, string> = { confirmed: '✓ Confirmed', pending: '⏳ Pending', cancelled: '✕ Cancelled' }
const CATS: Record<string, string> = { transport: '🚆 Transport', hotel: '🏨 Hotel', food: '🍽 Food', equipment: '🎛 Equipment', other: '📦 Other' }

function GuestAddModal({ open, onClose, onSave, editing }: any) {
  const [name, setName] = useState(editing?.name || '')
  const [contact, setContact] = useState(editing?.contact || '')
  const [count, setCount] = useState(editing?.count?.toString() || '1')
  const [notes, setNotes] = useState(editing?.notes || '')
  const [saving, setSaving] = useState(false)
  const save = async () => {
    if (!name.trim()) { showToast('Name required', false); return }
    setSaving(true)
    await onSave({ name: name.trim(), contact, count: parseInt(count) || 1, notes })
    setSaving(false)
    onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit Guest" : "Add Guest"}>
      <Input label="Guest name *" value={name} onChange={e => setName(e.target.value)} placeholder="Marie Dupont" />
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
        <Input label="Phone or email" value={contact} onChange={e => setContact(e.target.value)} placeholder="+33 6..." />
        <Input label="Places" type="number" value={count} onChange={e => setCount(e.target.value)} />
      </div>
      <Textarea label="Notes" value={notes} onChange={e => setNotes(e.target.value)} style={{ minHeight: '50px' }} />
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
        <Button onClick={save} disabled={saving} style={{ flex: 2 }}>{saving ? 'Saving...' : editing ? 'Save' : 'Add'}</Button>
      </div>
    </Modal>
  )
}

function GuestsSection({ showId, memberId, tourId, guests, onRefresh }: any) {
  const [showAdd, setShowAdd] = useState(false)
  const [editingGuest, setEditingGuest] = useState<any>(null)
  const total = guests.reduce((s: number, g: any) => s + (g.count || 1), 0)
  const cycleStatus = async (g: any) => {
    const next: Record<string, string> = { confirmed: 'pending', pending: 'cancelled', cancelled: 'confirmed' }
    await api('update_guest', { guestId: g.id, status: next[g.status] || 'confirmed' })
    onRefresh()
  }
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ fontSize: '12px', color: '#5A5570' }}>{guests.length} guests · {total} places</div>
        <Button size="sm" onClick={() => { setEditingGuest(null); setShowAdd(true) }}>+ Guest</Button>
      </div>
      {guests.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#5A5570', fontSize: '13px', padding: '24px', background: '#12121A', borderRadius: '12px', marginBottom: '12px' }}>No guests yet</div>
      ) : guests.map((g: any) => (
        <Card key={g.id} style={{ marginBottom: '8px', padding: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '13px' }}>{g.name}{g.count > 1 ? ` ×${g.count}` : ''}</div>
              {g.contact && <div style={{ fontSize: '11px', color: '#5A5570' }}>{g.contact}</div>}
              {g.notes && <div style={{ fontSize: '11px', color: '#5A5570', fontStyle: 'italic' }}>{g.notes}</div>}
            </div>
            <button onClick={() => cycleStatus(g)} style={{ background: 'none', border: `1px solid ${STATUS_COLORS[g.status]}`, color: STATUS_COLORS[g.status], borderRadius: '6px', padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
              {STATUS_LABELS[g.status]}
            </button>
            <button onClick={() => { setEditingGuest(g); setShowAdd(true) }} style={{ background: 'none', border: '1px solid #1F1F2E', color: '#5A5570', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px' }}>✏</button>
            <button onClick={async () => { if (!confirm('Remove guest?')) return; await api('delete_guest', { guestId: g.id }); onRefresh() }} style={{ background: 'none', border: 'none', color: '#E8453C', cursor: 'pointer', fontSize: '16px' }}>✕</button>
          </div>
        </Card>
      ))}
      <GuestAddModal key={editingGuest?.id || (showAdd ? 'new-open' : 'closed')} open={showAdd} onClose={() => { setShowAdd(false); setEditingGuest(null) }} editing={editingGuest} onSave={async (g: any) => {
        if (editingGuest) {
          const res = await api('update_guest', { guestId: editingGuest.id, ...g })
          if (res.error) { showToast('Error: ' + res.error, false); return }
          showToast('Guest updated ✓')
        } else {
          const res = await api('add_guest', { showId, memberId, tourId, ...g })
          if (res.error) { showToast('Error: ' + res.error, false); return }
          showToast('Guest added ✓')
        }
        onRefresh()
      }} />
    </>
  )
}

// ─── Expenses Section ──────────────────────────────────────────────────────
function ExpenseAddModal({ open, onClose, showDate, onSave, editing }: any) {
  const today = showDate || new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(editing?.date || today)
  const [amount, setAmount] = useState(editing?.amount?.toString() || '')
  const [cat, setCat] = useState(editing?.category || 'other')
  const [desc, setDesc] = useState(editing?.description || '')
  const [receipt, setReceipt] = useState('')
  const [receiptName, setReceiptName] = useState('')
  const [receiptMime, setReceiptMime] = useState('')
  const [viewing, setViewing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    const b64 = await new Promise<string>(res => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(file) })
    setReceipt(b64); setReceiptName(file.name); setReceiptMime(file.type)
  }

  const [saving, setSaving] = useState(false)
  const save = async () => {
    if (!amount) { showToast('Amount required', false); return }
    setSaving(true)
    await onSave({ date, amount: parseFloat(amount), category: cat, description: desc, receiptData: receipt, receiptName, receiptMime })
    setSaving(false)
    onClose()
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title={editing ? "Edit Expense" : "Add Expense"}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
          <Input label="Amount (€) *" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
        </div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '4px' }}>Category</div>
          <select value={cat} onChange={e => setCat(e.target.value)} style={{ width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid #1E1E2E', color: '#E8E0F0', borderRadius: '8px', padding: '10px', fontFamily: 'inherit', fontSize: '13px', outline: 'none', marginBottom: '8px' }}>
            {Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <Textarea label="Description" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Uber, lunch, equipment..." style={{ minHeight: '50px' }} />
        <div style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '6px' }}>🧾 Receipt</div>
          {!receipt ? (
            <>
              <input ref={fileRef} type="file" accept="image/*,.pdf" capture="environment" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
              <button onClick={() => fileRef.current?.click()} style={{ width: '100%', background: '#12121A', border: '1px dashed rgba(201,168,76,.3)', color: '#5A5570', borderRadius: '10px', padding: '11px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px' }}>📷 Take photo / Upload</button>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#12121A', border: '1px solid rgba(201,168,76,.2)', borderRadius: '10px', padding: '10px 12px' }}>
              <span style={{ fontSize: '20px' }}>{receiptMime?.startsWith('image') ? '🖼' : '📄'}</span>
              <span style={{ flex: 1, fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{receiptName}</span>
              <button onClick={() => setViewing(true)} style={{ background: '#C9A84C', border: 'none', color: '#0A0A0F', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', fontWeight: 800 }}>View</button>
              <button onClick={() => { setReceipt(''); setReceiptName(''); setReceiptMime('') }} style={{ background: 'none', border: 'none', color: '#E8453C', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
          <Button onClick={save} disabled={saving} style={{ flex: 2 }}>{saving ? 'Saving...' : editing ? 'Save' : 'Add'}</Button>
        </div>
      </Modal>
      {viewing && receipt && (
        <div onClick={() => setViewing(false)} style={{ position: 'fixed', inset: 0, zIndex: 700, background: 'rgba(0,0,0,.97)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '600px', marginBottom: '12px' }}>
            <div style={{ fontWeight: 700, color: 'white' }}>{receiptName}</div>
            <button onClick={() => setViewing(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '28px', cursor: 'pointer' }}>✕</button>
          </div>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '600px' }}>
            {receipt.startsWith('data:image') && <img src={receipt} alt="" style={{ width: '100%', borderRadius: '12px', maxHeight: '80vh', objectFit: 'contain' }} />}
            {receipt.startsWith('data:application/pdf') && <iframe src={receipt} style={{ width: '100%', height: '80vh', border: 'none', borderRadius: '12px' }} />}
          </div>
        </div>
      )}
    </>
  )
}

function ExpensesSection({ showId, memberId, tourId, showDate, expenses, onRefresh }: any) {
  const [showAdd, setShowAdd] = useState(false)
  const [editingExpense, setEditingExpense] = useState<any>(null)
  const [viewingReceipt, setViewingReceipt] = useState<any>(null)
  const total = expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0)

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ fontSize: '12px', color: '#5A5570' }}>{expenses.length} expenses · €{total.toFixed(2)}</div>
        <Button size="sm" onClick={() => { setEditingExpense(null); setShowAdd(true) }}>+ Expense</Button>
      </div>
      {expenses.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#5A5570', fontSize: '13px', padding: '24px', background: '#12121A', borderRadius: '12px', marginBottom: '12px' }}>No expenses yet</div>
      ) : expenses.map((e: any) => (
        <Card key={e.id} style={{ marginBottom: '8px', padding: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <div style={{ fontSize: '20px', marginTop: '2px' }}>{(CATS[e.category] || CATS.other).split(' ')[0]}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '13px' }}>{e.description || CATS[e.category]}</div>
              <div style={{ fontSize: '11px', color: '#5A5570' }}>{e.date}</div>
              {e.receipt_data && (
                <button onClick={() => setViewingReceipt({ src: e.receipt_data, name: e.receipt_name || 'Receipt' })} style={{ marginTop: '6px', background: 'rgba(201,168,76,.1)', border: '1px solid rgba(201,168,76,.2)', color: '#C9A84C', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', fontWeight: 700 }}>
                  🧾 View receipt
                </button>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 800, color: '#C9A84C', fontSize: '14px' }}>€{(e.amount || 0).toFixed(2)}</div>
              <button onClick={() => { setEditingExpense(e); setShowAdd(true) }} style={{ background: 'none', border: '1px solid #1F1F2E', color: '#5A5570', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', marginTop: '4px' }}>✏</button>
              <button onClick={async () => { if (!confirm('Delete expense?')) return; await api('delete_expense', { expenseId: e.id }); onRefresh() }} style={{ background: 'none', border: 'none', color: '#E8453C', cursor: 'pointer', fontSize: '16px', marginTop: '4px' }}>✕</button>
            </div>
          </div>
        </Card>
      ))}
      <ExpenseAddModal key={editingExpense?.id || (showAdd ? 'new-open' : 'closed')} open={showAdd} onClose={() => { setShowAdd(false); setEditingExpense(null) }} showDate={showDate} editing={editingExpense} onSave={async (e: any) => {
        if (editingExpense) {
          await api('update_expense', { expenseId: editingExpense.id, ...e })
        } else {
          await api('add_expense', { showId, memberId, tourId, ...e })
        }
        onRefresh()
      }} />
      {viewingReceipt && (
        <div onClick={() => setViewingReceipt(null)} style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,.97)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '600px', marginBottom: '12px' }}>
            <div style={{ fontWeight: 700, color: 'white' }}>{viewingReceipt.name}</div>
            <button onClick={() => setViewingReceipt(null)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '28px', cursor: 'pointer' }}>✕</button>
          </div>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '600px' }}>
            {viewingReceipt.src.startsWith('data:image') && <img src={viewingReceipt.src} alt="" style={{ width: '100%', borderRadius: '12px', maxHeight: '80vh', objectFit: 'contain' }} />}
            {viewingReceipt.src.startsWith('data:application/pdf') && <iframe src={viewingReceipt.src} style={{ width: '100%', height: '80vh', border: 'none', borderRadius: '12px' }} />}
          </div>
        </div>
      )}
    </>
  )
}

// ─── Message Input ─────────────────────────────────────────────────────────
function MessageInput({ onSend }: { onSend: (msg: string) => Promise<void> }) {
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)
  const send = async () => {
    if (!msg.trim()) return
    setSending(true)
    await onSend(msg)
    setMsg('')
    setSending(false)
  }
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <input value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && !sending && send()}
        placeholder="Type a message..." style={{ flex: 1, background: 'rgba(255,255,255,.04)', border: '1px solid #1E1E2E', color: '#E8E0F0', borderRadius: '10px', padding: '10px 12px', fontFamily: 'inherit', fontSize: '13px', outline: 'none' }} />
      <button onClick={send} disabled={sending} style={{ background: '#C9A84C', border: 'none', color: '#0A0A0F', borderRadius: '10px', padding: '10px 16px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: '13px', opacity: sending ? 0.6 : 1 }}>
        {sending ? '...' : 'Send'}
      </button>
    </div>
  )
}

// ─── Ticket Upload Component ───────────────────────────────────────────────
function TicketUpload({ showId, memberId, tourId, tickets, onRefresh }: any) {
  const outRef = useRef<HTMLInputElement>(null)
  const retRef = useRef<HTMLInputElement>(null)
  const [scanning, setScanning] = useState<'out' | 'ret' | null>(null)
  const [viewing, setViewing] = useState<any>(null)

  const outTickets = tickets.filter((t: any) => t.direction === 'out')
  const retTickets = tickets.filter((t: any) => t.direction === 'ret')

  const handleFile = async (file: File, direction: 'out' | 'ret') => {
    const b64 = await new Promise<string>(res => {
      const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(file)
    })
    setScanning(direction)
    const info = await extractTicket(b64, file.type)
    await api('upload_ticket', { showId, memberId, tourId, direction, ticketData: b64, ticketName: file.name, ticketMime: file.type, info })
    setScanning(null)
    showToast('Ticket added ✓')
    onRefresh()
  }

  const TicketCard = ({ t, color }: any) => (
    <div style={{ background: '#0A0A0F', border: `1px solid ${color}25`, borderRadius: '10px', padding: '10px 12px', marginBottom: '6px' }}>
      {t.info?.date && <div style={{ fontSize: '11px', color: '#5A5570' }}>📅 {t.info.date}</div>}
      {(t.info?.from || t.info?.to) && <div style={{ fontSize: '14px', fontWeight: 800 }}>{t.info.from || '?'} → {t.info.to || '?'}</div>}
      {t.info?.time && <div style={{ fontSize: '11px', color: '#5A5570' }}>🕐 {t.info.time}{t.info.ref ? ` · ${t.info.ref}` : ''}</div>}
      {!t.info?.from && !t.info?.to && <div style={{ fontSize: '12px', color: '#5A5570' }}>{t.ticket_name}</div>}
      <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
        <button onClick={() => setViewing(t)} style={{ flex: 1, background: color, border: 'none', color: '#0A0A0F', borderRadius: '8px', padding: '7px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 800 }}>📱 Show</button>
        <button onClick={async () => { if (!confirm('Delete this ticket?')) return; await api('delete_ticket', { ticketId: t.id }); onRefresh() }} style={{ background: 'none', border: `1px solid #E8453C`, color: '#E8453C', borderRadius: '8px', padding: '7px 10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px' }}>🗑 Delete</button>
      </div>
    </div>
  )

  return (
    <>
      <input ref={outRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0], 'out')} />
      <input ref={retRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0], 'ret')} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 800, color: '#C9A84C', letterSpacing: '.1em', marginBottom: '8px' }}>✈ OUTBOUND</div>
          {outTickets.map((t: any) => <TicketCard key={t.id} t={t} color="#C9A84C" />)}
          <button onClick={() => outRef.current?.click()} style={{ width: '100%', background: '#0A0A0F', border: '1px dashed rgba(201,168,76,.3)', color: '#5A5570', borderRadius: '10px', padding: '10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px' }}>
            {scanning === 'out' ? '🤖 Reading...' : '+ Add ticket'}
          </button>
        </div>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 800, color: '#5DC9A0', letterSpacing: '.1em', marginBottom: '8px' }}>🔄 RETURN</div>
          {retTickets.map((t: any) => <TicketCard key={t.id} t={t} color="#5DC9A0" />)}
          <button onClick={() => retRef.current?.click()} style={{ width: '100%', background: '#0A0A0F', border: '1px dashed rgba(93,201,160,.3)', color: '#5A5570', borderRadius: '10px', padding: '10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px' }}>
            {scanning === 'ret' ? '🤖 Reading...' : '+ Add ticket'}
          </button>
        </div>
      </div>

      {viewing && (
        <div onClick={() => setViewing(null)} style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,.97)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '600px', marginBottom: '12px' }}>
            <div style={{ fontWeight: 700, color: 'white' }}>{viewing.ticket_name}</div>
            <button onClick={() => setViewing(null)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '28px', cursor: 'pointer' }}>✕</button>
          </div>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '600px' }}>
            {viewing.ticket_data?.startsWith('data:image') && <img src={viewing.ticket_data} alt="" style={{ width: '100%', borderRadius: '12px', maxHeight: '80vh', objectFit: 'contain' }} />}
            {viewing.ticket_data?.startsWith('data:application/pdf') && <iframe src={viewing.ticket_data} style={{ width: '100%', height: '80vh', border: 'none', borderRadius: '12px' }} />}
          </div>
        </div>
      )}
    </>
  )
}

// ─── Modals ────────────────────────────────────────────────────────────────
function TourModal({ open, onClose, editing, onSaved }: any) {
  const [name, setName] = useState(editing?.name || '')
  const [notes, setNotes] = useState(editing?.notes || '')
  const [saving, setSaving] = useState(false)
  const save = async () => {
    if (!name.trim()) { showToast('Tour name required', false); return }
    setSaving(true)
    if (editing) await api('update_tour', { tourId: editing.id, name, notes })
    else await api('create_tour', { name, notes })
    showToast(editing ? 'Updated' : 'Tour created ✓')
    setSaving(false); onSaved(); onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Tour' : 'New Tour'}>
      <Input label="Tour name *" value={name} onChange={e => setName(e.target.value)} placeholder="Vincent Dedienne — Été 2026" />
      <Textarea label="Notes" value={notes} onChange={e => setNotes(e.target.value)} style={{ minHeight: '50px' }} />
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
        <Button onClick={save} disabled={saving} style={{ flex: 2 }}>{saving ? 'Saving...' : 'Save'}</Button>
      </div>
    </Modal>
  )
}

function ShowModal({ open, onClose, tourId, editing, onSaved }: any) {
  const [date, setDate] = useState(editing?.date || '')
  const [venue, setVenue] = useState(editing?.venue || '')
  const [city, setCity] = useState(editing?.city || '')
  const [notes, setNotes] = useState(editing?.notes || '')
  const [saving, setSaving] = useState(false)
  const save = async () => {
    if (!date) { showToast('Date required', false); return }
    setSaving(true)
    if (editing) await api('update_show', { showId: editing.id, date, venue, city, notes })
    else await api('add_show', { tourId, date, venue, city, notes })
    showToast('Saved ✓')
    setSaving(false); onSaved(); onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Show' : 'Add Show'}>
      <Input label="Date *" type="date" value={date} onChange={e => setDate(e.target.value)} />
      <Input label="Venue" value={venue} onChange={e => setVenue(e.target.value)} placeholder="Théâtre du Châtelet" />
      <Input label="City" value={city} onChange={e => setCity(e.target.value)} placeholder="Paris" />
      <Textarea label="Notes" value={notes} onChange={e => setNotes(e.target.value)} style={{ minHeight: '50px' }} />
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
        <Button onClick={save} disabled={saving} style={{ flex: 2 }}>{saving ? 'Saving...' : 'Save'}</Button>
      </div>
    </Modal>
  )
}

function MemberModal({ open, onClose, tourId, editing, onSaved }: any) {
  const parsed = parsePhone(editing?.phone || '')
  const [name, setName] = useState(editing?.name || '')
  const [role, setRole] = useState(editing?.role || '')
  const [email, setEmail] = useState(editing?.email || '')
  const [prefix, setPrefix] = useState(parsed.prefix)
  const [phoneNum, setPhoneNum] = useState(parsed.number)
  const [notes, setNotes] = useState(editing?.notes || '')
  const [saving, setSaving] = useState(false)
  const save = async () => {
    if (!name.trim()) { showToast('Name required', false); return }
    setSaving(true)
    const phone = phoneNum ? prefix + phoneNum.replace(/^0/, '') : ''
    if (editing) await api('update_member', { memberId: editing.id, name, role, email, phone, notes })
    else await api('add_member', { tourId, name, role, email, phone, notes })
    showToast(editing ? 'Updated ✓' : `${name} added ✓`)
    setSaving(false); onSaved(); onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Member' : 'Add Member'}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Input label="Name *" value={name} onChange={e => setName(e.target.value)} placeholder="Jean Dupont" />
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '4px' }}>Role</div>
          <select value={role} onChange={e => setRole(e.target.value)} style={{ width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid #1E1E2E', color: role ? '#E8E0F0' : '#5A5570', borderRadius: '8px', padding: '10px', fontFamily: 'inherit', fontSize: '13px', outline: 'none' }}>
            <option value="">Select...</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>
      <Input label="Email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jean@email.com" />
      <div>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '4px' }}>📱 Phone / WhatsApp</div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <select value={prefix} onChange={e => setPrefix(e.target.value)} style={{ background: 'rgba(255,255,255,.04)', border: '1px solid #1E1E2E', color: '#E8E0F0', borderRadius: '8px', padding: '10px 6px', fontFamily: 'inherit', fontSize: '12px', flexShrink: 0 }}>
            {PHONE_PREFIXES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <input value={phoneNum} onChange={e => setPhoneNum(e.target.value)} placeholder="6 12 34 56" style={{ flex: 1, background: 'rgba(255,255,255,.04)', border: '1px solid #1E1E2E', color: '#E8E0F0', borderRadius: '8px', padding: '10px', fontFamily: 'inherit', fontSize: '14px', outline: 'none' }} />
        </div>
      </div>
      <Textarea label="Notes" value={notes} onChange={e => setNotes(e.target.value)} style={{ minHeight: '50px', marginTop: '8px' }} />
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
        <Button onClick={save} disabled={saving} style={{ flex: 2 }}>{saving ? 'Saving...' : 'Save'}</Button>
      </div>
    </Modal>
  )
}

function HotelModal({ open, onClose, showId, memberId, tourId, existing, onSaved }: any) {
  const [hotel, setHotel] = useState(existing?.hotel || '')
  const [room, setRoom] = useState(existing?.room || '')
  const [hotelAddr, setHotelAddr] = useState(existing?.hotel_addr || '')
  const [notes, setNotes] = useState(existing?.notes || '')
  const [saving, setSaving] = useState(false)
  const save = async () => {
    setSaving(true)
    await api('save_show_member', { showId, memberId, tourId, hotel, room, hotelAddr, notes })
    showToast('Hotel saved ✓')
    setSaving(false); onSaved(); onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title="🏨 Hotel details">
      <Input label="Hotel name" value={hotel} onChange={e => setHotel(e.target.value)} placeholder="Hôtel du Palais" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px' }}>
        <Input label="Room" value={room} onChange={e => setRoom(e.target.value)} placeholder="214" />
        <Input label="Address" value={hotelAddr} onChange={e => setHotelAddr(e.target.value)} placeholder="12 rue..." />
      </div>
      <Textarea label="Notes" value={notes} onChange={e => setNotes(e.target.value)} style={{ minHeight: '50px' }} />
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
        <Button onClick={save} disabled={saving} style={{ flex: 2 }}>{saving ? 'Saving...' : 'Save'}</Button>
      </div>
    </Modal>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────
type Screen = 'tours' | 'tour' | 'show' | 'member'

export default function ManagerPage() {
  const [screen, setScreen] = useState<Screen>('tours')
  const [tours, setTours] = useState<any[]>([])
  const [shows, setShows] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [showMembers, setShowMembers] = useState<any[]>([])
  const [tickets, setTickets] = useState<any[]>([])

  const [messages, setMessages] = useState<any[]>([])
  const [showDocs, setShowDocs] = useState<any[]>([])
  const [showMessages, setShowMessages] = useState<any[]>([])
  const [showInfoTab, setShowInfoTab] = useState<'hotel'|'transfers'|'meals'|'planning'|'technique'|'documents'|'chat'>('hotel')
  const [guests, setGuests] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [memberTab, setMemberTab] = useState<'hotel'|'tickets'|'guests'|'expenses'|'messages'>('hotel')

  const switchMemberTab = (t: 'hotel'|'tickets'|'guests'|'expenses'|'messages') => {
    setMemberTab(t)
  }

  const [selTour, setSelTour] = useState<any>(null)
  const [selShow, setSelShow] = useState<any>(null)
  const [selMember, setSelMember] = useState<any>(null)
  const [tab, setTab] = useState<'shows' | 'team'>('shows')

  const [showTourModal, setShowTourModal] = useState(false)
  const [showShowModal, setShowShowModal] = useState(false)
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [showHotelModal, setShowHotelModal] = useState(false)
  const [editingTour, setEditingTour] = useState<any>(null)
  const [editingShow, setEditingShow] = useState<any>(null)
  const [editingMember, setEditingMember] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const firstShowDate = shows.length > 0 ? new Date(shows[0].date + 'T12:00:00') : new Date()
  const [calY, setCalY] = useState(firstShowDate.getFullYear())
  const [calM, setCalM] = useState(firstShowDate.getMonth())
  const [importing, setImporting] = useState(false)
  const [showsView, setShowsView] = useState<'list'|'calendar'>('calendar')
  const importRef = useRef<HTMLInputElement>(null)

  const load = async (params: Record<string, string> = {}) => {
    const data = await loadData(params)
    if (data.tours) setTours(data.tours)
    if (data.shows) setShows(data.shows)
    if (data.members) setMembers(data.members)
    if (data.showMembers) setShowMembers(data.showMembers)
    if (data.tickets) setTickets(data.tickets)
    if (data.memberTickets) setTickets(data.memberTickets)
    if (data.showDocs) setShowDocs(data.showDocs)
    if (data.showMessages) setShowMessages(data.showMessages)
    if (data.messages) setMessages(data.messages)
    if (data.guests) setGuests(data.guests)
    if (data.expenses) setExpenses(data.expenses)
    setLoading(false)
  }

  const [plan, setPlan] = useState<string | null>(null)

  useEffect(() => {
    const token = getToken()
    if (!token) return
    fetch('/api/plan', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setPlan(d.plan || 'solo'))
      .catch(() => setPlan('solo'))
  }, [])

  useEffect(() => { load() }, [])

  const goTours = () => { setScreen('tours'); setSelTour(null); setSelShow(null); setSelMember(null); load() }
  const goTour = async (tour: any) => { setSelTour(tour); setSelShow(null); setSelMember(null); setScreen('tour'); await load({ tourId: tour.id }) }
  const goShow = async (show: any) => { setSelShow(show); setSelMember(null); setScreen('show'); await load({ tourId: selTour.id, showId: show.id }) }
  const goMember = async (member: any) => { setSelMember(member); setScreen('member'); setMemberTab('hotel'); await load({ tourId: selTour.id, showId: selShow.id, memberId: member.id }) }

  const handleImport = async (file: File) => {
    const b64 = await new Promise<string>(res => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(file) })
    setImporting(true)
    const extracted = await extractShows(b64, file.type)
    if (Array.isArray(extracted) && extracted.length > 0) {
      await api('add_shows_bulk', { tourId: selTour.id, shows: extracted })
      showToast(`${extracted.length} shows imported ✓`)
      await load({ tourId: selTour.id })
    } else {
      showToast('No shows found — add manually', false)
    }
    setImporting(false)
  }

  const memberTickets = tickets.filter((t: any) => t.member_id === selMember?.id)
  const showMemberData = showMembers.find((sm: any) => sm.member_id === selMember?.id)
  const tourShows = shows.filter(s => s.tour_id === selTour?.id)
  const tourMembers = members.filter(m => m.tour_id === selTour?.id)

  // ── Breadcrumb ──────────────────────────────────────────────────────────
  const Breadcrumb = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 16px', marginBottom: '12px', fontSize: '12px', color: '#5A5570', flexWrap: 'wrap' }}>
      <span onClick={goTours} style={{ cursor: 'pointer', color: screen !== 'tours' ? '#C9A84C' : '#E8E0F0' }}>Tours</span>
      {selTour && <>
        <span>›</span>
        <span onClick={() => goTour(selTour)} style={{ cursor: 'pointer', color: screen === 'tour' ? '#E8E0F0' : '#C9A84C' }}>{selTour.name}</span>
      </>}
      {selShow && <>
        <span>›</span>
        <span onClick={() => goShow(selShow)} style={{ cursor: 'pointer', color: screen === 'show' ? '#E8E0F0' : '#C9A84C' }}>{selShow.date}{selShow.city ? ` · ${selShow.city}` : ''}</span>
      </>}
      {selMember && <>
        <span>›</span>
        <span style={{ color: '#E8E0F0' }}>{selMember.name}</span>
      </>}
    </div>
  )

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#5A5570' }}>Loading...</div>

  if (plan !== null && plan !== 'manager') return (
    <div style={{ padding: '0 16px' }}>
      <Toolbar title="Manager" />
      <div style={{ textAlign: 'center', padding: '40px 16px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎪</div>
        <div style={{ fontWeight: 800, fontSize: '18px', marginBottom: '8px' }}>Manager plan required</div>
        <div style={{ fontSize: '13px', color: '#5A5570', marginBottom: '24px', lineHeight: 1.6 }}>
          The Manager Tour Sheet is available on the Manager plan.<br />Upgrade to manage your team's travel, hotel and tickets.
        </div>
        <a href="/app2/pricing" style={{ background: '#C9A84C', color: '#0A0A0F', borderRadius: '12px', padding: '12px 24px', fontWeight: 800, fontSize: '14px', textDecoration: 'none', display: 'inline-block' }}>
          Upgrade to Manager →
        </a>
      </div>
    </div>
  )

  return (
    <div style={{ padding: '0 0 100px' }}>
      {/* ── SCREEN 1: Tours ── */}
      {screen === 'tours' && (
        <>
          <Toolbar title="Manager" actions={<Button size="sm" onClick={() => { setEditingTour(null); setShowTourModal(true) }}>+ Tour</Button>} />
          <div style={{ padding: '0 16px' }}>
            {tours.length === 0 ? (
              <EmptyState icon="🎪" title="No tours yet" sub="Create a tour to manage your team's travel, hotel and tickets." />
            ) : tours.map(t => (
              <div key={t.id} onClick={() => goTour(t)} style={{ cursor: 'pointer' }}><Card style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '15px' }}>{t.name}</div>
                    {t.notes && <div style={{ fontSize: '12px', color: '#5A5570', marginTop: '2px' }}>{t.notes}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button onClick={e => { e.stopPropagation(); setEditingTour(t); setShowTourModal(true) }} style={{ background: 'none', border: '1px solid #1F1F2E', color: '#5A5570', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px' }}>✏</button>
                    <button onClick={async e => { e.stopPropagation(); if (!confirm('Delete tour?')) return; await api('delete_tour', { tourId: t.id }); load() }} style={{ background: 'none', border: '1px solid #E8453C', color: '#E8453C', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px' }}>✕</button>
                    <span style={{ color: '#5A5570', fontSize: '18px' }}>›</span>
                  </div>
                </div>
              </Card></div>
            ))}
          </div>
        </>
      )}

      {/* ── SCREEN 2: Tour → Shows | Team ── */}
      {screen === 'tour' && selTour && (
        <>
          <Toolbar title={selTour.name} actions={<Button size="sm" onClick={() => { setEditingTour(selTour); setShowTourModal(true) }}>✏ Edit</Button>} />
          <Breadcrumb />
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px', padding: '0 16px', marginBottom: '16px' }}>
            {(['shows', 'team'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: `2px solid ${tab === t ? '#C9A84C' : '#1F1F2E'}`, background: tab === t ? 'rgba(201,168,76,.1)' : '#12121A', color: tab === t ? '#C9A84C' : '#5A5570', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: '13px' }}>
                {t === 'shows' ? `📅 Shows (${tourShows.length})` : `👥 Team (${tourMembers.length})`}
              </button>
            ))}
          </div>

          <div style={{ padding: '0 16px' }}>
            {tab === 'shows' && (
              <>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <input ref={importRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleImport(e.target.files[0])} />
                  <button onClick={() => importRef.current?.click()} style={{ flex: 1, background: '#12121A', border: '1px solid #1F1F2E', color: '#5A5570', borderRadius: '10px', padding: '10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 700 }}>
                    {importing ? '🤖 Reading...' : '📄 Import PDF/photo'}
                  </button>
                  <button onClick={() => { setEditingShow(null); setShowShowModal(true) }} style={{ flex: 1, background: '#C9A84C', border: 'none', color: '#0A0A0F', borderRadius: '10px', padding: '10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 800 }}>+ Add show</button>
                </div>
                {/* View toggle */}
                {tourShows.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                    {(['list', 'calendar'] as const).map(v => (
                      <button key={v} onClick={() => setShowsView(v)} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: `1px solid ${showsView === v ? '#C9A84C' : '#1F1F2E'}`, background: showsView === v ? 'rgba(201,168,76,.1)' : '#12121A', color: showsView === v ? '#C9A84C' : '#5A5570', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 700 }}>
                        {v === 'list' ? '📅 Agenda' : '🗓 Calendar'}
                      </button>
                    ))}
                  </div>
                )}

                {showsView === 'calendar' && (() => {
                  const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
                  const MONTHS_CAL = ['January','February','March','April','May','June','July','August','September','October','November','December']
                  const totalDays = new Date(calY, calM + 1, 0).getDate()
                  const firstDay = new Date(calY, calM, 1).getDay()
                  const todayStr = new Date().toISOString().slice(0, 10)
                  const pad = (n: number) => String(n).padStart(2, '0')
                  return (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <button onClick={() => { if (calM === 0) { setCalY(calY-1); setCalM(11) } else setCalM(calM-1) }} style={{ background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '16px' }}>‹</button>
                        <div style={{ flex: 1, textAlign: 'center', fontWeight: 900, fontSize: '16px' }}>{MONTHS_CAL[calM]} <span style={{ color: '#C9A84C' }}>{calY}</span></div>
                        <button onClick={() => { if (calM === 11) { setCalY(calY+1); setCalM(0) } else setCalM(calM+1) }} style={{ background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '16px' }}>›</button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '4px' }}>
                        {DAYS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: '10px', fontWeight: 700, color: '#5A5570', padding: '4px 0' }}>{d}</div>)}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                        {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                        {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => {
                          const ds = `${calY}-${pad(calM+1)}-${pad(day)}`
                          const dayShows = tourShows.filter((s: any) => s.date === ds)
                          const isToday = ds === todayStr
                          const hasShow = dayShows.length > 0
                          return (
                            <div key={day} onClick={() => { if (hasShow) goShow(dayShows[0]) }}
                              style={{ minHeight: '48px', padding: '4px', borderRadius: '8px', cursor: hasShow ? 'pointer' : 'default', background: isToday ? 'rgba(201,168,76,.1)' : hasShow ? 'rgba(93,201,160,.06)' : 'transparent', border: isToday ? '1px solid rgba(201,168,76,.3)' : hasShow ? '1px solid rgba(93,201,160,.2)' : '1px solid transparent' }}>
                              <div style={{ fontSize: '12px', fontWeight: isToday ? 900 : 400, color: isToday ? '#C9A84C' : '#E8E0F0', textAlign: 'center', marginBottom: '2px' }}>{day}</div>
                              {dayShows.map((s: any) => (
                                <div key={s.id} style={{ fontSize: '9px', background: '#5DC9A0', color: '#0A0A0F', borderRadius: '3px', padding: '1px 3px', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {s.city || s.venue || '●'}
                                </div>
                              ))}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}

                {(showsView === 'list' || tourShows.length === 0) && (
                <>
                {tourShows.length === 0 ? (
                  <EmptyState icon="📅" title="No shows yet" sub="Import a PDF planning or add shows manually." />
                ) : (() => {
                  const byMonth: Record<string, any[]> = {}
                  for (const s of tourShows) {
                    const month = s.date?.slice(0, 7) || 'Unknown'
                    if (!byMonth[month]) byMonth[month] = []
                    byMonth[month].push(s)
                  }
                  return Object.entries(byMonth).map(([month, mShows]) => (
                    <div key={month} style={{ marginBottom: '20px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '8px' }}>
                        {new Date(month + '-01T12:00:00').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                      </div>
                      {mShows.map((s: any) => (
                        <div key={s.id} style={{ display: 'flex', gap: '0', marginBottom: '8px' }}>
                          <div onClick={() => goShow(s)} style={{ display: 'flex', flex: 1, gap: '12px', alignItems: 'center', padding: '12px', background: '#12121A', border: '1px solid #1F1F2E', borderRadius: '10px 0 0 10px', cursor: 'pointer' }}>
                            <div style={{ textAlign: 'center', minWidth: '40px' }}>
                              <div style={{ fontSize: '22px', fontWeight: 900, color: '#C9A84C', lineHeight: 1 }}>{s.date?.slice(8, 10)}</div>
                              <div style={{ fontSize: '9px', color: '#5A5570', textTransform: 'uppercase', marginTop: '2px' }}>
                                {new Date(s.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short' })}
                              </div>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 800, fontSize: '14px' }}>{s.venue || 'Show'}</div>
                              {s.city && <div style={{ fontSize: '12px', color: '#5A5570' }}>📍 {s.city}</div>}
                              {s.notes && <div style={{ fontSize: '11px', color: '#5A5570', fontStyle: 'italic' }}>{s.notes}</div>}
                            </div>
                            <span style={{ color: '#5A5570' }}>›</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <button onClick={e => { e.stopPropagation(); setEditingShow(s); setShowShowModal(true) }} style={{ flex: 1, background: '#1A1A28', border: '1px solid #1F1F2E', borderLeft: 'none', color: '#5A5570', padding: '0 10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', borderRadius: '0' }}>✏</button>
                            <button onClick={async e => { e.stopPropagation(); if (!confirm('Delete show?')) return; await api('delete_show', { showId: s.id }); load({ tourId: selTour.id }) }} style={{ flex: 1, background: '#1A1A28', border: '1px solid #1F1F2E', borderLeft: 'none', borderTop: 'none', color: '#E8453C', padding: '0 10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', borderRadius: '0 10px 10px 0' }}>✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                })()}
                </>
                )}
              </>
            )}

            {tab === 'team' && (
              <>
                <Button size="sm" onClick={() => { setEditingMember(null); setShowMemberModal(true) }} style={{ marginBottom: '12px', width: '100%' }}>+ Add member</Button>
                {tourMembers.length === 0 ? (
                  <EmptyState icon="👥" title="No team members yet" sub="Add the musicians, technicians and crew." />
                ) : tourMembers.map(m => (
                  <Card key={m.id} style={{ marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '14px' }}>{m.name}</div>
                        {m.role && <div style={{ fontSize: '11px', color: '#C9A84C', fontWeight: 700 }}>{m.role}</div>}
                        {m.email && <div style={{ fontSize: '11px', color: '#5A5570' }}>✉ {m.email}</div>}
                        {m.phone && <div style={{ fontSize: '11px', color: '#5A5570' }}>📱 {m.phone}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => { setEditingMember(m); setShowMemberModal(true) }} style={{ background: 'none', border: '1px solid #1F1F2E', color: '#5A5570', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px' }}>✏</button>
                        <button onClick={async () => { if (!confirm(`Remove ${m.name}?`)) return; await api('delete_member', { memberId: m.id }); load({ tourId: selTour.id }) }} style={{ background: 'none', border: '1px solid #E8453C', color: '#E8453C', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px' }}>✕</button>
                      </div>
                    </div>
                  </Card>
                ))}
              </>
            )}
          </div>
        </>
      )}

      {/* ── SCREEN 3: Show → Shared info + Members ── */}
      {screen === 'show' && selShow && (
        <>
          <Toolbar title={selShow.venue || selShow.date} actions={<Button size="sm" onClick={() => { setEditingShow(selShow); setShowShowModal(true) }}>✏ Edit</Button>} />
          <Breadcrumb />
          <div style={{ padding: '0 16px' }}>
            <div style={{ background: 'rgba(201,168,76,.06)', border: '1px solid rgba(201,168,76,.15)', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px' }}>
              <div style={{ fontWeight: 800, fontSize: '15px' }}>{selShow.venue}</div>
              <div style={{ fontSize: '12px', color: '#5A5570' }}>📅 {selShow.date}{selShow.city ? ` · ${selShow.city}` : ''}</div>
              {selShow.notes && <div style={{ fontSize: '12px', color: '#5A5570', marginTop: '4px', fontStyle: 'italic' }}>{selShow.notes}</div>}
            </div>

            {/* Shared info tabs */}
            <div style={{ overflowX: 'auto', marginBottom: '12px', paddingBottom: '4px' }}>
              <div style={{ display: 'flex', gap: '6px', width: 'max-content' }}>
                {([['hotel','🏨','Hébergement'],['transfers','🚌','Transfers'],['meals','🍽','Repas'],['planning','📅','Planning'],['technique','🎛','Technique'],['documents','📄','Documents'],['chat','💬','Chat']] as const).map(([t, icon, label]) => (
                  <button key={t} onClick={() => setShowInfoTab(t)} style={{ flexShrink: 0, padding: '8px 14px', borderRadius: '20px', border: `1px solid ${showInfoTab === t ? '#C9A84C' : '#1F1F2E'}`, background: showInfoTab === t ? 'rgba(201,168,76,.1)' : '#12121A', color: showInfoTab === t ? '#C9A84C' : '#5A5570', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {icon} {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            {showInfoTab !== 'documents' && showInfoTab !== 'chat' && (
              <ShowInfoSection show={selShow} field={showInfoTab} onSave={async (updates: any) => {
                await api('update_show_info', { showId: selShow.id, ...selShow, ...updates })
                setSelShow({ ...selShow, ...updates })
                showToast('Saved ✓')
              }} />
            )}
            {showInfoTab === 'documents' && (
              <ShowDocuments showId={selShow.id} tourId={selTour.id} docs={showDocs} onRefresh={async () => {
                const data = await loadData({ tourId: selTour.id, showId: selShow.id })
                if (data.showDocs) setShowDocs(data.showDocs)
              }} />
            )}
            {showInfoTab === 'chat' && (
              <ShowChat showId={selShow.id} tourId={selTour.id} messages={showMessages} onSend={async (msg: string) => {
                const newMsg = { id: Math.random().toString(36).slice(2), is_manager: true, sender_name: 'Manager', message: msg, created_at: new Date().toISOString() }
                setShowMessages((prev: any[]) => [...prev, newMsg])
                await api('send_show_message', { showId: selShow.id, tourId: selTour.id, message: msg, isManager: true, senderName: 'Manager' })
              }} />
            )}

            {/* Members */}
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.1em', margin: '16px 0 10px' }}>
              👥 Team
            </div>
            {tourMembers.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#5A5570', fontSize: '13px', padding: '20px', background: '#12121A', borderRadius: '12px' }}>
                Add team members in the Team tab first
              </div>
            ) : tourMembers.map((m: any) => {
              const sm = showMembers.find((sm: any) => sm.member_id === m.id)
              const memberTix = tickets.filter((t: any) => t.member_id === m.id)
              return (
                <div key={m.id} onClick={() => goMember(m)} style={{ cursor: 'pointer' }}><Card style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '14px' }}>{m.name}</div>
                      {m.role && <div style={{ fontSize: '11px', color: '#C9A84C' }}>{m.role}</div>}
                      {sm?.hotel && <div style={{ fontSize: '11px', color: '#5A5570' }}>🏨 {sm.hotel}{sm.room ? ` · Room ${sm.room}` : ''}</div>}
                      <div style={{ fontSize: '11px', color: memberTix.length === 0 ? '#E8453C' : '#5A5570', marginTop: '2px' }}>
                        {memberTix.length === 0 ? 'No tickets yet' : `✈ ${memberTix.filter((t: any) => t.direction === 'out').length} out · 🔄 ${memberTix.filter((t: any) => t.direction === 'ret').length} ret`}
                      </div>
                    </div>
                    <span style={{ color: '#5A5570', fontSize: '18px' }}>›</span>
                  </div>
                </Card></div>
              )
            })}
          </div>
        </>
      )}


      {/* ── SCREEN 4: Member detail ── */}
      {screen === 'member' && selMember && selShow && (
        <>
          <Toolbar title={selMember.name} />
          <Breadcrumb />
          <div style={{ padding: '0 16px' }}>
            {/* Member info */}
            <Card style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '15px' }}>{selMember.name}</div>
                  {selMember.role && <div style={{ fontSize: '12px', color: '#C9A84C', fontWeight: 700 }}>{selMember.role}</div>}
                  {selMember.email && <div style={{ fontSize: '12px', color: '#5A5570' }}>✉ {selMember.email}</div>}
                  {selMember.phone && <div style={{ fontSize: '12px', color: '#5A5570' }}>📱 {selMember.phone}</div>}
                </div>
                <button onClick={() => { setEditingMember(selMember); setShowMemberModal(true) }} style={{ background: 'none', border: '1px solid #1F1F2E', color: '#5A5570', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px' }}>✏</button>
              </div>
            </Card>

            {/* Tabs - 2x3 grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
              {([['hotel','🏨','Hotel'],['tickets','✈','Tickets'],['guests','🎫','Guests'],['expenses','💰','Expenses'],['messages','💬','Messages']] as const).map(([t, icon, label]) => (
                <button key={t} onClick={() => switchMemberTab(t as any)} style={{ padding: '12px', borderRadius: '10px', border: `2px solid ${memberTab === t ? '#C9A84C' : '#1F1F2E'}`, background: memberTab === t ? 'rgba(201,168,76,.1)' : '#12121A', color: memberTab === t ? '#C9A84C' : '#5A5570', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: 800, textAlign: 'center' }}>
                  {icon} {label}
                </button>
              ))}
            </div>

            {/* Hotel tab */}
            {memberTab === 'hotel' && (
              <Card style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showMemberData?.hotel ? '10px' : 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 800 }}>🏨 {selShow.city || selShow.date}</div>
                  <button onClick={() => setShowHotelModal(true)} style={{ background: 'rgba(201,168,76,.1)', border: '1px solid rgba(201,168,76,.2)', color: '#C9A84C', borderRadius: '8px', padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 700 }}>
                    {showMemberData?.hotel ? '✏ Edit' : '+ Add'}
                  </button>
                </div>
                {showMemberData?.hotel ? (
                  <div>
                    <div style={{ fontWeight: 700 }}>{showMemberData.hotel}</div>
                    {showMemberData.room && <div style={{ fontSize: '12px', color: '#5A5570' }}>Room {showMemberData.room}</div>}
                    {showMemberData.hotel_addr && <div style={{ fontSize: '12px', color: '#5A5570' }}>{showMemberData.hotel_addr}</div>}
                    {showMemberData.notes && <div style={{ fontSize: '12px', color: '#5A5570', fontStyle: 'italic' }}>{showMemberData.notes}</div>}
                  </div>
                ) : <div style={{ fontSize: '12px', color: '#5A5570' }}>No hotel added yet</div>}
              </Card>
            )}

            {/* Tickets tab */}
            {memberTab === 'tickets' && (
              <Card style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: 800, marginBottom: '12px' }}>✈ Travel tickets</div>
                <TicketUpload
                  showId={selShow.id} memberId={selMember.id} tourId={selTour.id}
                  tickets={memberTickets}
                  onRefresh={async () => {
                    const data = await loadData({ tourId: selTour.id, showId: selShow.id, memberId: selMember.id })
                    if (data.memberTickets) setTickets(data.memberTickets)
    if (data.showDocs) setShowDocs(data.showDocs)
    if (data.showMessages) setShowMessages(data.showMessages)
                  }}
                />
              </Card>
            )}

            {/* Guests tab */}
            {memberTab === 'guests' && (
              <GuestsSection
                showId={selShow.id} memberId={selMember.id} tourId={selTour.id}
                guests={guests}
                onRefresh={async () => {
                  const data = await loadData({ tourId: selTour.id, showId: selShow.id, memberId: selMember.id })
                  if (data.guests) setGuests(data.guests)
                }}
              />
            )}

            {/* Expenses tab */}
            {memberTab === 'expenses' && (
              <ExpensesSection
                showId={selShow.id} memberId={selMember.id} tourId={selTour.id}
                showDate={selShow.date}
                expenses={expenses}
                onRefresh={async () => {
                  const data = await loadData({ tourId: selTour.id, showId: selShow.id, memberId: selMember.id })
                  if (data.expenses) setExpenses(data.expenses)
                }}
              />
            )}

            {/* Messages tab */}
            {memberTab === 'messages' && (
              <Card style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: 800, marginBottom: '12px' }}>💬 Messages</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                  {messages.length === 0 ? (
                    <div style={{ fontSize: '12px', color: '#5A5570', textAlign: 'center', padding: '24px' }}>No messages yet — send the first one</div>
                  ) : messages.map((m: any) => (
                    <div key={m.id} style={{ alignSelf: m.from_manager ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                      <div style={{ fontSize: '10px', color: '#5A5570', marginBottom: '3px', textAlign: m.from_manager ? 'right' : 'left' }}>
                        {m.sender_name} · {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div style={{ background: m.from_manager ? 'rgba(201,168,76,.15)' : '#1A1A28', border: `1px solid ${m.from_manager ? 'rgba(201,168,76,.3)' : '#1F1F2E'}`, borderRadius: m.from_manager ? '12px 12px 4px 12px' : '12px 12px 12px 4px', padding: '10px 14px', fontSize: '13px', lineHeight: 1.5 }}>
                        {m.message}
                      </div>
                    </div>
                  ))}
                </div>
                <MessageInput onSend={async (msg: string) => {
                  const id = Math.random().toString(36).slice(2)
                  const newMsg = { id, from_manager: true, sender_name: 'Manager', message: msg, created_at: new Date().toISOString() }
                  setMessages((prev: any[]) => [...prev, newMsg])
                  await api('send_message', { showId: selShow.id, memberId: selMember.id, tourId: selTour.id, message: msg, fromManager: true, senderName: 'Manager' })
                }} />
              </Card>
            )}
          </div>
        </>
      )}

      {/* Modals */}
      <TourModal key={editingTour?.id || 'new-tour'} open={showTourModal} onClose={() => setShowTourModal(false)} editing={editingTour} onSaved={() => { load(); setShowTourModal(false) }} />
      <ShowModal key={editingShow?.id || 'new-show'} open={showShowModal} onClose={() => setShowShowModal(false)} tourId={selTour?.id} editing={editingShow} onSaved={() => load({ tourId: selTour?.id })} />
      <MemberModal key={editingMember?.id || 'new-member'} open={showMemberModal} onClose={() => setShowMemberModal(false)} tourId={selTour?.id} editing={editingMember} onSaved={() => { load({ tourId: selTour?.id }); if (selMember?.id === editingMember?.id) setSelMember({ ...selMember, ...editingMember }) }} />
      <HotelModal key={`hotel-${selMember?.id}-${selShow?.id}-${showHotelModal}`} open={showHotelModal} onClose={() => setShowHotelModal(false)} showId={selShow?.id} memberId={selMember?.id} tourId={selTour?.id} existing={showMemberData} onSaved={() => load({ tourId: selTour?.id, showId: selShow?.id, memberId: selMember?.id })} />
    </div>
  )
}
