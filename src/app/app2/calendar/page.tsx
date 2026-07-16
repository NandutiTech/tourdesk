'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { Button, Modal, Card, showToast } from '@/components/ui'
import { MONTHS, EVENT_COLORS, EVENT_LABELS } from '@/lib/types'
import { Tour, Meeting } from '@/lib/types'
import { syncToCloud } from '@/lib/sync'
import { newId } from '@/lib/store'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function pad(n: number) { return String(n).padStart(2, '0') }

function dateStr(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`
}

function humanDate(str: string) {
  const d = new Date(str + 'T12:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
}

// Month/Year picker
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
        <select value={y} onChange={e => setY(parseInt(e.target.value))} style={{
          flex: 1, background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0',
          borderRadius: '8px', padding: '10px', fontFamily: 'inherit', fontSize: '15px', fontWeight: 700
        }}>
          {years.map(yr => <option key={yr} value={yr}>{yr}</option>)}
        </select>
        <select value={m} onChange={e => setM(parseInt(e.target.value))} style={{
          flex: 2, background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0',
          borderRadius: '8px', padding: '10px', fontFamily: 'inherit', fontSize: '15px'
        }}>
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

// Day detail modal
function DayModal({ date, onClose }: { date: string, onClose: () => void }) {
  const { tours, meetings, artists, deleteTour, deleteMeeting } = useStore()
  const dayTours = tours.filter(t => t.start <= date && (t.end || t.start) >= date)
  const dayMeetings = meetings.filter(m => m.date === date)
  const artist = (id: string | null) => id ? artists.find(a => a.id === id) : null

  const handleDeleteTour = async (t: Tour) => {
    if (!confirm(`Delete "${t.title}"?`)) return
    deleteTour(t.id)
    await syncToCloud()
    showToast('Event deleted')
    onClose()
  }

  const handleDeleteMeeting = async (m: Meeting) => {
    if (!confirm(`Delete "${m.title}"?`)) return
    deleteMeeting(m.id)
    await syncToCloud()
    showToast('Meeting deleted')
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={humanDate(date)}>
      {dayTours.length === 0 && dayMeetings.length === 0 && (
        <p style={{ color: '#5A5570', fontSize: '13px' }}>Nothing scheduled on this day.</p>
      )}
      {dayTours.map(t => {
        const a = artist(t.aId)
        return (
          <div key={t.id} style={{ padding: '12px 0', borderBottom: '1px solid #1F1F2E' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: EVENT_COLORS[t.type], flexShrink: 0, marginTop: '3px' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>{t.title}</div>
                {a && <div style={{ fontSize: '12px', color: a.color }}>🎤 {a.name}</div>}
                {t.city && <div style={{ fontSize: '12px', color: '#5A5570' }}>📍 {t.city}</div>}
                {t.hotel && <div style={{ fontSize: '12px', color: '#5A5570' }}>🏨 {t.hotel}{t.room ? ` · Room ${t.room}` : ''}</div>}
                {t.notes && <div style={{ fontSize: '12px', color: '#5A5570', marginTop: '4px' }}>{t.notes}</div>}
                <div style={{ fontSize: '11px', color: '#5A5570', marginTop: '4px' }}>{EVENT_LABELS[t.type]}</div>
              </div>
              <Button variant="danger" size="sm" onClick={() => handleDeleteTour(t)}>✕</Button>
            </div>
          </div>
        )
      })}
      {dayMeetings.map(m => (
        <div key={m.id} style={{ padding: '12px 0', borderBottom: '1px solid #1F1F2E' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{ fontSize: '18px' }}>📞</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '14px' }}>{m.title}</div>
              {m.time && <div style={{ fontSize: '12px', color: '#5A5570' }}>🕐 {m.time}</div>}
              {m.location && <div style={{ fontSize: '12px', color: '#5A5570' }}>📍 {m.location}</div>}
            </div>
            <Button variant="danger" size="sm" onClick={() => handleDeleteMeeting(m)}>✕</Button>
          </div>
        </div>
      ))}
    </Modal>
  )
}

export default function CalendarPage() {
  const { tours, meetings, calY, calM, setCalendar } = useStore()
  const [showPicker, setShowPicker] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const totalDays = new Date(calY, calM + 1, 0).getDate()
  const firstDay = new Date(calY, calM, 1).getDay()

  const getDayEvents = (day: number) => {
    const ds = dateStr(calY, calM, day)
    const t = tours.filter(t => t.start <= ds && (t.end || t.start) >= ds)
    const m = meetings.filter(m => m.date === ds)
    return { tours: t, meetings: m }
  }

  const prevMonth = () => {
    if (calM === 0) setCalendar(calY - 1, 11)
    else setCalendar(calY, calM - 1)
  }

  const nextMonth = () => {
    if (calM === 11) setCalendar(calY + 1, 0)
    else setCalendar(calY, calM + 1)
  }

  const today = new Date()
  const todayStr = dateStr(today.getFullYear(), today.getMonth(), today.getDate())

  return (
    <div style={{ padding: '0 0 100px' }}>
      {/* Header */}
      <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={prevMonth} style={{ background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', fontSize: '16px' }}>‹</button>
        <div
          style={{ flex: 1, textAlign: 'center', fontWeight: 900, fontSize: '18px', letterSpacing: '-0.03em', cursor: 'pointer' }}
          onClick={() => setShowPicker(true)}
        >
          {MONTHS[calM]} <span style={{ color: '#C9A84C' }}>{calY}</span> <span style={{ fontSize: '12px', opacity: 0.5 }}>▾</span>
        </div>
        <button onClick={nextMonth} style={{ background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', fontSize: '16px' }}>›</button>
      </div>

      {/* Day labels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '0 16px', marginBottom: '4px' }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 700, color: '#5A5570', padding: '4px 0' }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '0 16px', gap: '2px' }}>
        {/* Empty cells */}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}

        {/* Days */}
        {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => {
          const ds = dateStr(calY, calM, day)
          const { tours: dayTours, meetings: dayMeetings } = getDayEvents(day)
          const hasEvents = dayTours.length > 0 || dayMeetings.length > 0
          const isToday = ds === todayStr

          return (
            <div
              key={day}
              onClick={() => setSelectedDay(ds)}
              style={{
                minHeight: '52px', padding: '4px', borderRadius: '8px', cursor: 'pointer',
                background: isToday ? 'rgba(201,168,76,.1)' : 'transparent',
                border: isToday ? '1px solid rgba(201,168,76,.3)' : '1px solid transparent',
              }}
            >
              <div style={{
                fontSize: '13px', fontWeight: isToday ? 900 : 400,
                color: isToday ? '#C9A84C' : '#E8E0F0',
                marginBottom: '2px', textAlign: 'center'
              }}>{day}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                {dayTours.slice(0, 3).map(t => (
                  <div key={t.id} style={{
                    height: '4px', borderRadius: '2px',
                    background: EVENT_COLORS[t.type]
                  }} />
                ))}
                {dayMeetings.slice(0, 1).map(m => (
                  <div key={m.id} style={{ height: '4px', borderRadius: '2px', background: '#4C9AC9' }} />
                ))}
                {dayTours.length > 3 && (
                  <div style={{ fontSize: '9px', color: '#5A5570', textAlign: 'center' }}>+{dayTours.length - 3}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{ padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {Object.entries(EVENT_COLORS).map(([type, color]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#5A5570' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: color }} />
            {EVENT_LABELS[type as keyof typeof EVENT_LABELS]}
          </div>
        ))}
      </div>

      {showPicker && (
        <MonthPicker
          year={calY} month={calM}
          onChange={(y, m) => setCalendar(y, m)}
          onClose={() => setShowPicker(false)}
        />
      )}
      {selectedDay && <DayModal date={selectedDay} onClose={() => setSelectedDay(null)} />}
    </div>
  )
}
