'use client'
import { useStore } from '@/lib/store'
import { Card, Toolbar } from '@/components/ui'
import { MONTHS, EVENT_LABELS } from '@/lib/types'
import { useState } from 'react'

function pad(n: number) { return String(n).padStart(2, '0') }
function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = []
  const d = new Date(start + 'T12:00:00')
  const e = new Date(end + 'T12:00:00')
  while (d <= e) { dates.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1) }
  return dates
}

export default function DeclarationPage() {
  const { tours, artists, cachets, hoursPerEventType } = useStore()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const monthStr = `${year}-${pad(month + 1)}`
  const monthTours = tours.filter(t => {
    const dates = getDatesInRange(t.start, t.end || t.start)
    return dates.some(d => d.startsWith(monthStr))
  }).sort((a, b) => a.start.localeCompare(b.start))

  const rows = monthTours.map(t => {
    const artist = artists.find(a => a.id === t.aId)
    const cachet = t.customCachet ?? (artist?.id ? (cachets[artist.id] || 0) : 0)
    const hoursDefault = (hoursPerEventType as any)[t.type] || 1
    const hours = t.customHours ?? (
      ['residence', 'tournage', 'figuration', 'workday'].includes(t.type)
        ? getDatesInRange(t.start, t.end || t.start).length * hoursDefault
        : hoursDefault
    )
    return { tour: t, artist, cachet, hours }
  })

  const totalCachet = rows.reduce((s, r) => s + r.cachet, 0)
  const totalHours = rows.reduce((s, r) => s + r.hours, 0)

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)

  return (
    <div style={{ padding: '0 0 100px' }}>
      <Toolbar title="Déclaration mensuelle" />
      <div style={{ padding: '0 16px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} style={{ flex: 1, background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '8px', padding: '10px', fontFamily: 'inherit', fontSize: '14px', fontWeight: 700 }}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))} style={{ flex: 2, background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '8px', padding: '10px', fontFamily: 'inherit', fontSize: '14px' }}>
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
        </div>

        <Card style={{ marginBottom: '16px', background: 'rgba(201,168,76,.05)', borderColor: 'rgba(201,168,76,.2)' }}>
          <div style={{ fontSize: '12px', color: '#5A5570', lineHeight: 1.8 }}>
            <strong style={{ color: '#C9A84C' }}>How to use:</strong> Copy the info below into your France Travail monthly declaration. Each line = one contract (cachet).
          </div>
        </Card>

        {rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#5A5570' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🇫🇷</div>
            <div style={{ fontWeight: 700, color: '#E8E0F0', marginBottom: '4px' }}>No events in {MONTHS[month]}</div>
            <div style={{ fontSize: '13px' }}>Add events in Tours & Events to generate your declaration.</div>
          </div>
        ) : (
          <>
            {rows.map((r, i) => (
              <Card key={i} style={{ marginBottom: '8px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>{r.tour.title}</div>
                    <div style={{ fontSize: '12px', color: '#5A5570' }}>{r.tour.start}{r.tour.end && r.tour.end !== r.tour.start ? ` → ${r.tour.end}` : ''}</div>
                    {r.artist && <div style={{ fontSize: '11px', color: r.artist.color }}>🎤 {r.artist.name}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: '#C9A84C', fontSize: '16px' }}>€{r.cachet}</div>
                    <div style={{ fontSize: '11px', color: '#5A5570' }}>{r.hours}h</div>
                  </div>
                </div>
                <div style={{ background: '#0A0A0F', borderRadius: '8px', padding: '10px', fontSize: '12px', fontFamily: 'monospace', color: '#5DC9A0', lineHeight: 1.8 }}>
                  <div>Employeur: {r.artist?.name || '—'}</div>
                  <div>SIRET: {r.artist?.siret || '—'}</div>
                  <div>Nature: {r.tour.type === 'show' ? 'Représentation' : EVENT_LABELS[r.tour.type]}</div>
                  <div>Date(s): {r.tour.start}{r.tour.end && r.tour.end !== r.tour.start ? ` au ${r.tour.end}` : ''}</div>
                  <div>Cachet brut: €{r.cachet}</div>
                  <div>Heures: {r.hours}h</div>
                </div>
              </Card>
            ))}

            <Card style={{ marginTop: '8px', background: 'rgba(93,201,160,.05)', borderColor: 'rgba(93,201,160,.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700 }}>Total {MONTHS[month]}</div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 900, color: '#C9A84C', fontSize: '18px' }}>€{totalCachet}</div>
                  <div style={{ fontSize: '12px', color: '#5DC9A0' }}>{totalHours}h</div>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
