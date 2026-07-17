'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { Card, EmptyState, Toolbar } from '@/components/ui'
import { MONTHS } from '@/lib/types'

function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = []
  const d = new Date(start + 'T12:00:00')
  const e = new Date(end + 'T12:00:00')
  while (d <= e) { dates.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1) }
  return dates
}

function pad(n: number) { return String(n).padStart(2, '0') }

type Mode = 'year' | 'month'

export default function DashboardPage() {
  const { tours, artists, cachets, hoursPerEventType, hoursGoal } = useStore()
  const now = new Date()
  const [mode, setMode] = useState<Mode>('year')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)
  const today = now.toISOString().slice(0, 10)

  const filterStr = mode === 'year' ? String(year) : `${year}-${pad(month + 1)}`

  const getHoursEarnings = (t: any) => {
    const artist = artists.find(a => a.id === t.aId)
    const cachet = t.customCachet ?? (artist?.id ? (cachets[artist.id] || 0) : 0)
    const hd = (hoursPerEventType as any)[t.type] || 1
    const hours = t.customHours ?? (
      ['residence', 'tournage', 'figuration', 'workday'].includes(t.type)
        ? getDatesInRange(t.start, t.end || t.start).length * hd : hd
    )
    return { cachet, hours }
  }

  const filteredTours = tours.filter(t => t.start.startsWith(filterStr))

  let totalHours = 0, totalEarnings = 0
  for (const t of filteredTours) {
    const { cachet, hours } = getHoursEarnings(t)
    totalHours += hours
    totalEarnings += cachet
  }

  const upcomingCount = filteredTours.filter(t => t.start >= today).length
  const progressPct = Math.min((totalHours / hoursGoal) * 100, 100)

  // Monthly bars (for year view)
  const monthlyHours = Array(12).fill(0)
  const monthlyEarnings = Array(12).fill(0)
  if (mode === 'year') {
    for (const t of filteredTours) {
      const { cachet, hours } = getHoursEarnings(t)
      const m = parseInt(t.start.slice(5, 7)) - 1
      monthlyHours[m] += hours
      monthlyEarnings[m] += cachet
    }
  }
  const maxMonthHours = Math.max(...monthlyHours, 1)

  // Per artist
  const artistStats = artists.map(artist => {
    const at = filteredTours.filter(t => t.aId === artist.id)
    let hours = 0, earnings = 0
    for (const t of at) { const r = getHoursEarnings(t); hours += r.hours; earnings += r.cachet }
    return { artist, hours, earnings, count: at.length }
  }).filter(s => s.count > 0).sort((a, b) => b.hours - a.hours)

  const label = mode === 'year' ? String(year) : `${MONTHS[month]} ${year}`

  return (
    <div style={{ padding: '0 0 100px' }}>
      <Toolbar title="Dashboard" />
      <div style={{ padding: '0 16px' }}>

        {/* Mode toggle */}
        <div style={{ display: 'flex', background: '#12121A', borderRadius: '10px', padding: '3px', marginBottom: '14px' }}>
          <button onClick={() => setMode('year')} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: 700, background: mode === 'year' ? '#C9A84C' : 'transparent', color: mode === 'year' ? '#0A0A0F' : '#5A5570' }}>Annual</button>
          <button onClick={() => setMode('month')} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: 700, background: mode === 'month' ? '#C9A84C' : 'transparent', color: mode === 'month' ? '#0A0A0F' : '#5A5570' }}>Monthly</button>
        </div>

        {/* Period selector */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} style={{ flex: 1, background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '8px', padding: '9px 12px', fontFamily: 'inherit', fontSize: '14px', fontWeight: 700 }}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {mode === 'month' && (
            <select value={month} onChange={e => setMonth(parseInt(e.target.value))} style={{ flex: 2, background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '8px', padding: '9px 12px', fontFamily: 'inherit', fontSize: '14px' }}>
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          )}
        </div>

        {filteredTours.length === 0 ? (
          <EmptyState icon="📊" title={`No events in ${label}`} sub="Add events in Tours & Events to see your stats here." />
        ) : (
          <>
            <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: '#5A5570', marginBottom: '12px' }}>{label}</div>

            {/* Top stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <Card style={{ textAlign: 'center', padding: '16px 12px' }}>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#C9A84C', letterSpacing: '-0.03em' }}>€{totalEarnings.toLocaleString()}</div>
                <div style={{ fontSize: '11px', color: '#5A5570', marginTop: '4px' }}>Total earnings</div>
              </Card>
              <Card style={{ textAlign: 'center', padding: '16px 12px' }}>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#5DC9A0', letterSpacing: '-0.03em' }}>{totalHours}h</div>
                <div style={{ fontSize: '11px', color: '#5A5570', marginTop: '4px' }}>Hours worked</div>
              </Card>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <Card style={{ textAlign: 'center', padding: '14px 12px' }}>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#7B8CDE' }}>{filteredTours.length}</div>
                <div style={{ fontSize: '11px', color: '#5A5570', marginTop: '2px' }}>Events</div>
              </Card>
              <Card style={{ textAlign: 'center', padding: '14px 12px' }}>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#F39C12' }}>{upcomingCount}</div>
                <div style={{ fontSize: '11px', color: '#5A5570', marginTop: '2px' }}>Upcoming</div>
              </Card>
            </div>

            {/* Hours progress - only for year view */}
            {mode === 'year' && (
              <Card style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontWeight: 800, fontSize: '13px' }}>Hours goal {year}</div>
                  <div style={{ fontSize: '12px', color: '#5A5570' }}>{totalHours}h / {hoursGoal}h</div>
                </div>
                <div style={{ background: '#12121A', borderRadius: '8px', height: '10px', overflow: 'hidden', marginBottom: '8px' }}>
                  <div style={{ height: '100%', borderRadius: '8px', background: progressPct >= 100 ? '#5DC9A0' : 'linear-gradient(90deg, #C9A84C, #F39C12)', width: `${progressPct}%`, transition: 'width .5s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: progressPct >= 100 ? '#5DC9A0' : '#C9A84C', fontWeight: 700 }}>{progressPct.toFixed(0)}%</span>
                  <span style={{ color: '#5A5570' }}>{progressPct >= 100 ? '🎉 Goal reached!' : `${Math.max(hoursGoal - totalHours, 0)}h to go`}</span>
                </div>
              </Card>
            )}

            {/* Monthly bar chart - only for year view */}
            {mode === 'year' && (
              <Card style={{ marginBottom: '16px' }}>
                <div style={{ fontWeight: 800, fontSize: '13px', marginBottom: '14px' }}>Monthly activity</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '80px' }}>
                  {MONTHS.map((m, i) => {
                    const h = monthlyHours[i]
                    const pct = (h / maxMonthHours) * 100
                    const isNow = i === now.getMonth() && year === now.getFullYear()
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: '100%', display: 'flex', alignItems: 'flex-end', height: '60px' }}>
                          <div style={{ width: '100%', borderRadius: '3px 3px 0 0', height: h > 0 ? `${Math.max(pct, 8)}%` : '3px', background: isNow ? '#C9A84C' : h > 0 ? '#7B8CDE' : '#1F1F2E' }} />
                        </div>
                        <div style={{ fontSize: '8px', color: isNow ? '#C9A84C' : '#5A5570', fontWeight: isNow ? 800 : 400 }}>{m.slice(0, 1)}</div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}

            {/* Per artist */}
            {artistStats.length > 0 && (
              <>
                <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: '#5A5570', marginBottom: '10px' }}>By artist</div>
                {artistStats.map(({ artist, hours, earnings, count }) => (
                  <Card key={artist.id} style={{ marginBottom: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: artist.color, flexShrink: 0 }} />
                      <div style={{ flex: 1, fontWeight: 700, fontSize: '14px' }}>{artist.name}</div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, color: '#C9A84C', fontSize: '14px' }}>€{earnings.toLocaleString()}</div>
                        <div style={{ fontSize: '11px', color: '#5DC9A0' }}>{hours}h · {count} event{count !== 1 ? 's' : ''}</div>
                      </div>
                    </div>
                    {totalHours > 0 && (
                      <div style={{ background: '#12121A', borderRadius: '4px', height: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: artist.color, width: `${Math.min((hours / totalHours) * 100, 100)}%` }} />
                      </div>
                    )}
                  </Card>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
