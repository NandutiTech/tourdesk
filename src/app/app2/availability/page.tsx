'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { Button, Card, Input, Toolbar } from '@/components/ui'
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

export default function AvailabilityPage() {
  const { tours, artists } = useStore()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [result, setResult] = useState<{ free: boolean, conflicts: any[] } | null>(null)

  const check = () => {
    if (!startDate) return
    const end = endDate || startDate
    const requestedDates = getDatesInRange(startDate, end)

    const conflicts: any[] = []
    for (const t of tours) {
      const eventDates = getDatesInRange(t.start, t.end || t.start)
      const overlap = requestedDates.filter(d => eventDates.includes(d))
      if (overlap.length > 0) {
        const artist = artists.find(a => a.id === t.aId)
        conflicts.push({ tour: t, artist, overlapDates: overlap })
      }
    }

    setResult({ free: conflicts.length === 0, conflicts })
  }

  return (
    <div style={{ padding: '0 0 100px' }}>
      <Toolbar title="Check Availability" />
      <div style={{ padding: '0 16px' }}>
        <Card style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '13px', color: '#5A5570', marginBottom: '16px', lineHeight: 1.6 }}>
            Before saying yes to a new offer, check if you're already booked on those dates.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            <Input label="From *" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <Input label="To" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <Button onClick={check} style={{ width: '100%' }}>Check availability</Button>
        </Card>

        {result && (
          <Card style={{
            borderColor: result.free ? 'rgba(93,201,160,.3)' : 'rgba(232,69,60,.3)',
            background: result.free ? 'rgba(93,201,160,.05)' : 'rgba(232,69,60,.05)'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{result.free ? '✅' : '⚠️'}</div>
            <div style={{ fontWeight: 900, fontSize: '16px', marginBottom: '4px', color: result.free ? '#5DC9A0' : '#E8453C' }}>
              {result.free ? 'You are FREE on these dates!' : `${result.conflicts.length} conflict${result.conflicts.length !== 1 ? 's' : ''} found`}
            </div>

            {!result.free && result.conflicts.map((c, i) => (
              <div key={i} style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #1F1F2E' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: EVENT_COLORS[c.tour.type as keyof typeof EVENT_COLORS], flexShrink: 0 }} />
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>{c.tour.title}</div>
                </div>
                {c.artist && <div style={{ fontSize: '12px', color: c.artist.color, marginBottom: '2px' }}>🎤 {c.artist.name}</div>}
                <div style={{ fontSize: '12px', color: '#5A5570' }}>
                  {c.tour.start}{c.tour.end && c.tour.end !== c.tour.start ? ` → ${c.tour.end}` : ''} · {EVENT_LABELS[c.tour.type as keyof typeof EVENT_LABELS]}
                </div>
                <div style={{ fontSize: '11px', color: '#E8453C', marginTop: '4px' }}>
                  Overlap: {c.overlapDates.join(', ')}
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  )
}
