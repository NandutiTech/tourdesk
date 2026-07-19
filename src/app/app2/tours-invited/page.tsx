'use client'
import { useState, useEffect, useRef } from 'react'
import { getToken } from '@/lib/store'
import { Button, Card, Input, Modal, EmptyState, Toolbar, showToast } from '@/components/ui'

const CATS: Record<string, string> = { transport: '🚆 Transport', hotel: '🏨 Hotel', food: '🍽 Food', equipment: '🎛 Equipment', other: '📦 Other' }
const STATUS_COLORS: Record<string, string> = { confirmed: '#5DC9A0', pending: '#C9A84C', cancelled: '#E8453C' }
const STATUS_LABELS: Record<string, string> = { confirmed: '✓ Confirmed', pending: '⏳ Pending', cancelled: '✕ Cancelled' }

async function memberAPI(action: string, data: any) {
  const token = getToken()
  const res = await fetch('/api/member', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ action, ...data })
  })
  return res.json()
}

async function loadMemberData() {
  const token = getToken()
  const res = await fetch('/api/member', { headers: { 'Authorization': `Bearer ${token}` } })
  return res.json()
}

export default function ToursInvitedPage() {
  const [data, setData] = useState<any>({ invites: [], tickets: [], guests: [], expenses: [], messages: [] })
  const [loading, setLoading] = useState(true)
  const [selectedTourId, setSelectedTourId] = useState('')
  const [activeTab, setActiveTab] = useState<'tickets' | 'guests' | 'expenses' | 'chat'>('tickets')

  // Modals
  const [showGuestModal, setShowGuestModal] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [viewingTicket, setViewingTicket] = useState<any>(null)
  const [viewingReceipt, setViewingReceipt] = useState<any>(null)

  // Guest form
  const [guestName, setGuestName] = useState('')
  const [guestContact, setGuestContact] = useState('')
  const [guestCount, setGuestCount] = useState('1')
  const [guestNotes, setGuestNotes] = useState('')

  // Expense form
  const [expDesc, setExpDesc] = useState('')
  const [expAmount, setExpAmount] = useState('')
  const [expCat, setExpCat] = useState('other')
  const [expReceipt, setExpReceipt] = useState('')
  const [expReceiptName, setExpReceiptName] = useState('')
  const [expReceiptMime, setExpReceiptMime] = useState('')

  // Chat
  const [chatMsg, setChatMsg] = useState('')
  const chatRef = useRef<HTMLDivElement>(null)
  const receiptRef = useRef<HTMLInputElement>(null)

  const refresh = async () => {
    const d = await loadMemberData()
    setData(d)
  }

  useEffect(() => { refresh().then(() => setLoading(false)) }, [])

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [data.messages, showChat])

  const myInvites = data.invites || []
  const myTickets = data.tickets?.filter((t: any) => t.tour_id === selectedTourId) || []
  const myGuests = data.guests?.filter((g: any) => g.tour_id === selectedTourId) || []
  const myExpenses = data.expenses?.filter((e: any) => e.tour_id === selectedTourId) || []
  const tourMessages = data.messages?.filter((m: any) => m.tour_id === selectedTourId) || []

  const today = new Date().toISOString().slice(0, 10)
  const selectedInvite = myInvites.find((i: any) => i.tour_id === selectedTourId)

  const addGuest = async () => {
    if (!guestName.trim()) { showToast('Name required', false); return }
    await memberAPI('add_guest', { tourId: selectedTourId, name: guestName.trim(), contact: guestContact, count: parseInt(guestCount) || 1, notes: guestNotes })
    showToast(guestName + ' added')
    setGuestName(''); setGuestContact(''); setGuestCount('1'); setGuestNotes('')
    setShowGuestModal(false)
    refresh()
  }

  const deleteGuest = async (id: string) => {
    await memberAPI('delete_guest', { tourId: selectedTourId, guestId: id })
    refresh()
  }

  const cycleStatus = async (g: any) => {
    const next = { confirmed: 'pending', pending: 'cancelled', cancelled: 'confirmed' }[g.status as string] || 'confirmed'
    await memberAPI('update_guest_status', { tourId: selectedTourId, guestId: g.id, status: next })
    refresh()
  }

  const addExpense = async () => {
    if (!expAmount) { showToast('Amount required', false); return }
    await memberAPI('add_expense', {
      tourId: selectedTourId, date: today,
      amount: parseFloat(expAmount), category: expCat,
      description: expDesc, receiptData: expReceipt,
      receiptName: expReceiptName, receiptMime: expReceiptMime
    })
    showToast('Expense added')
    setExpDesc(''); setExpAmount(''); setExpCat('other'); setExpReceipt(''); setExpReceiptName(''); setExpReceiptMime('')
    setShowExpenseModal(false)
    refresh()
  }

  const deleteExpense = async (id: string) => {
    await memberAPI('delete_expense', { tourId: selectedTourId, expenseId: id })
    refresh()
  }

  const sendMessage = async () => {
    if (!chatMsg.trim()) return
    await memberAPI('send_message', { tourId: selectedTourId, message: chatMsg.trim() })
    setChatMsg('')
    refresh()
  }

  const handleReceiptFile = async (file: File) => {
    const b64 = await new Promise<string>(res => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(file) })
    setExpReceipt(b64); setExpReceiptName(file.name); setExpReceiptMime(file.type)
  }

  const tabs = [
    { key: 'tickets', label: '🎫 Tickets', count: myTickets.length },
    { key: 'guests', label: '👥 Guests', count: myGuests.length },
    { key: 'expenses', label: '💰 Expenses', count: myExpenses.length },
    { key: 'chat', label: '💬 Chat', count: tourMessages.length },
  ]

  if (loading) return (
    <div style={{ padding: '32px 16px', textAlign: 'center', color: '#5A5570' }}>Loading tours...</div>
  )

  return (
    <div style={{ padding: '0 0 100px' }}>
      <Toolbar title="My Tours" actions={
        selectedTourId ? <button onClick={() => setShowChat(true)} style={{ background: 'rgba(201,168,76,.1)', border: '1px solid rgba(201,168,76,.2)', color: '#C9A84C', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 700 }}>💬 Chat</button> : undefined
      } />

      <div style={{ padding: '0 16px' }}>
        {myInvites.length === 0 ? (
          <EmptyState icon="🎭" title="No tour invitations yet" sub="When a manager invites you to a tour you'll see it here." />
        ) : (
          <>
            {/* Tour list */}
            <div style={{ marginBottom: '16px' }}>
              {myInvites.map((inv: any) => (
                <button key={inv.id} onClick={() => setSelectedTourId(inv.tour_id)} style={{ width: '100%', background: selectedTourId === inv.tour_id ? 'rgba(201,168,76,.1)' : '#12121A', border: `2px solid ${selectedTourId === inv.tour_id ? '#C9A84C' : '#1F1F2E'}`, borderRadius: '12px', padding: '14px 16px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 800, fontSize: '14px', color: selectedTourId === inv.tour_id ? '#C9A84C' : '#E8E0F0' }}>
                    🎭 Tour
                  </div>
                  <div style={{ fontSize: '12px', color: '#5A5570', marginTop: '2px' }}>
                    {inv.role || 'Team member'} · <span style={{ color: '#5DC9A0' }}>✓ Joined</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Tour detail */}
            {selectedTourId && (
              <>
                {/* Tabs */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', overflowX: 'auto' }}>
                  {tabs.map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} style={{ flexShrink: 0, padding: '8px 14px', borderRadius: '20px', border: `1px solid ${activeTab === tab.key ? '#C9A84C' : '#1F1F2E'}`, background: activeTab === tab.key ? 'rgba(201,168,76,.1)' : '#12121A', color: activeTab === tab.key ? '#C9A84C' : '#5A5570', fontFamily: 'inherit', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                      {tab.label}{tab.count > 0 ? ` (${tab.count})` : ''}
                    </button>
                  ))}
                </div>

                {/* Tickets tab */}
                {activeTab === 'tickets' && (
                  <>
                    {myTickets.length === 0 ? (
                      <Card style={{ textAlign: 'center', padding: '24px' }}>
                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎫</div>
                        <div style={{ fontSize: '13px', color: '#5A5570' }}>Your manager will upload your tickets here</div>
                      </Card>
                    ) : (
                      ['out', 'ret'].map(dir => {
                        const dirTickets = myTickets.filter((t: any) => t.direction === dir)
                        if (!dirTickets.length) return null
                        const color = dir === 'out' ? '#C9A84C' : '#5DC9A0'
                        return (
                          <div key={dir} style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 800, color, letterSpacing: '.1em', marginBottom: '8px' }}>
                              {dir === 'out' ? '✈ OUTBOUND' : '🔄 RETURN'}
                            </div>
                            {dirTickets.map((t: any, i: number) => (
                              <Card key={t.id} style={{ marginBottom: '8px' }}>
                                {dirTickets.length > 1 && <div style={{ fontSize: '11px', fontWeight: 700, color, marginBottom: '4px' }}>Ticket {i + 1}</div>}
                                {t.info?.date && <div style={{ fontSize: '12px', color: '#5A5570', marginBottom: '2px' }}>📅 {t.info.date}</div>}
                                {(t.info?.from || t.info?.to) && (
                                  <div style={{ fontSize: '16px', fontWeight: 900, marginBottom: '4px' }}>{t.info.from || '?'} → {t.info.to || '?'}</div>
                                )}
                                {t.info?.time && (
                                  <div style={{ fontSize: '13px', color: '#5A5570', marginBottom: '10px' }}>
                                    🕐 {t.info.time}{t.info.ref ? ` · ${t.info.ref}` : ''}{t.info.seat ? ` · 💺 ${t.info.seat}` : ''}
                                  </div>
                                )}
                                {!t.info?.from && !t.info?.time && (
                                  <div style={{ fontSize: '12px', color: '#5A5570', marginBottom: '10px' }}>{t.ticket_name}</div>
                                )}
                                <button onClick={() => setViewingTicket(t)} style={{ width: '100%', background: color, border: 'none', color: '#0A0A0F', borderRadius: '10px', padding: '12px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', fontWeight: 900 }}>
                                  📱 Show ticket to scan
                                </button>
                              </Card>
                            ))}
                          </div>
                        )
                      })
                    )}
                  </>
                )}

                {/* Guests tab */}
                {activeTab === 'guests' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                      <Button size="sm" onClick={() => setShowGuestModal(true)}>+ Add guest</Button>
                    </div>
                    {myGuests.length === 0 ? (
                      <Card style={{ textAlign: 'center', padding: '24px' }}>
                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>👥</div>
                        <div style={{ fontSize: '13px', color: '#5A5570' }}>Add your guests for this tour</div>
                      </Card>
                    ) : (
                      myGuests.map((g: any) => (
                        <Card key={g.id} style={{ marginBottom: '8px', padding: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700 }}>{g.name}{g.count > 1 ? ` ×${g.count}` : ''}</div>
                              {g.contact && <div style={{ fontSize: '11px', color: '#5A5570' }}>{g.contact}</div>}
                              {g.notes && <div style={{ fontSize: '11px', color: '#5A5570', fontStyle: 'italic' }}>{g.notes}</div>}
                            </div>
                            <button onClick={() => cycleStatus(g)} style={{ background: 'none', border: `1px solid ${STATUS_COLORS[g.status]}`, color: STATUS_COLORS[g.status], borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', fontWeight: 700 }}>
                              {STATUS_LABELS[g.status]}
                            </button>
                            <button onClick={() => deleteGuest(g.id)} style={{ background: 'none', border: 'none', color: '#E8453C', cursor: 'pointer', fontSize: '16px' }}>✕</button>
                          </div>
                        </Card>
                      ))
                    )}
                  </>
                )}

                {/* Expenses tab */}
                {activeTab === 'expenses' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      {myExpenses.length > 0 && (
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#C9A84C' }}>
                          Total: €{myExpenses.reduce((s: number, e: any) => s + (e.amount || 0), 0).toFixed(2)}
                        </div>
                      )}
                      <Button size="sm" onClick={() => setShowExpenseModal(true)} style={{ marginLeft: 'auto' }}>+ Add expense</Button>
                    </div>
                    {myExpenses.length === 0 ? (
                      <Card style={{ textAlign: 'center', padding: '24px' }}>
                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>💰</div>
                        <div style={{ fontSize: '13px', color: '#5A5570' }}>Add expenses to get reimbursed</div>
                      </Card>
                    ) : (
                      myExpenses.map((e: any) => (
                        <Card key={e.id} style={{ marginBottom: '8px', padding: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ fontSize: '20px' }}>{CATS[e.category]?.split(' ')[0] || '📦'}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, fontSize: '13px' }}>{e.description || e.category}</div>
                              <div style={{ fontSize: '11px', color: '#5A5570' }}>{e.date}</div>
                              {e.receipt_data && (
                                <button onClick={() => setViewingReceipt(e)} style={{ marginTop: '4px', background: 'rgba(201,168,76,.1)', border: '1px solid rgba(201,168,76,.2)', color: '#C9A84C', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', fontWeight: 700 }}>
                                  🧾 View receipt
                                </button>
                              )}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 800, color: '#C9A84C' }}>€{(e.amount || 0).toFixed(2)}</div>
                              <button onClick={() => deleteExpense(e.id)} style={{ background: 'none', border: 'none', color: '#E8453C', cursor: 'pointer', fontSize: '13px', marginTop: '4px' }}>✕</button>
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </>
                )}

                {/* Chat tab shortcut */}
                {activeTab === 'chat' && (
                  <Card style={{ textAlign: 'center', padding: '24px' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>💬</div>
                    <div style={{ fontSize: '13px', color: '#5A5570', marginBottom: '16px' }}>{tourMessages.length} messages in tour chat</div>
                    <Button onClick={() => setShowChat(true)}>Open chat</Button>
                  </Card>
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

      {/* Chat fullscreen */}
      {showChat && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#0A0A0F', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid #1F1F2E' }}>
            <div style={{ fontWeight: 800 }}>💬 Tour chat</div>
            <button onClick={() => setShowChat(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>✕</button>
          </div>
          <div ref={chatRef} style={{ flex: 1, overflow: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {tourMessages.length === 0 && <div style={{ textAlign: 'center', color: '#5A5570', fontSize: '13px', padding: '32px' }}>No messages yet</div>}
            {tourMessages.map((m: any) => (
              <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.is_manager ? 'flex-start' : 'flex-end' }}>
                <div style={{ fontSize: '10px', color: '#5A5570', marginBottom: '3px' }}>{m.is_manager ? '👔 ' : ''}{m.user_name}</div>
                <div style={{ background: m.is_manager ? '#12121A' : 'rgba(201,168,76,.15)', border: `1px solid ${m.is_manager ? '#1F1F2E' : 'rgba(201,168,76,.2)'}`, borderRadius: '12px', padding: '10px 14px', maxWidth: '75%', fontSize: '14px' }}>
                  {m.message}
                </div>
                <div style={{ fontSize: '10px', color: '#3A3550', marginTop: '3px' }}>
                  {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid #1F1F2E', display: 'flex', gap: '8px' }}>
            <input value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Message..." style={{ flex: 1, background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '10px', padding: '12px', fontFamily: 'inherit', fontSize: '14px', outline: 'none' }} />
            <button onClick={sendMessage} style={{ background: '#C9A84C', border: 'none', color: '#0A0A0F', borderRadius: '10px', padding: '12px 16px', cursor: 'pointer', fontWeight: 800, fontSize: '16px' }}>→</button>
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
