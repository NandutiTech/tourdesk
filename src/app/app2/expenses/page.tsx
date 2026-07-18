'use client'
import { useState, useRef } from 'react'
import { useStore, newId } from '@/lib/store'
import { syncToCloud, deleteFromCloud } from '@/lib/sync'
import { Button, Card, Input, Select, Textarea, Modal, EmptyState, Toolbar, showToast } from '@/components/ui'
import { SendToContact } from '@/components/SendToContact'
import { Expense } from '@/lib/types'

const CATS = { transport: '🚆 Transport', hotel: '🏨 Hotel', food: '🍽 Food', equipment: '🎛 Equipment', other: '📦 Other' }

function ExpenseModal({ open, onClose, editing, defaultTourId, setLastTourId }: { open: boolean, onClose: () => void, editing?: Expense | null, defaultTourId?: string, setLastTourId: (id: string) => void }) {
  const { artists, tours, addExpense, updateExpense } = useStore()
  const [tourId, setTourId] = useState(editing?.tourId || defaultTourId || '')
  const [aId, setAId] = useState(editing?.aId || '')
  const [saving, setSaving] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(editing?.date || today)
  const [amount, setAmount] = useState(editing?.amount?.toString() || '')
  const [cat, setCat] = useState<Expense['cat']>(editing?.cat || 'other')
  const [desc, setDesc] = useState(editing?.desc || '')
  const [receipt, setReceipt] = useState(editing?.receipt || '')
  const [receiptName, setReceiptName] = useState(editing?.receiptName || '')
  const [receiptMime, setReceiptMime] = useState(editing?.receiptMime || '')
  const [viewing, setViewing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const linkedTour = tours.find(t => t.id === tourId)

  const handleFile = async (file: File) => {
    const b64 = await new Promise<string>((res) => {
      const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(file)
    })
    setReceipt(b64); setReceiptName(file.name); setReceiptMime(file.type)
  }

  const save = async () => {
    if (saving) return
    setSaving(true)
    if (!amount) { showToast('Amount required', false); setSaving(false); return }
    const effectiveDate = date || linkedTour?.start || new Date().toISOString().slice(0, 10)
    const expense: Expense = {
      id: editing?.id || newId(),
      aId: aId || linkedTour?.aId || null,
      tourId: tourId || null,
      date: effectiveDate, amount: parseFloat(amount), cat, desc, receipt, receiptName, receiptMime
    }
    if (editing) updateExpense(expense); else addExpense(expense)
    await syncToCloud(); setSaving(false); showToast('Expense saved')
    if (tourId) {
      setLastTourId(tourId)
    }
    onClose()
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title={editing ? 'Edit Expense' : 'New Expense'}>
        <Select label="Event (optional)" value={tourId} onChange={e => {
          setTourId(e.target.value)
          const t = tours.find(t => t.id === e.target.value)
          if (t?.aId) setAId(t.aId)
          if (t?.start && !date) setDate(t.start)
        }}>
          <option value="">No event linked</option>
          {[...tours].sort((a, b) => b.start.localeCompare(a.start)).map(t => {
            const artist = artists.find(a => a.id === t.aId)
            return <option key={t.id} value={t.id}>{t.start} — {t.title}{artist ? ` · ${artist.name}` : ''}</option>
          })}
        </Select>
        {linkedTour && (
          <div style={{ background: 'rgba(201,168,76,.06)', border: '1px solid rgba(201,168,76,.15)', borderRadius: '10px', padding: '10px 12px', marginBottom: '12px', fontSize: '12px' }}>
            📅 {linkedTour.start} — {linkedTour.title}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
          <Input label="Amount (€) *" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
        </div>
        <Select label="Category" value={cat} onChange={e => setCat(e.target.value as Expense['cat'])}>
          {Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Textarea label="Description" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Uber, supermarket, lunch..." style={{ minHeight: '60px' }} />
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '6px' }}>🧾 Receipt</div>
          {!receipt ? (
            <>
              <input ref={fileRef} type="file" accept="image/*,.pdf" capture="environment" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => fileRef.current?.click()} style={{ flex: 1, background: '#12121A', border: '1px dashed rgba(201,168,76,.3)', color: '#5A5570', borderRadius: '10px', padding: '11px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px' }}>
                  📷 Take photo / Upload
                </button>
              </div>
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
          <Button onClick={save} style={{ flex: 2 }} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </div>
      </Modal>
      {viewing && receipt && (
        <div onClick={() => setViewing(false)} style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,.97)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '600px', marginBottom: '12px' }}>
            <div style={{ fontWeight: 700, color: 'white' }}>{receiptName}</div>
            <button onClick={() => setViewing(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '28px', cursor: 'pointer' }}>✕</button>
          </div>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '600px' }}>
            {receipt.startsWith('data:image') && <img src={receipt} alt={receiptName} style={{ width: '100%', borderRadius: '12px', maxHeight: '80vh', objectFit: 'contain' }} />}
            {receipt.startsWith('data:application/pdf') && <iframe src={receipt} style={{ width: '100%', height: '80vh', border: 'none', borderRadius: '12px' }} />}
          </div>
        </div>
      )}
    </>
  )
}

