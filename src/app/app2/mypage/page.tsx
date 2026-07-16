'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { Button, Card, Input, Select, Toolbar, showToast } from '@/components/ui'
import { EVENT_COLORS, EVENT_LABELS, MONTHS } from '@/lib/types'

function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = []
  const d = new Date(start + 'T12:00:00')
  const e = new Date(end + 'T12:00:00')
  while (d <= e) { dates.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1) }
  return dates
}

function pad(n: number) { return String(n).padStart(2, '0') }

const DAYS_SHORT = ['S','M','T','W','T','F','S']

export default function MyPagePage() {
  const { tours, artists } = useStore()
  const today = new Date()
  const [startDate, setStartDate] = useState(today.toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState(new Date(Date.now() + 56 * 86400000).toISOString().slice(0, 10))
  const [maskArtists, setMaskArtists] = useState(false)
  const [showSend, setShowSend] = useState(false)

  // Build calendar months between startDate and endDate
  const start = new Date(startDate + 'T12:00:00')
  const end = new Date(endDate + 'T12:00:00')

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

  // Generate months to show
  const months: { year: number, month: number }[] = []
  const cur = new Date(start.getFullYear(), start.getMonth(), 1)
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1)
  while (cur <= endMonth) {
    months.push({ year: cur.getFullYear(), month: cur.getMonth() })
    cur.setMonth(cur.getMonth() + 1)
  }

  // Build share text
  const buildText = () => {
    const lines = ['📅 My Availability', `${startDate} → ${endDate}`, '']
    
    // Find free periods
    const allDates = getDatesInRange(startDate, endDate)
    let freeStart: string | null = null
    const freePeriods: { s: string, e: string }[] = []
    
    for (let i = 0; i < allDates.length; i++) {
      const d = allDates[i]
      const isBusy = !!busyMap[d]
      if (!isBusy) {
        if (!freeStart) freeStart = d
      } else {
        if (freeStart) {
          freePeriods.push({ s: freeStart, e: allDates[i-1] })
          freeStart = null
        }
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
          const events = busyMap[d].map(b => b.tour.title).join(', ')
          lines.push(`  ${d} — ${events}`)
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
    if (via === 'copy') { navigator.clipboard?.writeText(text); showToast('Availability copied!') }
  }

  return (
    <div style={{ padding: '0 0 100px' }}>
      <Toolbar title="My Availability" />
      <div style={{ padding: '0 16px' }}>

        {/* Config */}
        <Card style={{ marginBottom: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            <Input label="From" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <Input label="To" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: '#5A5570' }}>
            <input type="checkbox" checked={maskArtists} onChange={e => setMaskArtists(e.target.checked)} style={{ accentColor: '#C9A84C', width: '16px', height: '16px' }} />
            <span>Mask artist names (show "Occupied" instead)</span>
          </label>
        </Card>

        {/* Calendar view */}
        {months.map(({ year, month }) => {
          const totalDays = new Date(year, month + 1, 0).getDate()
          const firstDay = new Date(year, month, 1).getDay()

          return (
            <Card key={`${year}-${month}`} style={{ marginBottom: '12px' }}>
              <div style={{ fontWeight: 800, fontSize: '15px', marginBottom: '12px', color: '#C9A84C' }}>
                {MONTHS[month]} {year}
              </div>

              {/* Day headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '4px' }}>
                {DAYS_SHORT.map((d, i) => (
                  <div key={i} style={{ textAlign: 'center', fontSize: '10px', fontWeight: 700, color: '#5A5570', padding: '2px 0' }}>{d}</div>
                ))}
              </div>

              {/* Days grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => {
                  const ds = `${year}-${pad(month + 1)}-${pad(day)}`
                  const inRange = ds >= startDate && ds <= endDate
                  const busy = busyMap[ds]
                  const isToday = ds === today.toISOString().slice(0, 10)

                  if (!inRange) {
                    return (
                      <div key={day} style={{ minHeight: '32px', padding: '3px', borderRadius: '6px' }}>
                        <div style={{ fontSize: '11px', color: '#2A2A3A', textAlign: 'center' }}>{day}</div>
                      </div>
                    )
                  }

                  return (
                    <div key={day} style={{
                      minHeight: '32px', padding: '3px', borderRadius: '6px',
                      background: busy ? 'rgba(232,69,60,.15)' : 'rgba(93,201,160,.1)',
                      border: isToday ? '1px solid #C9A84C' : '1px solid transparent',
                    }}>
                      <div style={{ fontSize: '11px', fontWeight: isToday ? 800 : 400, color: isToday ? '#C9A84C' : busy ? '#E8453C' : '#5DC9A0', textAlign: 'center', marginBottom: '2px' }}>{day}</div>
                      {busy && !maskArtists && busy.slice(0, 1).map((b, i) => (
                        <div key={i} style={{ fontSize: '8px', color: b.artist?.color || '#E8453C', fontWeight: 700, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {b.artist?.name?.split(' ')[0] || '●'}
                        </div>
                      ))}
                      {busy && maskArtists && (
                        <div style={{ fontSize: '8px', color: '#E8453C', textAlign: 'center' }}>●</div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Legend for this month */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '10px', fontSize: '11px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(93,201,160,.3)' }} />
                  <span style={{ color: '#5A5570' }}>Available</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(232,69,60,.3)' }} />
                  <span style={{ color: '#5A5570' }}>Occupied</span>
                </div>
              </div>
            </Card>
          )
        })}

        {/* Share buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
          <button onClick={() => share('wa')} style={{ background: '#25D366', border: 'none', color: 'white', borderRadius: '10px', padding: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: '13px' }}>
            💬 WhatsApp
          </button>
          <button onClick={() => share('gmail')} style={{ background: '#EA4335', border: 'none', color: 'white', borderRadius: '10px', padding: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: '13px' }}>
            ✉ Gmail
          </button>
        </div>
        <button onClick={() => share('copy')} style={{ width: '100%', background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '10px', padding: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '13px' }}>
          📋 Copy as text
        </button>
      </div>
    </div>
  )
}
