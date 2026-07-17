'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { syncToCloud } from '@/lib/sync'
import { Button, Card, Input, Modal, EmptyState, Toolbar, showToast, SectionLabel } from '@/components/ui'
import { MONTHS, EVENT_LABELS } from '@/lib/types'

function MonthPicker({ year, month, onChange, onClose }: {
  year: number, month: number,
  onChange: (y: number, m: number) => void,
  onClose: () => void
}) {
  const [y, setY] = useState(year)
  const [m, setM] = useState(month)
  const years = Array.from({ length: 8 }, (_, i) => year - 5 + i)
  return (
    <Modal open onClose={onClose} title="Jump to month">
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <select value={y} onChange={e => setY(parseInt(e.target.value))} style={{ flex: 1, background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '8px', padding: '10px', fontFamily: 'inherit', fontSize: '15px', fontWeight: 700 }}>
          {years.map(yr => <option key={yr} value={yr}>{yr}</option>)}
        </select>
        <select value={m} onChange={e => setM(parseInt(e.target.value))} style={{ flex: 2, background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '8px', padding: '10px', fontFamily: 'inherit', fontSize: '15px' }}>
          {MONTHS.map((mn, i) => <option key={i} value={i}>{mn}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
        <Button onClick={() => { onChange(y, m); onClose() }} style={{ flex: 2 }}>Go →</Button>
      </div>
    </Modal>
  )
}

function pad(n: number) { return String(n).padStart(2, '0') }

function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = []
  const d = new Date(start + 'T12:00:00')
  const e = new Date(end + 'T12:00:00')
  while (d <= e) {
    dates.push(d.toISOString().slice(0, 10))
    d.setDate(d.getDate() + 1)
  }
  return dates
}

export default function EarningsPage() {
  const {
    tours, artists, cachets, artistHours,
    hoursGoal, hoursPerEventType,
    earnY, earnM, setEarnings, setHoursGoal, setCachet, setHoursPerEventType, updateTour,
  } = useStore()

  const [showPicker, setShowPicker] = useState(false)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [goalInput, setGoalInput] = useState(hoursGoal.toString())

  const monthStr = `${earnY}-${pad(earnM + 1)}`
  const monthTours = tours.filter(t => {
    const dates = getDatesInRange(t.start, t.end || t.start)
    return dates.some(d => d.startsWith(monthStr))
  })

  // Calculate total earnings and hours
  let totalEarnings = 0
  let totalHours = 0

  for (const t of monthTours) {
    const artist = artists.find(a => a.id === t.aId)
    const cachet = t.customCachet ?? (artist?.defaultCachet ?? (artist?.id ? (cachets[artist.id] || 0) : 0))
    const hoursDefault = artist?.defaultHours ?? (hoursPerEventType as any)[t.type] ?? 12
    const hours = t.customHours ?? (
      ['residence', 'tournage', 'figuration', 'workday'].includes(t.type)
        ? getDatesInRange(t.start, t.end || t.start).length * hoursDefault
        : hoursDefault
    )
    totalEarnings += cachet
    totalHours += hours
  }

  // Annual hours
  const yearStr = String(earnY)
  const yearTours = tours.filter(t => t.start.startsWith(yearStr))
  let annualHours = 0
  for (const t of yearTours) {
    const tArtist = artists.find(a => a.id === t.aId)
    const hoursDefault = tArtist?.defaultHours ?? (hoursPerEventType as any)[t.type] ?? 12
    const hours = t.customHours ?? (
      ['residence', 'tournage', 'figuration', 'workday'].includes(t.type)
        ? getDatesInRange(t.start, t.end || t.start).length * hoursDefault
        : hoursDefault
    )
    annualHours += hours
  }

  const progressPct = Math.min((annualHours / hoursGoal) * 100, 100)
  const remaining = Math.max(hoursGoal - annualHours, 0)

  const prevMonth = () => {
    if (earnM === 0) setEarnings(earnY - 1, 11)
    else setEarnings(earnY, earnM - 1)
  }

  const nextMonth = () => {
    if (earnM === 11) setEarnings(earnY + 1, 0)
    else setEarnings(earnY, earnM + 1)
  }

  const [editingEvent, setEditingEvent] = useState<typeof monthTours[0] | null>(null)
  const [editCachetCount, setEditCachetCount] = useState('1')
  const [editCachetAmount, setEditCachetAmount] = useState('')
  const [editCachetHours, setEditCachetHours] = useState('')

  const openEventEdit = (t: typeof monthTours[0]) => {
    const artist = artists.find(a => a.id === t.aId)
    setEditingEvent(t)
    setEditCachetCount(String(t.cachetCount || 1))
    setEditCachetAmount(String(t.customCachet ?? artist?.defaultCachet ?? ''))
    setEditCachetHours(String(t.customHours ?? artist?.defaultHours ?? 12))
  }

  const saveEventEdit = async () => {
    if (!editingEvent) return
    const count = parseInt(editCachetCount) || 1
    const amount = parseFloat(editCachetAmount) || null
    const hours = parseFloat(editCachetHours) || null
    updateTour({ ...editingEvent, cachetCount: count, customCachet: amount, customHours: hours })
    await syncToCloud()
    showToast('Event updated ✓')
    setEditingEvent(null)
  }

  const saveGoal = async () => {
    const g = parseInt(goalInput)
    if (!isNaN(g) && g > 0) {
      setHoursGoal(g)
      await syncToCloud()
      showToast('Goal updated')
    }
    setShowGoalModal(false)
  }

  const updateCachet = async (artistId: string, value: string) => {
    const n = parseFloat(value) || 0
    setCachet(artistId, n)
    await syncToCloud()
  }

  const updateHoursType = async (type: string, value: string) => {
    const n = parseFloat(value) || 0
    setHoursPerEventType(type, n)
    await syncToCloud()
  }

  return (
    <div style={{ padding: '0 0 100px' }}>
      {/* Month nav */}
      <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={prevMonth} style={{ background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', fontSize: '16px' }}>‹</button>
        <div style={{ flex: 1, textAlign: 'center', fontWeight: 900, fontSize: '18px', letterSpacing: '-0.03em', cursor: 'pointer' }} onClick={() => setShowPicker(true)}>
          {MONTHS[earnM]} <span style={{ color: '#C9A84C' }}>{earnY}</span> <span style={{ fontSize: '12px', opacity: 0.5 }}>▾</span>
        </div>
        <button onClick={nextMonth} style={{ background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', fontSize: '16px' }}>›</button>
      </div>

      <div style={{ padding: '0 16px' }}>
        {/* Monthly summary */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          <Card style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#C9A84C' }}>€{totalEarnings.toFixed(0)}</div>
            <div style={{ fontSize: '11px', color: '#5A5570', marginTop: '4px' }}>Total {MONTHS[earnM]}</div>
          </Card>
          <Card style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#5DC9A0' }}>{totalHours}h</div>
            <div style={{ fontSize: '11px', color: '#5A5570', marginTop: '4px' }}>Hours {MONTHS[earnM]}</div>
          </Card>
        </div>

        {/* Annual hours progress */}
        <Card style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ fontWeight: 700, fontSize: '13px' }}>Hours {earnY}</div>
            <button onClick={() => { setGoalInput(hoursGoal.toString()); setShowGoalModal(true) }} style={{ background: 'none', border: '1px solid #1F1F2E', color: '#5A5570', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px' }}>
              Goal: {hoursGoal}h ✏
            </button>
          </div>
          <div style={{ background: '#12121A', borderRadius: '6px', height: '8px', overflow: 'hidden', marginBottom: '8px' }}>
            <div style={{ height: '100%', borderRadius: '6px', background: progressPct >= 100 ? '#5DC9A0' : '#C9A84C', width: `${progressPct}%`, transition: 'width .3s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#5A5570' }}>
            <span><strong style={{ color: '#E8E0F0' }}>{annualHours}h</strong> done</span>
            <span>{progressPct >= 100 ? '🎉 Goal reached!' : <><strong style={{ color: '#E8E0F0' }}>{remaining}h</strong> remaining</>}</span>
          </div>
        </Card>

        {/* Cachet settings per artist */}
        {artists.length > 0 && (
          <>
            <div style={{ marginTop: '8px' }}><SectionLabel>Default cachet per artist (€)</SectionLabel></div>
            {artists.map(artist => (
              <Card key={artist.id} style={{ marginBottom: '8px', padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: artist.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, fontWeight: 700, fontSize: '13px' }}>{artist.name}</div>
                  <input
                    type="number"
                    defaultValue={cachets[artist.id] || 0}
                    onChange={e => updateCachet(artist.id, e.target.value)}
                    style={{ width: '80px', background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '8px', padding: '6px 8px', fontFamily: 'inherit', fontSize: '13px', textAlign: 'right' }}
                  />
                </div>
              </Card>
            ))}
          </>
        )}

        {/* Monthly events breakdown */}
        <div style={{ marginTop: '16px' }}>
        {monthTours.length === 0 ? (
          <EmptyState icon="💶" title={`No events in ${MONTHS[earnM]}`} sub="Add events in Tours & Events to see your earnings here." />
        ) : (
          <>
            <SectionLabel>Events this month</SectionLabel>
            {monthTours.map(t => {
              const artist = artists.find(a => a.id === t.aId)
              const count = t.cachetCount || 1
              const cachetAmount = t.customCachet ?? artist?.defaultCachet ?? (cachets[artist?.id || ''] || 0)
              const cachetHours = t.customHours ?? artist?.defaultHours ?? 12
              const totalCachet = cachetAmount * count
              const totalHours = cachetHours * count
              return (
                <div key={t.id} onClick={() => openEventEdit(t)} style={{ cursor: 'pointer' }}>
                <Card style={{ marginBottom: '8px', padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700 }}>{t.start} — {t.title}</div>
                      {artist && <div style={{ fontSize: '11px', color: artist.color }}>{artist.name}</div>}
                      <div style={{ fontSize: '11px', color: '#5A5570' }}>
                        {EVENT_LABELS[t.type]}{count > 1 ? ` · ${count} cachets` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: '#C9A84C' }}>€{totalCachet}</div>
                      <div style={{ fontSize: '11px', color: '#5A5570' }}>{totalHours}h</div>
                    </div>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation()
                        updateTour({ ...t, received: !t.received })
                        await syncToCloud()
                      }}
                      style={{
                        background: t.received ? 'rgba(93,201,160,.15)' : 'rgba(201,168,76,.1)',
                        border: `1px solid ${t.received ? 'rgba(93,201,160,.3)' : 'rgba(201,168,76,.2)'}`,
                        color: t.received ? '#5DC9A0' : '#C9A84C',
                        borderRadius: '6px', padding: '3px 8px', cursor: 'pointer',
                        fontFamily: 'inherit', fontSize: '11px', fontWeight: 700, flexShrink: 0
                      }}
                    >
                      {t.received ? '✓ Paid' : '⏳ Pending'}
                    </button>
                  </div>
                </Card>
                </div>
            })}
          </>
        )}
        </div>
      </div>

      {showPicker && (
        <MonthPicker year={earnY} month={earnM} onChange={(y, m) => setEarnings(y, m)} onClose={() => setShowPicker(false)} />
      )}

      <Modal open={showGoalModal} onClose={() => setShowGoalModal(false)} title="Annual hours goal">
        <p style={{ fontSize: '13px', color: '#5A5570', marginBottom: '16px' }}>
          In France, intermittent du spectacle status requires 507 hours in 12 months. Set your personal goal:
        </p>
        <Input label="Hours goal" type="number" value={goalInput} onChange={e => setGoalInput(e.target.value)} />
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" onClick={() => setShowGoalModal(false)} style={{ flex: 1 }}>Cancel</Button>
          <Button onClick={saveGoal} style={{ flex: 2 }}>Save</Button>
        </div>
      </Modal>

      {/* Event edit modal */}
      <Modal open={!!editingEvent} onClose={() => setEditingEvent(null)} title="Edit cachet">
        {editingEvent && (
          <>
            <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{editingEvent.title}</div>
            <div style={{ fontSize: '12px', color: '#5A5570', marginBottom: '16px' }}>{editingEvent.start}</div>
            <Input label="Number of cachets" type="number" value={editCachetCount} onChange={e => setEditCachetCount(e.target.value)} placeholder="1" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <Input label="€ per cachet" type="number" value={editCachetAmount} onChange={e => setEditCachetAmount(e.target.value)} placeholder="200" />
              <Input label="Hours per cachet" type="number" value={editCachetHours} onChange={e => setEditCachetHours(e.target.value)} placeholder="12" />
            </div>
            {editCachetAmount && editCachetHours && (
              <div style={{ background: '#12121A', borderRadius: '10px', padding: '12px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 900, color: '#C9A84C', fontSize: '18px' }}>€{(parseFloat(editCachetAmount) * (parseInt(editCachetCount) || 1)).toFixed(0)}</div>
                  <div style={{ fontSize: '11px', color: '#5A5570' }}>Total</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 900, color: '#5DC9A0', fontSize: '18px' }}>{(parseFloat(editCachetHours) * (parseInt(editCachetCount) || 1)).toFixed(0)}h</div>
                  <div style={{ fontSize: '11px', color: '#5A5570' }}>Total hours</div>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="secondary" onClick={() => setEditingEvent(null)} style={{ flex: 1 }}>Cancel</Button>
              <Button onClick={saveEventEdit} style={{ flex: 2 }}>Save</Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
