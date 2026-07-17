'use client'
import { useState, useRef } from 'react'
import { useStore } from '@/lib/store'
import { Button, Card, Modal, Toolbar, showToast } from '@/components/ui'
import { SendToContact } from '@/components/SendToContact'
import { callClaude } from '@/lib/sync'

function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = []
  const d = new Date(start + 'T12:00:00')
  const e = new Date(end + 'T12:00:00')
  while (d <= e) { dates.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1) }
  return dates
}

const IMPORT_PROMPT = `Extract all dates from this document. Return ONLY a JSON array of date strings in YYYY-MM-DD format.
Example: ["2026-09-15", "2026-09-22", "2026-10-01"]
Include only dates, no other text.`

export default function AvailabilityPage() {
  const { tours, artists } = useStore()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ free: string[], busy: { date: string, tour: any, artist: any }[] } | null>(null)
  const [showSend, setShowSend] = useState(false)
  const [previewDates, setPreviewDates] = useState<string[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const processFile = async (file: File) => {
    setLoading(true)
    setResult(null)
    try {
      const isImage = file.type.startsWith('image/')
      const isPDF = file.type === 'application/pdf'
      if (!isImage && !isPDF) { showToast('Upload a PDF or photo', false); setLoading(false); return }

      const b64 = await new Promise<string>((res) => {
        const reader = new FileReader()
        reader.onload = () => res((reader.result as string).split(',')[1])
        reader.readAsDataURL(file)
      })

      const contentBlocks = isImage
        ? [{ type: 'image', source: { type: 'base64', media_type: file.type, data: b64 } }, { type: 'text', text: IMPORT_PROMPT }]
        : [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } }, { type: 'text', text: IMPORT_PROMPT }]

      const data = await callClaude([{ role: 'user', content: contentBlocks }], 1000)
      if (!data) { setLoading(false); return }
      if (data.error) { showToast('Error reading file', false); setLoading(false); return }

      const text = data.content?.[0]?.text || ''
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (!jsonMatch) { showToast('No dates found in this document', false); setLoading(false); return }

      const parsed: string[] = JSON.parse(jsonMatch[0])
      setPreviewDates(parsed)
      setShowPreview(true)
    } catch {
      showToast('Could not read the file', false)
    }
    setLoading(false)
  }

  const checkDates = (dates: string[]) => {
    const free: string[] = []
    const busy: { date: string, tour: any, artist: any }[] = []

    for (const date of dates) {
      const conflicts = tours.filter(t => getDatesInRange(t.start, t.end || t.start).includes(date))
      if (conflicts.length === 0) {
        free.push(date)
      } else {
        conflicts.forEach(t => busy.push({ date, tour: t, artist: artists.find(a => a.id === t.aId) }))
      }
    }
    setResult({ free, busy })
    setShowPreview(false)
  }

  const buildShareText = () => {
    if (!result) return ''
    const lines = ['📅 Availability check', '']
    if (result.free.length > 0) {
      lines.push('✅ Available:')
      result.free.forEach(d => lines.push(`  • ${d}`))
      lines.push('')
    }
    const uniqueBusy = [...new Set(result.busy.map(b => b.date))]
    if (uniqueBusy.length > 0) {
      lines.push('❌ Not available:')
      uniqueBusy.forEach(d => lines.push(`  • ${d}`))
    }
    return lines.join('\n')
  }

  const uniqueBusy = result ? [...new Set(result.busy.map(b => b.date))] : []

  return (
    <div style={{ padding: '0 0 100px' }}>
      <Toolbar title="Check Availability" />
      <div style={{ padding: '0 16px' }}>

        <Card style={{ marginBottom: '16px' }}>
          <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '6px' }}>Upload a planning or list of dates</div>
          <div style={{ fontSize: '12px', color: '#5A5570', marginBottom: '16px', lineHeight: 1.6 }}>
            Upload a PDF or photo with dates an artist sent you. The app reads the dates automatically and checks for conflicts with your calendar.
          </div>
          <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) { processFile(e.target.files[0]); e.target.value = '' } }} />
          <Button onClick={() => fileRef.current?.click()} disabled={loading} style={{ width: '100%' }}>
            {loading ? '⏳ Reading file...' : '📎 Choose PDF or photo'}
          </Button>
        </Card>

        {/* Preview dates before checking */}
        {showPreview && (
          <Card style={{ marginBottom: '16px' }}>
            <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '8px' }}>
              Found {previewDates.length} dates — confirm to check
            </div>
            <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '12px' }}>
              {previewDates.map((d, i) => (
                <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid #1F1F2E', fontSize: '13px', color: '#E8E0F0' }}>{d}</div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="secondary" onClick={() => setShowPreview(false)} style={{ flex: 1 }}>Cancel</Button>
              <Button onClick={() => checkDates(previewDates)} style={{ flex: 2 }}>Check conflicts →</Button>
            </div>
          </Card>
        )}

        {/* Results */}
        {result && (
          <>
            {result.free.length > 0 && (
              <Card style={{ marginBottom: '12px', borderColor: 'rgba(93,201,160,.3)', background: 'rgba(93,201,160,.05)' }}>
                <div style={{ fontWeight: 800, color: '#5DC9A0', marginBottom: '10px' }}>✅ Available ({result.free.length})</div>
                {result.free.map(d => (
                  <div key={d} style={{ fontSize: '13px', padding: '4px 0', borderBottom: '1px solid rgba(93,201,160,.1)' }}>{d}</div>
                ))}
              </Card>
            )}

            {uniqueBusy.length > 0 && (
              <Card style={{ marginBottom: '12px', borderColor: 'rgba(232,69,60,.2)', background: 'rgba(232,69,60,.03)' }}>
                <div style={{ fontWeight: 800, color: '#E8453C', marginBottom: '10px' }}>❌ Not available ({uniqueBusy.length})</div>
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

            {result.free.length > 0 && uniqueBusy.length === 0 && (
              <div style={{ textAlign: 'center', padding: '12px', color: '#5DC9A0', fontWeight: 700 }}>All dates are available! 🎉</div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(buildShareText())}`, '_blank')} style={{ background: '#25D366', border: 'none', color: 'white', borderRadius: '10px', padding: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: '13px' }}>💬 WhatsApp</button>
              <button onClick={() => window.open(`https://mail.google.com/mail/?view=cm&tf=1&su=${encodeURIComponent('Disponibilités')}&body=${encodeURIComponent(buildShareText())}`, '_blank')} style={{ background: '#EA4335', border: 'none', color: 'white', borderRadius: '10px', padding: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: '13px' }}>✉ Gmail</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button onClick={() => { navigator.clipboard?.writeText(buildShareText()); showToast('Copied!') }} style={{ background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '10px', padding: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '13px' }}>📋 Copy</button>
              <button onClick={() => setShowSend(true)} style={{ background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '10px', padding: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '13px' }}>👤 Send to contact</button>
            </div>
          </>
        )}
      </div>

      <SendToContact open={showSend} onClose={() => setShowSend(false)} subject="Disponibilités" body={buildShareText()} />
    </div>
  )
}
