'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { Button, Card, Select, Toolbar, showToast } from '@/components/ui'
import { EVENT_LABELS } from '@/lib/types'

function pad(n: number) { return String(n).padStart(2, '0') }
function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = []
  const d = new Date(start + 'T12:00:00')
  const e = new Date(end + 'T12:00:00')
  while (d <= e) { dates.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1) }
  return dates
}

export default function FeuilleePage() {
  const { tours, artists, cachets, hoursPerEventType } = useStore()
  const [tourId, setTourId] = useState('')

  const tour = tours.find(t => t.id === tourId)
  const artist = tour ? artists.find(a => a.id === tour.aId) : null
  const cachet = tour ? (tour.customCachet ?? (artist?.id ? (cachets[artist.id] || 0) : 0)) : 0
  const hoursDefault = tour ? ((hoursPerEventType as any)[tour.type] || 1) : 1
  const hours = tour ? (tour.customHours ?? (
    ['residence', 'tournage', 'figuration', 'workday'].includes(tour.type)
      ? getDatesInRange(tour.start, tour.end || tour.start).length * hoursDefault
      : hoursDefault
  )) : 0

  const upcoming = tours.filter(t => t.start >= new Date().toISOString().slice(0, 10)).sort((a, b) => a.start.localeCompare(b.start))

  const copy = () => {
    if (!tour) return
    const text = [
      'FEUILLE DE CACHET',
      '',
      `Artiste: ____________________`,
      `Employeur: ${artist?.name || '____________________'}`,
      `SIRET: ${artist?.siret || '____________________'}`,
      '',
      `Nature de la prestation: ${EVENT_LABELS[tour.type]}`,
      `Date(s): ${tour.start}${tour.end && tour.end !== tour.start ? ` au ${tour.end}` : ''}`,
      `Lieu: ${tour.city || '____________________'}`,
      `Titre du spectacle: ${tour.title}`,
      '',
      `Cachet brut: €${cachet}`,
      `Nombre d'heures: ${hours}h`,
      '',
      `Adresse employeur: ${artist?.address || '____________________'}`,
      '',
      '____________________    ____________________',
      'Signature artiste         Signature employeur',
      '',
      `Date: ____________________`,
    ].join('\n')
    navigator.clipboard?.writeText(text)
    showToast('Feuille de cachet copied!')
  }

  return (
    <div style={{ padding: '0 0 100px' }}>
      <Toolbar title="Feuille de Cachet" />
      <div style={{ padding: '0 16px' }}>
        <Card style={{ marginBottom: '16px', background: 'rgba(201,168,76,.05)', borderColor: 'rgba(201,168,76,.2)' }}>
          <div style={{ fontSize: '12px', color: '#5A5570', lineHeight: 1.8 }}>
            Sélectionne un événement pour générer la feuille de cachet correspondante.
          </div>
        </Card>

        <Select label="Événement" value={tourId} onChange={e => setTourId(e.target.value)}>
          <option value="">Choisir un événement...</option>
          {upcoming.map(t => {
            const a = artists.find(ar => ar.id === t.aId)
            return <option key={t.id} value={t.id}>{t.start} — {t.title}{a ? ` (${a.name})` : ''}</option>
          })}
          {tours.filter(t => !upcoming.includes(t)).sort((a, b) => b.start.localeCompare(a.start)).map(t => {
            const a = artists.find(ar => ar.id === t.aId)
            return <option key={t.id} value={t.id}>{t.start} — {t.title}{a ? ` (${a.name})` : ''}</option>
          })}
        </Select>

        {tour && (
          <>
            <Card style={{ marginBottom: '16px', fontFamily: 'monospace' }}>
              <div style={{ textAlign: 'center', fontWeight: 900, fontSize: '16px', marginBottom: '16px', color: '#C9A84C' }}>FEUILLE DE CACHET</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '10px', color: '#5A5570', marginBottom: '2px' }}>ARTISTE</div>
                  <div style={{ fontSize: '13px', borderBottom: '1px solid #1F1F2E', paddingBottom: '4px' }}>____________________</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#5A5570', marginBottom: '2px' }}>EMPLOYEUR</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, borderBottom: '1px solid #1F1F2E', paddingBottom: '4px' }}>{artist?.name || '—'}</div>
                </div>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '10px', color: '#5A5570', marginBottom: '2px' }}>SIRET</div>
                <div style={{ fontSize: '13px' }}>{artist?.siret || '—'}</div>
              </div>
              <div style={{ background: '#12121A', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: '#5A5570', marginBottom: '2px' }}>NATURE</div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{EVENT_LABELS[tour.type]}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#5A5570', marginBottom: '2px' }}>DATE(S)</div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{tour.start}{tour.end && tour.end !== tour.start ? ` → ${tour.end}` : ''}</div>
                  </div>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '10px', color: '#5A5570', marginBottom: '2px' }}>TITRE</div>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>{tour.title}</div>
                </div>
                {tour.city && (
                  <div>
                    <div style={{ fontSize: '10px', color: '#5A5570', marginBottom: '2px' }}>LIEU</div>
                    <div style={{ fontSize: '13px' }}>{tour.city}</div>
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div style={{ textAlign: 'center', background: '#12121A', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '10px', color: '#5A5570', marginBottom: '4px' }}>CACHET BRUT</div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#C9A84C' }}>€{cachet}</div>
                </div>
                <div style={{ textAlign: 'center', background: '#12121A', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '10px', color: '#5A5570', marginBottom: '4px' }}>HEURES</div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#5DC9A0' }}>{hours}h</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #1F1F2E' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#5A5570', marginBottom: '20px' }}>SIGNATURE ARTISTE</div>
                  <div style={{ borderTop: '1px solid #5A5570', paddingTop: '4px', fontSize: '11px', color: '#5A5570' }}>Date: ___________</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#5A5570', marginBottom: '20px' }}>SIGNATURE EMPLOYEUR</div>
                  <div style={{ borderTop: '1px solid #5A5570', paddingTop: '4px', fontSize: '11px', color: '#5A5570' }}>Date: ___________</div>
                </div>
              </div>
            </Card>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent('FEUILLE DE CACHET\n' + tour.title + '\n' + tour.start + '\nCachet: €' + cachet + ' / ' + hours + 'h')}`, '_blank')} style={{ background: '#25D366', border: 'none', color: 'white', borderRadius: '10px', padding: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: '13px' }}>💬 WhatsApp</button>
              <button onClick={() => window.open(`https://mail.google.com/mail/?view=cm&tf=1&su=${encodeURIComponent('Feuille de cachet — ' + tour.title)}`, '_blank')} style={{ background: '#EA4335', border: 'none', color: 'white', borderRadius: '10px', padding: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: '13px' }}>✉ Gmail</button>
            </div>
            <Button onClick={copy} variant="secondary" style={{ width: '100%' }}>📋 Copy feuille de cachet</Button>
          </>
        )}
      </div>
    </div>
  )
}