export default function ExpensesPage() {
  const { expenses, artists, tours, deleteExpense } = useStore()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [showSend, setShowSend] = useState(false)
  const [viewingReceipt, setViewingReceipt] = useState<{ src: string, name: string } | null>(null)
  const [lastTourId, setLastTourId] = useState('')
  const [defaultTourId, setDefaultTourId] = useState('')

  const sorted = [...expenses].sort((a, b) => a.date.localeCompare(b.date))
  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0)
  const artistName = (id: string | null | undefined) => id ? artists.find(a => a.id === id)?.name : null

  // Group by show
  const grouped: { tourId: string | null, label: string, items: Expense[], total: number }[] = []
  const seen = new Set<string>()
  for (const e of sorted) {
    const key = e.tourId || '__none__'
    if (!seen.has(key)) {
      seen.add(key)
      const t = e.tourId ? tours.find(t => t.id === e.tourId) : null
      const label = t ? `${t.start} — ${t.title}` : 'No event'
      grouped.push({ tourId: e.tourId || null, label, items: [], total: 0 })
    }
    const g = grouped.find(g => (g.tourId || '__none__') === key)!
    g.items.push(e)
    g.total += e.amount || 0
  }

  const handleDelete = async (e: Expense) => {
    if (!confirm('Delete this expense?')) return
    deleteExpense(e.id); await syncToCloud(); showToast('Expense deleted')
  }

  return (
    <div style={{ padding: '0 0 100px' }}>
      <Toolbar title="Expenses" actions={<><Button variant="secondary" size="sm" onClick={() => setShowSend(true)}>📤 Send</Button><Button size="sm" onClick={() => { setEditing(null); setDefaultTourId(''); setShowModal(true) }}>+ Expense</Button></>} />
      {lastTourId && !showModal && (() => {
        const t = tours.find(t => t.id === lastTourId)
        return t ? (
          <div style={{ margin: '0 16px 12px', background: 'rgba(201,168,76,.08)', border: '1px solid rgba(201,168,76,.2)', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ fontSize: '12px', color: '#C9A84C', fontWeight: 700 }}>+ Add expense for {t.title}</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { setEditing(null); setDefaultTourId(lastTourId); setShowModal(true) }} style={{ background: '#C9A84C', border: 'none', color: '#0A0A0F', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 800 }}>Add</button>
              <button onClick={() => setLastTourId('')} style={{ background: 'none', border: 'none', color: '#5A5570', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>
          </div>
        ) : null
      })()}
      <div style={{ padding: '0 16px' }}>
        {expenses.length > 0 && (
          <Card style={{ marginBottom: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#C9A84C' }}>€{total.toFixed(2)}</div>
            <div style={{ fontSize: '12px', color: '#5A5570' }}>Total expenses</div>
          </Card>
        )}
        {expenses.length === 0 ? <EmptyState icon="🧾" title="No expenses yet" sub="Track transport, hotel, meals and equipment costs." /> : (
          grouped.map(group => (
            <div key={group.tourId || 'none'} style={{ marginBottom: '20px' }}>
              {/* Group header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: group.tourId ? '#C9A84C' : '#5A5570' }}>
                  {group.tourId ? '🎫' : '📦'} {group.label}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#C9A84C' }}>€{group.total.toFixed(2)}</span>
                  {group.tourId && (
                    <button onClick={() => { setEditing(null); setDefaultTourId(group.tourId!); setShowModal(true) }} style={{ background: 'rgba(201,168,76,.1)', border: '1px solid rgba(201,168,76,.2)', color: '#C9A84C', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', fontWeight: 700 }}>+ Add</button>
                  )}
                </div>
              </div>
              {/* Expenses in group */}
              {group.items.map(e => {
                const linkedTour = tours.find(t => t.id === e.tourId)
                return (
                  <Card key={e.id} style={{ marginBottom: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ fontSize: '20px', marginTop: '2px' }}>{(CATS[e.cat] || CATS.other).split(' ')[0]}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '13px' }}>{e.desc || CATS[e.cat]}</div>
                        <div style={{ fontSize: '11px', color: '#5A5570' }}>{e.date}{artistName(e.aId) ? ` · ${artistName(e.aId)}` : ''}</div>
                        {e.receipt && (
                          <button onClick={() => setViewingReceipt({ src: e.receipt!, name: e.receiptName || 'Receipt' })} style={{ marginTop: '6px', background: 'rgba(201,168,76,.1)', border: '1px solid rgba(201,168,76,.2)', color: '#C9A84C', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', fontWeight: 700 }}>
                            🧾 View receipt
                          </button>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, color: '#C9A84C', fontSize: '14px' }}>€{(e.amount || 0).toFixed(2)}</div>
                        <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                          <Button variant="secondary" size="sm" onClick={() => { setEditing(e); setShowModal(true) }}>✏</Button>
                          <Button variant="danger" size="sm" onClick={() => handleDelete(e)}>✕</Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          ))
        )}
      </div>
      <ExpenseModal open={showModal} onClose={() => { setShowModal(false); setDefaultTourId('') }} editing={editing} defaultTourId={defaultTourId} setLastTourId={setLastTourId} />
      {viewingReceipt && (
        <div onClick={() => setViewingReceipt(null)} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.97)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '600px', marginBottom: '12px' }}>
            <div style={{ fontWeight: 700, color: 'white' }}>{viewingReceipt.name}</div>
            <button onClick={() => setViewingReceipt(null)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '28px', cursor: 'pointer' }}>✕</button>
          </div>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '600px' }}>
            {viewingReceipt.src.startsWith('data:image') && <img src={viewingReceipt.src} alt={viewingReceipt.name} style={{ width: '100%', borderRadius: '12px', maxHeight: '80vh', objectFit: 'contain' }} />}
            {viewingReceipt.src.startsWith('data:application/pdf') && <iframe src={viewingReceipt.src} style={{ width: '100%', height: '80vh', border: 'none', borderRadius: '12px' }} />}
          </div>
        </div>
      )}
      <SendToContact
        open={showSend}
        onClose={() => setShowSend(false)}
        subject="Expense report"
        body={`Expense report\n\n${sorted.map(e => `• ${e.date} — ${e.desc || (CATS as any)[e.cat]} — €${(e.amount||0).toFixed(2)}`).join('\n')}\n\nTotal: €${total.toFixed(2)}`}
      />
    </div>
  )
}
