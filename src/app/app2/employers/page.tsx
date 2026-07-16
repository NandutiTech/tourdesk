'use client'
import { useStore } from '@/lib/store'
import { Card, EmptyState, Toolbar } from '@/components/ui'
import { EVENT_LABELS } from '@/lib/types'

function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = []
  const d = new Date(start + 'T12:00:00')
  const e = new Date(end + 'T12:00:00')
  while (d <= e) { dates.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1) }
  return dates
}

export default function EmployersPage() {
  const { tours, artists, cachets, hoursPerEventType } = useStore()

  if (artists.length === 0) {
    return (
      <div style={{ padding: '0 0 100px' }}>
        <Toolbar title="Employer History" />
        <div style={{ padding: '0 16px' }}>
          <EmptyState icon="📊" title="No artists yet" sub="Add employers / artists to see stats per employer." />
        </div>
      </div>
    )
  }

  const stats = artists.map(artist => {
    const artistTours = tours.filter(t => t.aId === artist.id)
    let totalCachet = 0
    let totalHours = 0
    for (const t of artistTours) {
      const cachet = t.customCachet ?? (cachets[artist.id] || 0)
      const hoursDefault = (hoursPerEventType as any)[t.type] || 1
      const hours = t.customHours ?? (
        ['residence', 'tournage', 'figuration', 'workday'].includes(t.type)
          ? getDatesInRange(t.start, t.end || t.start).length * hoursDefault
          : hoursDefault
      )
      totalCachet += cachet
      totalHours += hours
    }

    // Event type breakdown
    const breakdown: Record<string, number> = {}
    for (const t of artistTours) {
      breakdown[t.type] = (breakdown[t.type] || 0) + 1
    }

    const lastDate = artistTours.map(t => t.start).sort().reverse()[0]

    return { artist, totalCachet, totalHours, count: artistTours.length, breakdown, lastDate }
  }).sort((a, b) => b.totalHours - a.totalHours)

  const totalAllCachet = stats.reduce((s, r) => s + r.totalCachet, 0)
  const totalAllHours = stats.reduce((s, r) => s + r.totalHours, 0)

  return (
    <div style={{ padding: '0 0 100px' }}>
      <Toolbar title="Employer History" />
      <div style={{ padding: '0 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          <Card style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#C9A84C' }}>€{totalAllCachet.toFixed(0)}</div>
            <div style={{ fontSize: '11px', color: '#5A5570' }}>Total earnings</div>
          </Card>
          <Card style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#5DC9A0' }}>{totalAllHours}h</div>
            <div style={{ fontSize: '11px', color: '#5A5570' }}>Total hours</div>
          </Card>
        </div>

        {stats.map(({ artist, totalCachet, totalHours, count, breakdown, lastDate }) => (
          <Card key={artist.id} style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: artist.color, flexShrink: 0, marginTop: '4px' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, fontSize: '15px' }}>{artist.name}</div>
                {lastDate && <div style={{ fontSize: '11px', color: '#5A5570' }}>Last: {lastDate}</div>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, color: '#C9A84C' }}>€{totalCachet.toFixed(0)}</div>
                <div style={{ fontSize: '12px', color: '#5DC9A0' }}>{totalHours}h</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {Object.entries(breakdown).map(([type, n]) => (
                <div key={type} style={{ background: '#12121A', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', color: '#5A5570' }}>
                  {n}× {EVENT_LABELS[type as keyof typeof EVENT_LABELS] || type}
                </div>
              ))}
            </div>

            {totalCachet > 0 && (
              <div style={{ marginTop: '10px' }}>
                <div style={{ background: '#12121A', borderRadius: '4px', height: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: artist.color, width: `${Math.min((totalCachet / totalAllCachet) * 100, 100)}%` }} />
                </div>
                <div style={{ fontSize: '10px', color: '#5A5570', marginTop: '4px' }}>{((totalCachet / totalAllCachet) * 100).toFixed(0)}% of total earnings</div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
