'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { Button, Card, Toolbar, showToast } from '@/components/ui'
import { MONTHS } from '@/lib/types'

function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = []
  const d = new Date(start + 'T12:00:00')
  const e = new Date(end + 'T12:00:00')
  while (d <= e) { dates.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1) }
  return dates
}

function pad(n: number) { return String(n).padStart(2, '0') }
const DAYS = ['S','M','T','W','T','F','S']

// Inline calendar for picking a date range
function RangePicker({ startDate, endDate, onSelect }: {
  startDate: string, endDate: string,
  onSelect: (start: string, end: string) => void
}) {
  const today = new Date()
  const [viewY, setViewY] = useState(today.getFullYear())
  const [viewM, setViewM] = useState(today.getMonth())
  const [picking, setPicking] = useState<'start' | 'end'>('start')
  const [tempStart, setTempStart] = useState(startDate)
  const [tempEnd, setTempEnd] = useState(endDate)

  const totalDays = new Date(viewY, viewM + 1, 0).getDate()
  const firstDay = new Date(viewY, viewM, 1).getDay()

  const prevMonth = () => { if (viewM === 0) { setViewM(11); setViewY(y => y - 1) } else setViewM(m => m - 1) }
  const nextMonth = () => { if (viewM === 11) { setViewM(0); setViewY(y => y + 1) } else setViewM(m => m + 1) }

  const selectDay = (ds: string) => {
    if (picking === 'start') {
      setTempStart(ds)
      setTempEnd(ds)
      setPicking('end')
    } else {
      if (ds < tempStart) {
        setTempStart(ds)
        setPicking('end')
      } else {
        setTempEnd(ds)
        setPicking('start')
        onSelect(tempStart, ds)
      }
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <button onClick={prevMonth} style={{ background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '14px' }}>‹</button>
        <div style={{ flex: 1, textAlign: 'center', fontWeight: 800, fontSize: '14px' }}>{MONTHS[viewM]} {viewY}</div>
        <button onClick={nextMonth} style={{ background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '14px' }}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '4px' }}>
        {DAYS.map((d, i) => <div key={i} style={{ textAlign: 'center', fontSize: '10px', fontWeight: 700, color: '#5A5570' }}>{d}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => {
          const ds = `${viewY}-${pad(viewM + 1)}-${pad(day)}`
          const inRange = ds >= tempStart && ds <= tempEnd
          const isStart = ds === tempStart
          const isEnd = ds === tempEnd
          const isToday = ds === today.toISOString().slice(0, 10)
          return (
            <div key={day} onClick={() => selectDay(ds)} style={{
              textAlign: 'center', padding: '5px 2px', borderRadius: '6px', cursor: 'pointer',
              fontSize: '12px', fontWeight: isStart || isEnd ? 900 : 400,
              background: isStart || isEnd ? '#C9A84C' : inRange ? 'rgba(201,168,76,.2)' : 'transparent',
              color: isStart || isEnd ? '#0A0A0F' : isToday ? '#C9A84C' : '#E8E0F0',
              border: isToday && !isStart && !isEnd ? '1px solid rgba(201,168,76,.4)' : '1px solid transparent'
            }}>{day}</div>
          )
        })}
      </div>
      <div style={{ marginTop: '10px', fontSize: '12px', color: '#5A5570', textAlign: 'center' }}>
        {picking === 'start' ? 'Tap start date' : `From ${tempStart} — tap end date`}
      </div>
    </div>
  )
}

