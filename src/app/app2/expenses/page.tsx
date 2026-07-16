'use client'
import { useState } from 'react'
import { useStore, newId } from '@/lib/store'
import { syncToCloud } from '@/lib/sync'
import { Button, Card, Input, Select, Textarea, Modal, EmptyState, Toolbar, showToast } from '@/components/ui'
import { SendToContact } from '@/components/SendToContact'
import { Expense } from '@/lib/types'

const CATS = { transport: '🚆 Transport', hotel: '🏨 Hotel', food: '🍽 Food', equipment: '🎛 Equipment', other: '📦 Other' }

function ExpenseModal({ open, onClose, editing }: { open: boolean, onClose: () => void, editing?: Expense | null }) {
  const { artists, addExpense, updateExpense } = useStore()
  const [aId, setAId] = useState(editing?.aId || '')
  const [date, setDate] = useState(editing?.date || '')
  const [amount, setAmount] = useState(editing?.amount?.toString() || '')
  const [cat, setCat] = useState<Expense['cat']>(editing?.cat || 'other')
  const [desc, setDesc] = useState(editing?.desc || '')

  const save = async () => {
    if (!date || !amount) { showToast('Date and amount required', false); return }
    const expense: Expense = { id: editing?.id || newId(), aId: aId || null, date, amount: parseFloat(amount), cat, desc, receipt: '' }
    if (editing) updateExpense(expense)
    else addExpense(expense)
    await syncToCloud()
    showToast('Expense saved')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Expense' : 'New Expense'}>
      <Select label="Artist / Employer" value={aId} onChange={e => setAId(e.target.value)}>
        <option value="">No artist</option>
        {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
      </Select>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Input label="Date *" type="date" value={date} onChange={e => setDate(e.target.value)} />
        <Input label="Amount (€) *" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
      </div>
      <Select label="Category" value={cat} onChange={e => setCat(e.target.value as Expense['cat'])}>
        {Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </Select>
      <Textarea label="Description" value={desc} onChange={e => setDesc(e.target.value)} style={{ minHeight: '60px' }} />
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
        <Button onClick={save} style={{ flex: 2 }}>Save</Button>
      </div>
    </Modal>
  )
}

export default function ExpensesPage() {
  const { expenses, artists, deleteExpense } = useStore()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [showSend, setShowSend] = useState(false)

  const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date))
  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0)
  const artistName = (id: string | null | undefined) => id ? artists.find(a => a.id === id)?.name : null

  const handleDelete = async (e: Expense) => {
    if (!confirm('Delete this expense?')) return
    deleteExpense(e.id); await syncToCloud(); showToast('Expense deleted')
  }

  return (
    <div style={{ padding: '0 0 100px' }}>
      <Toolbar title="Expenses" actions={<><Button variant="secondary" size="sm" onClick={() => setShowSend(true)}>📤 Send</Button><Button size="sm" onClick={() => { setEditing(null); setShowModal(true) }}>+ Expense</Button></>} />
      <div style={{ padding: '0 16px' }}>
        {expenses.length > 0 && (
          <Card style={{ marginBottom: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#C9A84C' }}>€{total.toFixed(2)}</div>
            <div style={{ fontSize: '12px', color: '#5A5570' }}>Total expenses</div>
          </Card>
        )}
        {expenses.length === 0 ? <EmptyState icon="🧾" title="No expenses yet" sub="Track transport, hotel, meals and equipment costs." /> : (
          sorted.map(e => (
            <Card key={e.id} style={{ marginBottom: '8px', padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ fontSize: '20px' }}>{(CATS[e.cat] || CATS.other).split(' ')[0]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>{e.desc || CATS[e.cat]}</div>
                  <div style={{ fontSize: '11px', color: '#5A5570' }}>{e.date}{artistName(e.aId) ? ` · ${artistName(e.aId)}` : ''}</div>
                </div>
                <div style={{ fontWeight: 800, color: '#C9A84C', fontSize: '14px' }}>€{(e.amount || 0).toFixed(2)}</div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <Button variant="secondary" size="sm" onClick={() => { setEditing(e); setShowModal(true) }}>✏</Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(e)}>✕</Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
      <ExpenseModal open={showModal} onClose={() => setShowModal(false)} editing={editing} />
      <SendToContact
        open={showSend}
        onClose={() => setShowSend(false)}
        subject="Expense report"
        body={`Expense report\n\n${sorted.map(e => `• ${e.date} — ${e.desc || (CATS as any)[e.cat]} — €${(e.amount||0).toFixed(2)}`).join('\n')}\n\nTotal: €${total.toFixed(2)}`}
      />
    </div>
  )
}
