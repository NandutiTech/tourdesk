'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { Button, Card, Input, Toolbar, showToast } from '@/components/ui'
import { EVENT_COLORS, EVENT_LABELS } from '@/lib/types'
import { SendToContact } from '@/components/SendToContact'

function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = []
  const d = new Date(start + 'T12:00:00')
  const e = new Date(end + 'T12:00:00')
  while (d <= e) { dates.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1) }
  return dates
}

export default function AvailabilityPage() {
  const { tours, artists } = useStore()
  const [rawDates, setRawDates] = useState('')
  const [result, setResult] = useState<{ free: string[], busy: { date: string, tour: any, artist: any }[] } | null>(null)
  const [showSend, setShowSend] = useState(false)

  const check = () => {
    // Parse dates from text - supports YYYY-MM-DD, DD/MM/YYYY, DD.MM.YYYY
    const lines = rawDates.split(/[\n,;]+/).map(l => l.trim()).filter(Boolean)
    const parsed: string[] = []

    for (const line of lines) {
      // Try YYYY-MM-DD
      const iso = line.match(/(\d{4})-(\d{2})-(\d{2})/)
      if (iso) { parsed.push(iso[0]); continue }
      // Try DD/MM/YYYY or DD.MM.YYYY
      const dmy = line.match(/(\d{1,2})[\/\.](\d{1,2})[\/\.](\d{4})/)
      if (dmy) { parsed.push(`${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`); continue }
      // Try DD/MM (assume current year)
      const dm = line.match(/(\d{1,2})[\/\.](\d{1,2})/)
      if (dm) { parsed.push(`${new Date().getFullYear()}-${dm[2].padStart(2,'0')}-${dm[1].padStart(2,'0')}`); continue }
    }

    if (parsed.length === 0) { showToast('No dates recognized — try format DD/MM/YYYY or YYYY-MM-DD', false); return }

    const free: string[] = []
    const busy: { date: string, tour: any, artist: any }[] = []

    for (const date of parsed) {
      const conflicts = tours.filter(t => {
        const range = getDatesInRange(t.start, t.end || t.start)
        return range.includes(date)
      })
      if (conflicts.length === 0) {
        free.push(date)
      } else {
        conflicts.forEach(t => {
          const artist = artists.find(a => a.id === t.aId)
          busy.push({ date, tour: t, artist })
        })
      }
    }

    setResult({ free, busy })
  }

  const buildShareText = () => {
    if (!result) return ''
    const lines = ['📅 Disponibilités / Availability check', '']
    if (result.free.length > 0) {
      lines.push('✅ Available:')
      result.free.forEach(d => lines.push(`  • ${d}`))
      lines.push('')
    }
    if (result.busy.length > 0) {
      lines.push('❌ Not available:')
      result.busy.forEach(b => lines.push(`  • ${b.date}`))
    }
    return lines.join('\n')
  }

  const uniqueBusy = result ? [...new Set(result.busy.map(b => b.date))] : []

  return (
    <div style={{ padding: '0 0 100px' }}>
      <Toolbar title="Check Availability" />
      <div style={{ padding: '0 16px' }}>

        <Card style={{ marginBottom: '16px' }}>
          <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '6px' }}>Paste dates to check</div>
          <div style={{ fontSize: '12px', color: '#5A5570', marginBottom: '12px', lineHeight: 1.6 }}>
            Paste the dates an artist sent you. Accepts any format: DD/MM/YYYY, YYYY-MM-DD, one per line or separated by commas.
          </div>
          <textarea
            value={rawDates}
            onChange={e => setRawDates(e.target.value)}
            placeholder={'e.g.\n15/09/2026\n22/09/2026\n29/09/2026\n\nor: 2026-09-15, 2026-09-22'}
            style={{ width: '100%', background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '8px', padding: '10px 12px', fontFamily: 'monospace', fontSize: '13px', minHeight: '120px', boxSizing: 'border-box', resize: 'vertical', outline: 'none', marginBottom: '10px' }}
          />
          <Button onClick={check} style={{ width: '100%' }}>Check dates</Button>
        </Card>

        {result && (
          <>
            {/* Free dates */}
            {result.free.length > 0 && (
              <Card style={{ marginBottom: '12px', borderColor: 'rgba(93,201,160,.3)', background: 'rgba(93,201,160,.05)' }}>
                <div style={{ fontWeight: 800, color: '#5DC9A0', marginBottom: '10px' }}>
                  ✅ Available ({result.free.length})
                </div>
                {result.free.map(d => (
                  <div key={d} style={{ fontSize: '13px', padding: '4px 0', borderBottom: '1px solid rgba(93,201,160,.1)', color: '#E8E0F0' }}>{d}</div>
                ))}
              </Card>
            )}

            {/* Busy dates */}
            {result.busy.length > 0 && (
              <Card style={{ marginBottom: '12px', borderColor: 'rgba(232,69,60,.2)', background: 'rgba(232,69,60,.03)' }}>
                <div style={{ fontWeight: 800, color: '#E8453C', marginBottom: '10px' }}>
                  ❌ Not available ({uniqueBusy.length})
                </div>
                {uniqueBusy.map(date => {
                  const conflicts = result.busy.filter(b => b.date === date)
                  return (
                    <div key={date} style={{ padding: '6px 0', borderBottom: '1px solid rgba(232,69,60,.1)' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#E8453C' }}>{date}</div>
                      {conflicts.map((b, i) => (
                        <div key={i} style={{ fontSize: '11px', color: '#5A5570', marginTop: '2px' }}>
                          → {b.tour.title}{b.artist ? ` (${b.artist.name})` : ''}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </Card>
            )}

            {/* No conflicts at all */}
            {result.free.length > 0 && result.busy.length === 0 && (
              <div style={{ textAlign: 'center', padding: '8px', fontSize: '13px', color: '#5A5570' }}>
                All dates are available! 🎉
              </div>
            )}

            {/* Share buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(buildShareText())}`, '_blank')} style={{ background: '#25D366', border: 'none', color: 'white', borderRadius: '10px', padding: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: '13px' }}>
                💬 WhatsApp
              </button>
              <button onClick={() => window.open(`https://mail.google.com/mail/?view=cm&tf=1&su=${encodeURIComponent('Disponibilités')}&body=${encodeURIComponent(buildShareText())}`, '_blank')} style={{ background: '#EA4335', border: 'none', color: 'white', borderRadius: '10px', padding: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: '13px' }}>
                ✉ Gmail
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button onClick={() => { navigator.clipboard?.writeText(buildShareText()); showToast('Copied!') }} style={{ background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '10px', padding: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '13px' }}>
                📋 Copy
              </button>
              <button onClick={() => setShowSend(true)} style={{ background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '10px', padding: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '13px' }}>
                👤 Send to contact
              </button>
            </div>
          </>
        )}
      </div>

      <SendToContact
        open={showSend}
        onClose={() => setShowSend(false)}
        subject="Disponibilités"
        body={buildShareText()}
      />
    </div>
  )
}
