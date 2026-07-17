'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { Card, EmptyState, Toolbar } from '@/components/ui'
import { EVENT_LABELS, MONTHS } from '@/lib/types'

function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = []
  const d = new Date(start + 'T12:00:00')
  const e = new Date(end + 'T12:00:00')
  while (d <= e) { dates.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1) }
  return dates
}

export default function DashboardPage() {
  const { tours, artists, cachets, hoursPerEventType, hoursGoal } = useStore()
  const now = new Date()
  const yearStr = String(now.getFullYear())
  const today = now.toISOString().slice(0, 10)

  // Annual stats
  let annualHours = 0
  let annualEarnings = 0
  const monthlyHours: number[] = Array(12).fill(0)
  const monthlyEarnings: number[] = Array(12).fill(0)

  for (const t of tours.filter(t => t.start.startsWith(yearStr))) {
    const artist = artists.find(a => a.id === t.aId)
    const cachet = t.customCachet ?? (artist?.id ? (cachets[artist.id] || 0) : 0)
    const hoursDefault = (hoursPerEventType as any)[t.type] || 1
    const hours = t.customHours ?? (
      ['residence', 'tournage', 'figuration', 'workday'].includes(t.type)
        ? getDatesInRange(t.start, t.end || t.start).length * hoursDefault
        : hoursDefault
    )
    const month = parseInt(t.start.slice(5, 7)) - 1
    annualHours += hours
    annualEarnings += cachet
    monthlyHours[month] += hours
    monthlyEarnings[month] += cachet
  }

  const progressPct = Math.min((annualHours / hoursGoal) * 100, 100)
  const remaining = Math.max(hoursGoal - annualHours, 0)
  const upcomingTours = tours.filter(t => t.start >= today).length
  const maxMonthHours = Math.max(...monthlyHours, 1)

  // Per artist stats
  const artistStats = artists.map(artist => {
    const artistTours = tours.filter(t => t.aId === artist.id && t.start.startsWith(yearStr))
    let hours = 0, earnings = 0
    for (const t of artistTours) {
      const cachet = t.customCachet ?? (cachets[artist.id] || 0)
      const hd = (hoursPerEventType as any)[t.type] || 1
      const h = t.customHours ?? (['residence','tournage','figuration','workday'].includes(t.type) ? getDatesInRange(t.start, t.end||t.start).length * hd : hd)
      hours += h; earnings += cachet
    }
    return { artist, hours, earnings, count: artistTours.length }
  }).filter(s => s.count > 0).sort((a, b) => b.hours - a.hours)

  return (
    <div style={{ padding: '0 0 100px' }}>
      <Toolbar title="Dashboard" />
      <div style={{ padding: '0 16px' }}>

        {tours.length === 0 ? (
          <EmptyState icon="📊" title="No data yet" sub="Add events in Tours & Events to see your stats here." />
        ) : (
          <>
            {/* Year header */}
            <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: '#5A5570', marginBottom: '12px' }}>{yearStr} Overview</div>

            {/* Top stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <Card style={{ textAlign: 'center', padding: '16px 12px' }}>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#C9A84C', letterSpacing: '-0.03em' }}>€{annualEarnings.toLocaleString()}</div>
                <div style={{ fontSize: '11px', color: '#5A5570', marginTop: '4px' }}>Total earnings</div>
              </Card>
              <Card style={{ textAlign: 'center', padding: '16px 12px' }}>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#5DC9A0', letterSpacing: '-0.03em' }}>{annualHours}h</div>
                <div style={{ fontSize: '11px', color: '#5A5570', marginTop: '4px' }}>Hours worked</div>
              </Card>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <Card style={{ textAlign: 'center', padding: '14px 12px' }}>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#7B8CDE' }}>{tours.filter(t => t.start.startsWith(yearStr)).length}</div>
                <div style={{ fontSize: '11px', color: '#5A5570', marginTop: '2px' }}>Events this year</div>
              </Card>
              <Card style={{ textAlign: 'center', padding: '14px 12px' }}>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#F39C12' }}>{upcomingTours}</div>
                <div style={{ fontSize: '11px', color: '#5A5570', marginTop: '2px' }}>Upcoming</div>
              </Card>
            </div>

            {/* Hours progress */}
            <Card style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontWeight: 800, fontSize: '13px' }}>Hours goal {yearStr}</div>
                <div style={{ fontSize: '12px', color: '#5A5570' }}>{annualHours}h / {hoursGoal}h</div>
              </div>
              <div style={{ background: '#12121A', borderRadius: '8px', height: '10px', overflow: 'hidden', marginBottom: '8px' }}>
                <div style={{ height: '100%', borderRadius: '8px', background: progressPct >= 100 ? '#5DC9A0' : 'linear-gradient(90deg, #C9A84C, #F39C12)', width: `${progressPct}%`, transition: 'width .5s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: progressPct >= 100 ? '#5DC9A0' : '#C9A84C', fontWeight: 700 }}>{progressPct.toFixed(0)}%</span>
                <span style={{ color: '#5A5570' }}>{progressPct >= 100 ? '🎉 Goal reached!' : `${remaining}h to go`}</span>
              </div>
            </Card>

            {/* Monthly activity bar chart */}
            <Card style={{ marginBottom: '16px' }}>
              <div style={{ fontWeight: 800, fontSize: '13px', marginBottom: '14px' }}>Monthly activity</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '80px' }}>
                {MONTHS.map((m, i) => {
                  const h = monthlyHours[i]
                  const pct = (h / maxMonthHours) * 100
                  const isCurrentMonth = i === now.getMonth()
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '100%', display: 'flex', alignItems: 'flex-end', height: '60px' }}>
                        <div style={{
                          width: '100%', borderRadius: '4px 4px 0 0',
                          height: h > 0 ? `${Math.max(pct, 8)}%` : '3px',
                          background: isCurrentMonth ? '#C9A84C' : h > 0 ? '#7B8CDE' : '#1F1F2E',
                          transition: 'height .3s'
                        }} />
                      </div>
                      <div style={{ fontSize: '8px', color: isCurrentMonth ? '#C9A84C' : '#5A5570', fontWeight: isCurrentMonth ? 800 : 400 }}>
                        {m.slice(0, 1)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Per artist breakdown */}
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
                    {annualHours > 0 && (
                      <div style={{ background: '#12121A', borderRadius: '4px', height: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: artist.color, width: `${Math.min((hours / annualHours) * 100, 100)}%` }} />
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
