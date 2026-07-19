'use client'
import { useState, useEffect, useRef } from 'react'
import { getToken } from '@/lib/store'
import { Button, Card, Input, Modal, EmptyState, Toolbar, showToast } from '@/components/ui'

const CATS: Record<string, string> = { transport: '🚆 Transport', hotel: '🏨 Hotel', food: '🍽 Food', equipment: '🎛 Equipment', other: '📦 Other' }
const STATUS_COLORS: Record<string, string> = { confirmed: '#5DC9A0', pending: '#C9A84C', cancelled: '#E8453C' }
const STATUS_LABELS: Record<string, string> = { confirmed: '✓ Confirmed', pending: '⏳ Pending', cancelled: '✕ Cancelled' }

async function memberAPI(action: string, data: any) {
  const res = await fetch('/api/member', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
    body: JSON.stringify({ action, ...data })
  })
  return res.json()
}

async function loadData(token?: string) {
  const url = token ? `/api/member?token=${token}` : '/api/member'
  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${getToken()}` } })
  return res.json()
}

export default function ToursInvitedPage() {
  const [data, setData] = useState<any>({ members: [], tickets: [], expenses: [], guests: [], messages: [] })
  const [loading, setLoading] = useState(true)
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [activeTab, setActiveTab] = useState<'tickets' | 'guests' | 'expenses' | 'chat'>('tickets')
  const [showGuestModal, setShowGuestModal] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [viewingTicket, setViewingTicket] = useState<any>(null)
  const [viewingReceipt, setViewingReceipt] = useState<any>(null)
  const [guestName, setGuestName] = useState('')
  const [guestContact, setGuestContact] = useState('')
  const [guestCount, setGuestCount] = useState('1')
  const [guestNotes, setGuestNotes] = useState('')
  const [expDesc, setExpDesc] = useState('')
  const [expAmount, setExpAmount] = useState('')
  const [expCat, setExpCat] = useState('other')
  const [expReceipt, setExpReceipt] = useState('')
  const [expReceiptName, setExpReceiptName] = useState('')
  const [expReceiptMime, setExpReceiptMime] = useState('')
  const [chatMsg, setChatMsg] = useState('')
  const chatRef = useRef<HTMLDivElement>(null)
  const receiptRef = useRef<HTMLInputElement>(null)

  const refresh = async (inviteToken?: string) => {
    const d = await loadData(inviteToken)
    setData(d)
    if (d.members?.length === 1) setSelectedMemberId(d.members[0].id)
  }

  useEffect(() => {
    const inviteToken = localStorage.getItem('tourdesk_invite_token')
    if (inviteToken) localStorage.removeItem('tourdesk_invite_token')
    refresh(inviteToken || undefined).then(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [data.messages, showChat])

  const member = data.members?.find((m: any) => m.id === selectedMemberId)
  const myTickets = data.tickets?.filter((t: any) => t.member_id === selectedMemberId) || []
  const myGuests = data.guests?.filter((g: any) => g.member_id === selectedMemberId) || []
  const myExpenses = data.expenses?.filter((e: any) => e.member_id === selectedMemberId) || []
  const myMessages = data.messages?.filter((m: any) => m.member_id === selectedMemberId) || []

  const addGuest = async () => {
    if (!guestName.trim()) { showToast('Name required', false); return }
    await memberAPI('add_guest', { memberId: selectedMemberId, name: guestName.trim(), contact: guestContact, count: parseInt(guestCount) || 1, notes: guestNotes })
    showToast(guestName + ' added')
    setGuestName(''); setGuestContact(''); setGuestCount('1'); setGuestNotes('')
    setShowGuestModal(false)
    refresh()
  }

  const cycleStatus = async (g: any) => {
    const next = ({ confirmed: 'pending', pending: 'cancelled', cancelled: 'confirmed' } as any)[g.status] || 'confirmed'
    await memberAPI('update_guest_status', { memberId: selectedMemberId, guestId: g.id, status: next })
    refresh()
  }

  const addExpense = async () => {
    if (!expAmount) { showToast('Amount required', false); return }
    await memberAPI('add_expense', {
      memberId: selectedMemberId, date: new Date().toISOString().slice(0, 10),
      amount: parseFloat(expAmount), category: expCat, description: expDesc,
      receiptData: expReceipt, receiptName: expReceiptName, receiptMime: expReceiptMime
    })
    showToast('Expense added')
    setExpDesc(''); setExpAmount(''); setExpCat('other'); setExpReceipt(''); setExpReceiptName(''); setExpReceiptMime('')
    setShowExpenseModal(false)
    refresh()
  }

  const sendMsg = async () => {
    if (!chatMsg.trim()) return
    await memberAPI('send_message', { memberId: selectedMemberId, message: chatMsg })
    setChatMsg('')
    refresh()
  }

  const handleReceiptFile = async (file: File) => {
    const b64 = await new Promise<string>(res => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(file) })
    setExpReceipt(b64); setExpReceiptName(file.name); setExpReceiptMime(file.type)
  }

  if (loading) return <div style={{ padding: '32px', textAlign: 'center', color: '#5A5570' }}>Loading...</div>

  const tabs = [
    { key: 'tickets', label: '🎫 Tickets', count: myTickets.length },
    { key: 'guests', label: '👥 Guests', count: myGuests.length },
    { key: 'expenses', label: '💰 Expenses', count: myExpenses.length },
    { key: 'chat', label: '💬 Messages', count: myMessages.filter((m: any) => m.from_manager && !m.read_at).length },
  ]

  return (
    <div style={{ padding: '0 0 100px' }}>
      <Toolbar title="My Tours" />
      <div style={{ padding: '0 16px' }}>

        {data.members?.length === 0 ? (
          <EmptyState icon="🎭" title="No tour invitations yet" sub="When a manager invites you to a tour it will appear here." />
        ) : (
          <>
            {/* Tour selector if multiple */}
            {data.members?.length > 1 && (
              <div style={{ marginBottom: '16px' }}>
                {data.members.map((m: any) => (
                  <button key={m.id} onClick={() => setSelectedMemberId(m.id)} style={{ width: '100%', background: selectedMemberId === m.id ? 'rgba(201,168,76,.1)' : '#12121A', border: `2px solid ${selectedMemberId === m.id ? '#C9A84C' : '#1F1F2E'}`, borderRadius: '12px', padding: '12px 14px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', marginBottom: '6px' }}>
                    <div style={{ fontWeight: 800, color: selectedMemberId === m.id ? '#C9A84C' : '#E8E0F0' }}>🎭 Tour</div>
                    <div style={{ fontSize: '11px', color: '#5A5570' }}>{m.role || 'Team member'}</div>
                  </button>
                ))}
              </div>
            )}

            {selectedMemberId && (
              <>
                {/* Tabs */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', overflowX: 'auto' }}>
                  {tabs.map(tab => (
                    <button key={tab.key} onClick={() => { setActiveTab(tab.key as any); if (tab.key === 'chat') setShowChat(true) }} style={{ flexShrink: 0, padding: '8px 14px', borderRadius: '20px', border: `1px solid ${activeTab === tab.key ? '#C9A84C' : '#1F1F2E'}`, background: activeTab === tab.key ? 'rgba(201,168,76,.1)' : '#12121A', color: activeTab === tab.key ? '#C9A84C' : (tab.count > 0 && tab.key === 'chat' ? '#E8453C' : '#5A5570'), fontFamily: 'inherit', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                      {tab.label}{tab.count > 0 ? ` (${tab.count})` : ''}
                    </button>
                  ))}
                </div>

                {/* TICKETS */}
                {activeTab === 'tickets' && (
                  myTickets.length === 0 ? (
                    <Card style={{ textAlign: 'center', padding: '28px' }}>
                      <div style={{ fontSize: '28px', marginBottom: '10px' }}>🎫</div>
                      <div style={{ fontWeight: 700, marginBottom: '6px' }}>No tickets yet</div>
                      <div style={{ fontSize: '13px', color: '#5A5570' }}>Your manager will upload your tickets here</div>
                    </Card>
                  ) : (
                    ['out', 'ret'].map(dir => {
                      const dirT = myTickets.filter((t: any) => t.direction === dir)
                      if (!dirT.length) return null
                      const color = dir === 'out' ? '#C9A84C' : '#5DC9A0'
                      return (
                        <div key={dir} style={{ marginBottom: '16px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 800, color, letterSpacing: '.1em', marginBottom: '8px' }}>
                            {dir === 'out' ? '✈ OUTBOUND' : '🔄 RETURN'}
                          </div>
                          {dirT.map((t: any, i: number) => (
                            <Card key={t.id} style={{ marginBottom: '8px' }}>
                              {dirT.length > 1 && <div style={{ fontSize: '10px', fontWeight: 700, color, marginBottom: '4px' }}>Ticket {i + 1}</div>}
                              {t.info?.date && <div style={{ fontSize: '12px', color: '#5A5570', marginBottom: '2px' }}>📅 {t.info.date}</div>}
                              {(t.info?.from || t.info?.to) && <div style={{ fontSize: '17px', fontWeight: 900, marginBottom: '4px' }}>{t.info.from || '?'} → {t.info.to || '?'}</div>}
                              {t.info?.time && <div style={{ fontSize: '13px', color: '#5A5570', marginBottom: '12px' }}>🕐 {t.info.time}{t.info.ref ? ` · ${t.info.ref}` : ''}{t.info.seat ? ` · 💺 ${t.info.seat}` : ''}</div>}
                              {!t.info?.from && !t.info?.time && <div style={{ fontSize: '12px', color: '#5A5570', marginBottom: '12px' }}>{t.ticket_name}</div>}
                              <button onClick={() => setViewingTicket(t)} style={{ width: '100%', background: color, border: 'none', color: '#0A0A0F', borderRadius: '10px', padding: '14px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '15px', fontWeight: 900 }}>
                                📱 Show ticket to scan
                              </button>
                            </Card>
                          ))}
                        </div>
                      )
                    })
                  )
                )}

                {/* GUESTS */}
                {activeTab === 'guests' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                      <Button size="sm" onClick={() => setShowGuestModal(true)}>+ Add guest</Button>
                    </div>
                    {myGuests.length === 0 ? (
                      <Card style={{ textAlign: 'center', padding: '28px' }}>
                        <div style={{ fontSize: '28px', marginBottom: '10px' }}>👥</div>
                        <div style={{ fontSize: '13px', color: '#5A5570' }}>Add guests for this show — your manager will see them</div>
                      </Card>
                    ) : myGuests.map((g: any) => (
                      <Card key={g.id} style={{ marginBottom: '8px', padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700 }}>{g.name}{g.count > 1 ? ` ×${g.count}` : ''}</div>
                            {g.contact && <div style={{ fontSize: '11px', color: '#5A5570' }}>{g.contact}</div>}
                          </div>
                          <button onClick={() => cycleStatus(g)} style={{ background: 'none', border: `1px solid ${STATUS_COLORS[g.status]}`, color: STATUS_COLORS[g.status], borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', fontWeight: 700 }}>
                            {STATUS_LABELS[g.status]}
                          </button>
                          <button onClick={async () => { await memberAPI('delete_guest', { memberId: selectedMemberId, guestId: g.id }); refresh() }} style={{ background: 'none', border: 'none', color: '#E8453C', cursor: 'pointer', fontSize: '16px' }}>✕</button>
                        </div>
                      </Card>
                    ))}
                  </>
                )}

                {/* EXPENSES */}
                {activeTab === 'expenses' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      {myExpenses.length > 0 && <div style={{ fontSize: '13px', fontWeight: 800, color: '#C9A84C' }}>€{myExpenses.reduce((s: number, e: any) => s + (e.amount || 0), 0).toFixed(2)}</div>}
                      <Button size="sm" onClick={() => setShowExpenseModal(true)} style={{ marginLeft: 'auto' }}>+ Add expense</Button>
                    </div>
                    {myExpenses.length === 0 ? (
                      <Card style={{ textAlign: 'center', padding: '28px' }}>
                        <div style={{ fontSize: '28px', marginBottom: '10px' }}>💰</div>
                        <div style={{ fontSize: '13px', color: '#5A5570' }}>Add your expenses to get reimbursed — attach receipts</div>
                      </Card>
                    ) : myExpenses.map((e: any) => (
                      <Card key={e.id} style={{ marginBottom: '8px', padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ fontSize: '20px' }}>{CATS[e.category]?.split(' ')[0] || '📦'}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '13px' }}>{e.description || e.category}</div>
                            <div style={{ fontSize: '11px', color: '#5A5570' }}>{e.date}</div>
                            {e.receipt_data && <button onClick={() => setViewingReceipt(e)} style={{ marginTop: '4px', background: 'rgba(201,168,76,.1)', border: '1px solid rgba(201,168,76,.2)', color: '#C9A84C', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', fontWeight: 700 }}>🧾 View receipt</button>}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 800, color: '#C9A84C' }}>€{(e.amount || 0).toFixed(2)}</div>
                            <button onClick={async () => { await memberAPI('delete_expense', { memberId: selectedMemberId, expenseId: e.id }); refresh() }} style={{ background: 'none', border: 'none', color: '#E8453C', cursor: 'pointer', fontSize: '13px' }}>✕</button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Guest modal */}
      <Modal key={showGuestModal ? 'open' : 'closed'} open={showGuestModal} onClose={() => setShowGuestModal(false)} title="Add guest">
        <Input label="Name *" value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Marie Dupont" />
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
          <Input label="Phone or email" value={guestContact} onChange={e => setGuestContact(e.target.value)} />
          <Input label="Places" type="number" value={guestCount} onChange={e => setGuestCount(e.target.value)} />
        </div>
        <Input label="Notes" value={guestNotes} onChange={e => setGuestNotes(e.target.value)} />
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <Button variant="secondary" onClick={() => setShowGuestModal(false)} style={{ flex: 1 }}>Cancel</Button>
          <Button onClick={addGuest} style={{ flex: 2 }}>Add guest</Button>
        </div>
      </Modal>

      {/* Expense modal */}
      <Modal key={showExpenseModal ? 'open' : 'closed'} open={showExpenseModal} onClose={() => setShowExpenseModal(false)} title="Add expense">
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
          <Input label="Description" value={expDesc} onChange={e => setExpDesc(e.target.value)} placeholder="Uber, lunch..." />
          <Input label="Amount €" type="number" value={expAmount} onChange={e => setExpAmount(e.target.value)} placeholder="0.00" />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '6px' }}>Category</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {Object.entries(CATS).map(([k, v]) => (
              <button key={k} onClick={() => setExpCat(k)} style={{ padding: '6px 12px', borderRadius: '20px', border: `1px solid ${expCat === k ? '#C9A84C' : '#1F1F2E'}`, background: expCat === k ? 'rgba(201,168,76,.1)' : '#12121A', color: expCat === k ? '#C9A84C' : '#5A5570', fontFamily: 'inherit', fontSize: '12px', cursor: 'pointer' }}>
                {v}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '6px' }}>🧾 Receipt</div>
          {!expReceipt ? (
            <>
              <input ref={receiptRef} type="file" accept="image/*,.pdf" capture="environment" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleReceiptFile(e.target.files[0])} />
              <button onClick={() => receiptRef.current?.click()} style={{ width: '100%', background: '#12121A', border: '1px dashed rgba(201,168,76,.3)', color: '#5A5570', borderRadius: '10px', padding: '11px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px' }}>
                📷 Take photo or upload
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#12121A', border: '1px solid rgba(201,168,76,.2)', borderRadius: '10px', padding: '10px 12px' }}>
              <span style={{ fontSize: '20px' }}>{expReceiptMime?.startsWith('image') ? '🖼' : '📄'}</span>
              <span style={{ flex: 1, fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{expReceiptName}</span>
              <button onClick={() => { setExpReceipt(''); setExpReceiptName(''); setExpReceiptMime('') }} style={{ background: 'none', border: 'none', color: '#E8453C', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" onClick={() => setShowExpenseModal(false)} style={{ flex: 1 }}>Cancel</Button>
          <Button onClick={addExpense} style={{ flex: 2 }}>Save expense</Button>
        </div>
      </Modal>

      {/* 1-to-1 chat */}
      {showChat && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#0A0A0F', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid #1F1F2E' }}>
            <div style={{ fontWeight: 800 }}>💬 Manager</div>
            <button onClick={() => { setShowChat(false); setActiveTab('tickets') }} style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>✕</button>
          </div>
          <div ref={chatRef} style={{ flex: 1, overflow: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {myMessages.length === 0 && <div style={{ textAlign: 'center', color: '#5A5570', fontSize: '13px', padding: '32px' }}>No messages yet — send a message to your manager</div>}
            {myMessages.map((m: any) => (
              <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.from_manager ? 'flex-start' : 'flex-end' }}>
                <div style={{ fontSize: '10px', color: '#5A5570', marginBottom: '3px' }}>{m.from_manager ? '👔 Manager' : 'You'}</div>
                <div style={{ background: m.from_manager ? '#12121A' : 'rgba(201,168,76,.15)', border: `1px solid ${m.from_manager ? '#1F1F2E' : 'rgba(201,168,76,.2)'}`, borderRadius: '12px', padding: '10px 14px', maxWidth: '75%', fontSize: '14px' }}>
                  {m.message}
                </div>
                <div style={{ fontSize: '10px', color: '#3A3550', marginTop: '3px' }}>
                  {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid #1F1F2E', display: 'flex', gap: '8px' }}>
            <input value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMsg()} placeholder="Message to manager..." style={{ flex: 1, background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '10px', padding: '12px', fontFamily: 'inherit', fontSize: '14px', outline: 'none' }} />
            <button onClick={sendMsg} style={{ background: '#C9A84C', border: 'none', color: '#0A0A0F', borderRadius: '10px', padding: '12px 16px', cursor: 'pointer', fontWeight: 800, fontSize: '16px' }}>→</button>
          </div>
        </div>
      )}

      {/* Ticket viewer */}
      {viewingTicket && (
        <div onClick={() => setViewingTicket(null)} style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,.97)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '600px', marginBottom: '12px' }}>
            <div style={{ fontWeight: 700, color: 'white' }}>{viewingTicket.ticket_name}</div>
            <button onClick={() => setViewingTicket(null)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '28px', cursor: 'pointer' }}>✕</button>
          </div>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '600px' }}>
            {viewingTicket.ticket_data?.startsWith('data:image') && <img src={viewingTicket.ticket_data} style={{ width: '100%', borderRadius: '12px', maxHeight: '80vh', objectFit: 'contain' }} />}
            {viewingTicket.ticket_data?.startsWith('data:application/pdf') && <iframe src={viewingTicket.ticket_data} style={{ width: '100%', height: '80vh', border: 'none', borderRadius: '12px' }} />}
          </div>
        </div>
      )}

      {/* Receipt viewer */}
      {viewingReceipt && (
        <div onClick={() => setViewingReceipt(null)} style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,.97)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '600px', marginBottom: '12px' }}>
            <div style={{ fontWeight: 700, color: 'white' }}>{viewingReceipt.receipt_name}</div>
            <button onClick={() => setViewingReceipt(null)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '28px', cursor: 'pointer' }}>✕</button>
          </div>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '600px' }}>
            {viewingReceipt.receipt_data?.startsWith('data:image') && <img src={viewingReceipt.receipt_data} style={{ width: '100%', borderRadius: '12px', maxHeight: '80vh', objectFit: 'contain' }} />}
            {viewingReceipt.receipt_data?.startsWith('data:application/pdf') && <iframe src={viewingReceipt.receipt_data} style={{ width: '100%', height: '80vh', border: 'none', borderRadius: '12px' }} />}
          </div>
        </div>
      )}
    </div>
  )
}
