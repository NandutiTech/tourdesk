'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { Button, Card, Select, Toolbar, showToast } from '@/components/ui'
import { EVENT_LABELS, EVENT_COLORS } from '@/lib/types'

function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = []
  const d = new Date(start + 'T12:00:00')
  const e = new Date(end + 'T12:00:00')
  while (d <= e) { dates.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1) }
  return dates
}

export default function MyPagePage() {
  const { tours, artists } = useStore()
  const [artistId, setArtistId] = useState('')
  const [weeks, setWeeks] = useState('8')

  const today = new Date().toISOString().slice(0, 10)
  const endDate = new Date(Date.now() + parseInt(weeks) * 7 * 86400000).toISOString().slice(0, 10)

  // Build busy dates
  const busyDates = new Set<string>()
  for (const t of tours) {
    const dates = getDatesInRange(t.start, t.end || t.start)
    dates.forEach(d => busyDates.add(d))
  }

  // Get free periods
  const freePeriods: { start: string, end: string }[] = []
  let freeStart: string | null = null
  const d = new Date(today + 'T12:00:00')
  const e = new Date(endDate + 'T12:00:00')
  while (d <= e) {
    const ds = d.toISOString().slice(0, 10)
    if (!busyDates.has(ds)) {
      if (!freeStart) freeStart = ds
    } else {
      if (freeStart) {
        const prevDay = new Date(d)
        prevDay.setDate(prevDay.getDate() - 1)
        freePeriods.push({ start: freeStart, end: prevDay.toISOString().slice(0, 10) })
        freeStart = null
      }
    }
    d.setDate(d.getDate() + 1)
  }
  if (freeStart) freePeriods.push({ start: freeStart, end: endDate })

  const bookedTours = tours.filter(t => t.start >= today && t.start <= endDate && (!artistId || t.aId === artistId)).sort((a, b) => a.start.localeCompare(b.start))

  const shareText = () => {
    const lines = ['🗓 Disponibilités / Availability', '']
    lines.push(`📅 ${today} → ${endDate}`, '')
    if (freePeriods.length > 0) {
      lines.push('✅ Libre / Free:')
      for (const p of freePeriods) {
        lines.push(`• ${p.start}${p.end !== p.start ? ` → ${p.end}` : ''}`)
      }
      lines.push('')
    }
    if (bookedTours.length > 0) {
      lines.push('🔴 Occupé / Busy:')
      for (const t of bookedTours) {
        lines.push(`• ${t.start}${t.end && t.end !== t.start ? ` → ${t.end}` : ''}`)
      }
    }
    return lines.join('\n')
  }

  const copy = () => { navigator.clipboard?.writeText(shareText()); showToast('Availability copied!') }

  return (
    <div style={{ padding: '0 0 100px' }}>
      <Toolbar title="My Availability" />
      <div style={{ padding: '0 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
          <Select value={weeks} onChange={e => setWeeks(e.target.value)}>
            <option value="4">Next 4 weeks</option>
            <option value="8">Next 8 weeks</option>
            <option value="12">Next 3 months</option>
            <option value="24">Next 6 months</option>
          </Select>
          <Select value={artistId} onChange={e => setArtistId(e.target.value)}>
            <option value="">All artists</option>
            {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        </div>

        {/* Free periods */}
        {freePeriods.length > 0 ? (
          <>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#5DC9A0', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '8px' }}>✅ Available</div>
            {freePeriods.map((p, i) => (
              <Card key={i} style={{ marginBottom: '8px', borderColor: 'rgba(93,201,160,.2)', background: 'rgba(93,201,160,.05)', padding: '12px' }}>
                <div style={{ fontWeight: 700, color: '#5DC9A0', fontSize: '14px' }}>
                  {p.start}{p.end !== p.start ? ` → ${p.end}` : ''}
                </div>
                {p.end !== p.start && (
                  <div style={{ fontSize: '12px', color: '#5A5570', marginTop: '2px' }}>
                    {Math.ceil((new Date(p.end).getTime() - new Date(p.start).getTime()) / 86400000) + 1} days free
                  </div>
                )}
              </Card>
            ))}
          </>
        ) : (
          <Card style={{ marginBottom: '16px', borderColor: 'rgba(232,69,60,.2)', background: 'rgba(232,69,60,.05)', textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>😅</div>
            <div style={{ fontWeight: 700, color: '#E8453C' }}>Fully booked for the next {weeks} weeks!</div>
          </Card>
        )}

        {/* Booked */}
        {bookedTours.length > 0 && (
          <>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#E8453C', textTransform: 'uppercase', letterSpacing: '.1em', margin: '16px 0 8px' }}>🔴 Booked</div>
            {bookedTours.map(t => {
              const a = artists.find(ar => ar.id === t.aId)
              return (
                <Card key={t.id} style={{ marginBottom: '8px', padding: '10px 12px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: EVENT_COLORS[t.type], flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700 }}>{t.start}{t.end && t.end !== t.start ? ` → ${t.end}` : ''}</div>
                    {a && <div style={{ fontSize: '11px', color: a.color }}>{a.name}</div>}
                  </div>
                  <div style={{ fontSize: '11px', color: '#5A5570' }}>{EVENT_LABELS[t.type]}</div>
                </Card>
              )
            })}
          </>
        )}

        {/* Share */}
        <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
          <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareText())}`, '_blank')} style={{ background: '#25D366', border: 'none', color: 'white', borderRadius: '10px', padding: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: '13px' }}>💬 WhatsApp</button>
          <button onClick={() => window.open(`https://mail.google.com/mail/?view=cm&tf=1&su=${encodeURIComponent('Mes disponibilités')}&body=${encodeURIComponent(shareText())}`, '_blank')} style={{ background: '#EA4335', border: 'none', color: 'white', borderRadius: '10px', padding: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: '13px' }}>✉ Gmail</button>
        </div>
        <Button onClick={copy} variant="secondary" style={{ width: '100%' }}>📋 Copy availability</Button>
      </div>
    </div>
  )
}
