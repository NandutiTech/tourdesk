'use client'
import { useStore } from '@/lib/store'
import { Card, EmptyState, Toolbar } from '@/components/ui'
import { EVENT_COLORS, EVENT_LABELS } from '@/lib/types'

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

export default function AlertsPage() {
  const { tours, meetings, artists } = useStore()
  const today = new Date().toISOString().slice(0, 10)
  const in14 = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  const in24h = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

  // Build date map
  const dateMap: Record<string, string[]> = {}
  for (const t of tours) {
    const dates = getDatesInRange(t.start, t.end || t.start)
    for (const d of dates) {
      if (!dateMap[d]) dateMap[d] = []
      dateMap[d].push(t.id)
    }
  }

  // Conflicts
  const conflicts = Object.entries(dateMap)
    .filter(([, ids]) => ids.length > 1)
    .sort(([a], [b]) => a.localeCompare(b))

  // Upcoming (next 14 days)
  const upcoming = tours
    .filter(t => t.start >= today && t.start <= in14)
    .sort((a, b) => a.start.localeCompare(b.start))

  // Upcoming meetings (next 24h)
  const urgentMeetings = meetings
    .filter(m => m.date >= today && m.date <= in24h)
    .sort((a, b) => a.date.localeCompare(b.date))

  const artist = (id: string | null) => id ? artists.find(a => a.id === id) : null

  return (
    <div style={{ padding: '0 0 100px' }}>
      <Toolbar title="Alerts" />
      <div style={{ padding: '0 16px' }}>

        {/* Conflicts */}
        {conflicts.length > 0 && (
          <>
            <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: '#E8453C', marginBottom: '10px' }}>
              ⚠️ Scheduling conflicts
            </div>
            {conflicts.map(([date, ids]) => {
              const conflictTours = tours.filter(t => ids.includes(t.id))
              return (
                <Card key={date} style={{ marginBottom: '10px', borderColor: 'rgba(232,69,60,.3)', background: 'rgba(232,69,60,.05)' }}>
                  <div style={{ fontWeight: 800, fontSize: '13px', color: '#E8453C', marginBottom: '8px' }}>
                    ⚠ {date}
                  </div>
                  {conflictTours.map(t => {
                    const a = artist(t.aId)
                    return (
                      <div key={t.id} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: EVENT_COLORS[t.type], flexShrink: 0 }} />
                        <div style={{ fontSize: '13px' }}>{t.title}</div>
                        {a && <div style={{ fontSize: '11px', color: a.color }}>· {a.name}</div>}
                      </div>
                    )
                  })}
                </Card>
              )
            })}
          </>
        )}

        {/* Urgent meetings */}
        {urgentMeetings.length > 0 && (
          <>
            <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: '10px', marginTop: '16px' }}>
              🔔 Meetings in the next 24 hours
            </div>
            {urgentMeetings.map(m => (
              <Card key={m.id} style={{ marginBottom: '10px', borderColor: 'rgba(201,168,76,.3)' }}>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>{m.title}</div>
                <div style={{ fontSize: '12px', color: '#5A5570' }}>{m.date}{m.time ? ` at ${m.time}` : ''}</div>
              </Card>
            ))}
          </>
        )}

        {/* Upcoming events */}
        {upcoming.length > 0 && (
          <>
            <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: '#5A5570', marginBottom: '10px', marginTop: '16px' }}>
              📅 Next 14 days
            </div>
            {upcoming.map(t => {
              const a = artist(t.aId)
              return (
                <Card key={t.id} style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: EVENT_COLORS[t.type], flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '13px' }}>{t.start} — {t.title}</div>
                    {a && <div style={{ fontSize: '11px', color: a.color }}>{a.name}</div>}
                    {t.city && <div style={{ fontSize: '11px', color: '#5A5570' }}>📍 {t.city}</div>}
                  </div>
                  <div style={{ fontSize: '11px', color: '#5A5570' }}>{EVENT_LABELS[t.type]}</div>
                </Card>
              )
            })}
          </>
        )}

        {conflicts.length === 0 && upcoming.length === 0 && urgentMeetings.length === 0 && (
          <EmptyState icon="✅" title="All clear!" sub="No conflicts or urgent events in the next 14 days." />
        )}
      </div>
    </div>
  )
}
