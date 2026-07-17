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

type Mode = 'year' | 'month' | 'compare'

export default function DashboardPage() {
  const { tours, artists, cachets, hoursPerEventType, hoursGoal } = useStore()
  const now = new Date()
  const [mode, setMode] = useState<Mode>('year')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [compareYears, setCompareYears] = useState<number[]>([now.getFullYear(), now.getFullYear() - 1])

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 3 + i).reverse()
  const today = now.toISOString().slice(0, 10)

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

  const getYearStats = (y: number) => {
    const filtered = tours.filter(t => t.start.startsWith(String(y)))
    let totalHours = 0, totalEarnings = 0
    const monthly = Array(12).fill(0).map(() => ({ hours: 0, earnings: 0 }))
    for (const t of filtered) {
      const { cachet, hours } = getHoursEarnings(t)
      totalHours += hours; totalEarnings += cachet
      const m = parseInt(t.start.slice(5, 7)) - 1
      monthly[m].hours += hours; monthly[m].earnings += cachet
    }
    return { totalHours, totalEarnings, count: filtered.length, monthly }
  }

  const filterStr = mode === 'month' ? `${year}-${pad(month + 1)}` : String(year)
  const filteredTours = tours.filter(t => t.start.startsWith(mode === 'compare' ? '' : filterStr))
  const { totalHours, totalEarnings, monthly: monthlyData } = getYearStats(year)
  const upcomingCount = tours.filter(t => t.start.startsWith(filterStr) && t.start >= today).length
  const progressPct = Math.min((totalHours / hoursGoal) * 100, 100)
  const maxMonthHours = Math.max(...monthlyData.map(m => m.hours), 1)

  // Month filter
  const monthFilteredTours = tours.filter(t => t.start.startsWith(filterStr))
  let monthTotalHours = 0, monthTotalEarnings = 0
  for (const t of monthFilteredTours) {
    const { cachet, hours } = getHoursEarnings(t)
    monthTotalHours += hours; monthTotalEarnings += cachet
  }

  // Artist stats
  const currentStats = mode === 'month' ? monthFilteredTours : tours.filter(t => t.start.startsWith(String(year)))
  const artistStats = artists.map(artist => {
    const at = currentStats.filter(t => t.aId === artist.id)
    let hours = 0, earnings = 0
    for (const t of at) { const r = getHoursEarnings(t); hours += r.hours; earnings += r.cachet }
    return { artist, hours, earnings, count: at.length }
  }).filter(s => s.count > 0).sort((a, b) => b.hours - a.hours)

  const displayHours = mode === 'month' ? monthTotalHours : totalHours
  const displayEarnings = mode === 'month' ? monthTotalEarnings : totalEarnings
  const displayCount = mode === 'month' ? monthFilteredTours.length : tours.filter(t => t.start.startsWith(String(year))).length
  const label = mode === 'month' ? `${MONTHS[month]} ${year}` : String(year)

  // Compare mode data
  const compareData = compareYears.map(y => ({ year: y, ...getYearStats(y) }))
  const maxCompareHours = Math.max(...compareData.map(d => d.totalHours), 1)
  const maxCompareEarnings = Math.max(...compareData.map(d => d.totalEarnings), 1)
  const COMPARE_COLORS = ['#C9A84C', '#7B8CDE', '#5DC9A0', '#E8453C', '#F39C12', '#9B59B6']

  const toggleCompareYear = (y: number) => {
    setCompareYears(prev =>
      prev.includes(y) ? prev.filter(x => x !== y) : [...prev, y].sort((a, b) => b - a)
    )
  }

  return (
    <div style={{ padding: '0 0 100px' }}>
      <Toolbar title="Dashboard" />
      <div style={{ padding: '0 16px' }}>

        {/* Mode toggle */}
        <div style={{ display: 'flex', background: '#12121A', borderRadius: '10px', padding: '3px', marginBottom: '14px' }}>
          {(['year', 'month', 'compare'] as Mode[]).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: '8px 4px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 700, background: mode === m ? '#C9A84C' : 'transparent', color: mode === m ? '#0A0A0F' : '#5A5570' }}>
              {m === 'year' ? 'Annual' : m === 'month' ? 'Monthly' : 'Compare'}
            </button>
          ))}
        </div>

        {/* COMPARE MODE */}
        {mode === 'compare' && (
          <>
            {/* Year selector chips */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: '#5A5570', marginBottom: '8px' }}>Select years to compare:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {years.map((y, idx) => {
                  const selected = compareYears.includes(y)
                  const color = COMPARE_COLORS[compareYears.indexOf(y)]
                  return (
                    <button key={y} onClick={() => toggleCompareYear(y)} style={{ padding: '6px 14px', borderRadius: '20px', border: `2px solid ${selected ? color : '#1F1F2E'}`, background: selected ? color : 'transparent', color: selected ? '#0A0A0F' : '#5A5570', fontFamily: 'inherit', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                      {y}
                    </button>
                  )
                })}
              </div>
            </div>

            {compareYears.length === 0 ? (
              <EmptyState icon="📊" title="Select at least one year" sub="Tap the years above to compare" />
            ) : (
              <>
                {/* Hours comparison bars */}
                <Card style={{ marginBottom: '12px' }}>
                  <div style={{ fontWeight: 800, fontSize: '13px', marginBottom: '14px' }}>Hours worked</div>
                  {compareData.filter(d => compareYears.includes(d.year)).map((d, idx) => {
                    const color = COMPARE_COLORS[compareYears.indexOf(d.year)]
                    const pct = (d.totalHours / maxCompareHours) * 100
                    return (
                      <div key={d.year} style={{ marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                          <span style={{ fontWeight: 700, color }}>{d.year}</span>
                          <span style={{ fontWeight: 800 }}>{d.totalHours}h</span>
                        </div>
                        <div style={{ background: '#12121A', borderRadius: '6px', height: '10px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: '6px', background: color, width: `${pct}%`, transition: 'width .5s' }} />
                        </div>
                      </div>
                    )
                  })}
                </Card>

                {/* Earnings comparison */}
                <Card style={{ marginBottom: '12px' }}>
                  <div style={{ fontWeight: 800, fontSize: '13px', marginBottom: '14px' }}>Earnings</div>
                  {compareData.filter(d => compareYears.includes(d.year)).map((d, idx) => {
                    const color = COMPARE_COLORS[compareYears.indexOf(d.year)]
                    const pct = (d.totalEarnings / maxCompareEarnings) * 100
                    return (
                      <div key={d.year} style={{ marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                          <span style={{ fontWeight: 700, color }}>{d.year}</span>
                          <span style={{ fontWeight: 800 }}>€{d.totalEarnings.toLocaleString()}</span>
                        </div>
                        <div style={{ background: '#12121A', borderRadius: '6px', height: '10px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: '6px', background: color, width: `${pct}%`, transition: 'width .5s' }} />
                        </div>
                      </div>
                    )
                  })}
                </Card>

                {/* Month by month comparison */}
                <Card style={{ marginBottom: '12px' }}>
                  <div style={{ fontWeight: 800, fontSize: '13px', marginBottom: '14px' }}>Month by month (hours)</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '80px' }}>
                    {Array(12).fill(0).map((_, i) => {
                      const maxH = Math.max(...compareData.filter(d => compareYears.includes(d.year)).map(d => d.monthly[i].hours), 1)
                      return (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                          <div style={{ width: '100%', display: 'flex', alignItems: 'flex-end', height: '60px', gap: '1px' }}>
                            {compareData.filter(d => compareYears.includes(d.year)).map(d => {
                              const color = COMPARE_COLORS[compareYears.indexOf(d.year)]
                              const h = d.monthly[i].hours
                              const pct = (h / Math.max(...compareData.map(x => x.monthly[i].hours), 1)) * 100
                              return (
                                <div key={d.year} style={{ flex: 1, borderRadius: '2px 2px 0 0', height: h > 0 ? `${Math.max(pct, 8)}%` : '2px', background: h > 0 ? color : '#1F1F2E' }} />
                              )
                            })}
                          </div>
                          <div style={{ fontSize: '8px', color: '#5A5570' }}>{MONTHS[i].slice(0, 1)}</div>
                        </div>
                      )
                    })}
                  </div>
                  {/* Legend */}
                  <div style={{ display: 'flex', gap: '12px', marginTop: '10px', flexWrap: 'wrap' }}>
                    {compareData.filter(d => compareYears.includes(d.year)).map(d => (
                      <div key={d.year} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: COMPARE_COLORS[compareYears.indexOf(d.year)] }} />
                        <span style={{ fontSize: '11px', color: '#5A5570' }}>{d.year}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Events count */}
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(compareYears.length, 3)}, 1fr)`, gap: '8px' }}>
                  {compareData.filter(d => compareYears.includes(d.year)).map(d => {
                    const color = COMPARE_COLORS[compareYears.indexOf(d.year)]
                    return (
                      <Card key={d.year} style={{ textAlign: 'center', padding: '12px', borderColor: color + '44' }}>
                        <div style={{ fontSize: '11px', color, fontWeight: 800, marginBottom: '6px' }}>{d.year}</div>
                        <div style={{ fontSize: '20px', fontWeight: 900, color: '#E8E0F0' }}>{d.count}</div>
                        <div style={{ fontSize: '10px', color: '#5A5570' }}>events</div>
                      </Card>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}

        {/* YEAR / MONTH MODE */}
        {mode !== 'compare' && (
          <>
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

            {displayCount === 0 ? (
              <EmptyState icon="📊" title={`No events in ${label}`} sub="Add events in Tours & Events to see your stats here." />
            ) : (
              <>
                <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: '#5A5570', marginBottom: '12px' }}>{label}</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <Card style={{ textAlign: 'center', padding: '16px 12px' }}>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#C9A84C', letterSpacing: '-0.03em' }}>€{displayEarnings.toLocaleString()}</div>
                    <div style={{ fontSize: '11px', color: '#5A5570', marginTop: '4px' }}>Earnings</div>
                  </Card>
                  <Card style={{ textAlign: 'center', padding: '16px 12px' }}>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#5DC9A0', letterSpacing: '-0.03em' }}>{displayHours}h</div>
                    <div style={{ fontSize: '11px', color: '#5A5570', marginTop: '4px' }}>Hours</div>
                  </Card>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                  <Card style={{ textAlign: 'center', padding: '14px 12px' }}>
                    <div style={{ fontSize: '22px', fontWeight: 900, color: '#7B8CDE' }}>{displayCount}</div>
                    <div style={{ fontSize: '11px', color: '#5A5570', marginTop: '2px' }}>Events</div>
                  </Card>
                  <Card style={{ textAlign: 'center', padding: '14px 12px' }}>
                    <div style={{ fontSize: '22px', fontWeight: 900, color: '#F39C12' }}>{upcomingCount}</div>
                    <div style={{ fontSize: '11px', color: '#5A5570', marginTop: '2px' }}>Upcoming</div>
                  </Card>
                </div>

                {mode === 'year' && (
                  <>
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

                    <Card style={{ marginBottom: '16px' }}>
                      <div style={{ fontWeight: 800, fontSize: '13px', marginBottom: '14px' }}>Monthly activity</div>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '80px' }}>
                        {monthlyData.map((m, i) => {
                          const pct = (m.hours / maxMonthHours) * 100
                          const isNow = i === now.getMonth() && year === now.getFullYear()
                          return (
                            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                              <div style={{ width: '100%', display: 'flex', alignItems: 'flex-end', height: '60px' }}>
                                <div style={{ width: '100%', borderRadius: '3px 3px 0 0', height: m.hours > 0 ? `${Math.max(pct, 8)}%` : '3px', background: isNow ? '#C9A84C' : m.hours > 0 ? '#7B8CDE' : '#1F1F2E' }} />
                              </div>
                              <div style={{ fontSize: '8px', color: isNow ? '#C9A84C' : '#5A5570', fontWeight: isNow ? 800 : 400 }}>{MONTHS[i].slice(0, 1)}</div>
                            </div>
                          )
                        })}
                      </div>
                    </Card>
                  </>
                )}

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
                        {displayHours > 0 && (
                          <div style={{ background: '#12121A', borderRadius: '4px', height: '4px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: artist.color, width: `${Math.min((hours / displayHours) * 100, 100)}%` }} />
                          </div>
                        )}
                      </Card>
                    ))}
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