export default function MyPagePage() {
  const { tours, artists } = useStore()
  const today = new Date()
  const [startDate, setStartDate] = useState(today.toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState(new Date(Date.now() + 56 * 86400000).toISOString().slice(0, 10))
  const [maskArtists, setMaskArtists] = useState(false)

  // Build busy date map
  const busyMap: Record<string, { tour: any, artist: any }[]> = {}
  for (const t of tours) {
    const dates = getDatesInRange(t.start, t.end || t.start)
    for (const d of dates) {
      if (d >= startDate && d <= endDate) {
        if (!busyMap[d]) busyMap[d] = []
        busyMap[d].push({ tour: t, artist: artists.find(a => a.id === t.aId) })
      }
    }
  }

  // Generate months
  const months: { year: number, month: number }[] = []
  const cur = new Date(new Date(startDate + 'T12:00:00').getFullYear(), new Date(startDate + 'T12:00:00').getMonth(), 1)
  const endM = new Date(new Date(endDate + 'T12:00:00').getFullYear(), new Date(endDate + 'T12:00:00').getMonth(), 1)
  while (cur <= endM) {
    months.push({ year: cur.getFullYear(), month: cur.getMonth() })
    cur.setMonth(cur.getMonth() + 1)
  }

  // Build share text
  const buildText = () => {
    const lines = ['📅 My Availability', `${startDate} → ${endDate}`, '']
    const allDates = getDatesInRange(startDate, endDate)
    let freeStart: string | null = null
    const freePeriods: { s: string, e: string }[] = []
    for (let i = 0; i < allDates.length; i++) {
      const d = allDates[i]
      if (!busyMap[d]) {
        if (!freeStart) freeStart = d
      } else {
        if (freeStart) { freePeriods.push({ s: freeStart, e: allDates[i-1] }); freeStart = null }
      }
    }
    if (freeStart) freePeriods.push({ s: freeStart, e: allDates[allDates.length - 1] })

    if (freePeriods.length > 0) {
      lines.push('✅ Available:')
      freePeriods.forEach(p => lines.push(`  ${p.s}${p.e !== p.s ? ` → ${p.e}` : ''}`))
      lines.push('')
    }
    const busyDates = Object.keys(busyMap).sort()
    if (busyDates.length > 0) {
      lines.push('❌ Not available:')
      busyDates.forEach(d => {
        if (!maskArtists) {
          lines.push(`  ${d} — ${busyMap[d].map(b => b.tour.title).join(', ')}`)
        } else {
          lines.push(`  ${d} — Occupied`)
        }
      })
    }
    return lines.join('\n')
  }

  const share = (via: string) => {
    const text = buildText()
    if (via === 'wa') window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    if (via === 'gmail') window.open(`https://mail.google.com/mail/?view=cm&tf=1&su=${encodeURIComponent('Mes disponibilités')}&body=${encodeURIComponent(text)}`, '_blank')
    if (via === 'copy') { navigator.clipboard?.writeText(text); showToast('Copied!') }
  }

  return (
    <div style={{ padding: '0 0 100px' }}>
      <Toolbar title="My Availability" />
      <div style={{ padding: '0 16px' }}>

        {/* Date range picker */}
        <Card style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: '#5A5570', marginBottom: '12px' }}>
            Selected: <strong style={{ color: '#E8E0F0' }}>{startDate}</strong> → <strong style={{ color: '#E8E0F0' }}>{endDate}</strong>
          </div>
          <RangePicker
            startDate={startDate}
            endDate={endDate}
            onSelect={(s, e) => { setStartDate(s); setEndDate(e) }}
          />
        </Card>

        {/* Options */}
        <Card style={{ marginBottom: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px' }}>
            <input type="checkbox" checked={maskArtists} onChange={e => setMaskArtists(e.target.checked)} style={{ accentColor: '#C9A84C', width: '16px', height: '16px' }} />
            <div>
              <div style={{ fontWeight: 700 }}>Mask artist names</div>
              <div style={{ fontSize: '11px', color: '#5A5570' }}>Show "Occupied" instead of artist name when sharing</div>
            </div>
          </label>
        </Card>

        {/* Calendar view */}
        {months.map(({ year, month }) => {
          const totalDays = new Date(year, month + 1, 0).getDate()
          const firstDay = new Date(year, month, 1).getDay()
          const todayStr = today.toISOString().slice(0, 10)
          return (
            <Card key={`${year}-${month}`} style={{ marginBottom: '12px' }}>
              <div style={{ fontWeight: 800, fontSize: '14px', color: '#C9A84C', marginBottom: '10px' }}>{MONTHS[month]} {year}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '2px' }}>
                {DAYS.map((d, i) => <div key={i} style={{ textAlign: 'center', fontSize: '10px', fontWeight: 700, color: '#5A5570' }}>{d}</div>)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => {
                  const ds = `${year}-${pad(month + 1)}-${pad(day)}`
                  const inRange = ds >= startDate && ds <= endDate
                  const busy = busyMap[ds]
                  const isToday = ds === todayStr
                  if (!inRange) return <div key={day} style={{ padding: '4px', textAlign: 'center', fontSize: '11px', color: '#2A2A3A' }}>{day}</div>
                  return (
                    <div key={day} style={{ minHeight: '30px', padding: '3px', borderRadius: '5px', background: busy ? 'rgba(232,69,60,.15)' : 'rgba(93,201,160,.1)', border: isToday ? '1px solid #C9A84C' : '1px solid transparent' }}>
                      <div style={{ fontSize: '11px', textAlign: 'center', fontWeight: isToday ? 800 : 400, color: isToday ? '#C9A84C' : busy ? '#E8453C' : '#5DC9A0' }}>{day}</div>
                      {busy && !maskArtists && (
                        <div style={{ fontSize: '7px', color: busy[0].artist?.color || '#E8453C', textAlign: 'center', fontWeight: 700, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {busy[0].artist?.name?.split(' ')[0] || '●'}
                        </div>
                      )}
                      {busy && maskArtists && <div style={{ fontSize: '8px', color: '#E8453C', textAlign: 'center' }}>●</div>}
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '11px' }}>
                <span style={{ color: '#5DC9A0' }}>● Available</span>
                <span style={{ color: '#E8453C' }}>● Occupied</span>
              </div>
            </Card>
          )
        })}

        {/* Share */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
          <button onClick={() => share('wa')} style={{ background: '#25D366', border: 'none', color: 'white', borderRadius: '10px', padding: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: '13px' }}>💬 WhatsApp</button>
          <button onClick={() => share('gmail')} style={{ background: '#EA4335', border: 'none', color: 'white', borderRadius: '10px', padding: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: '13px' }}>✉ Gmail</button>
        </div>
        <button onClick={() => share('copy')} style={{ width: '100%', background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '10px', padding: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '13px' }}>📋 Copy as text</button>
      </div>
    </div>
  )
}
