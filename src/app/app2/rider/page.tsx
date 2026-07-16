'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { Button, Card, Input, Textarea, Select, Toolbar, showToast } from '@/components/ui'

const DEFAULT_RIDER = {
  name: '',
  instrument: '',
  stage: '',
  monitors: '2 retours face + 1 retour latéral',
  mics: '',
  stands: '',
  di: '',
  power: '2x 220V sur scène',
  lighting: '',
  extra: '',
  backline: '',
  contact: '',
}

export default function RiderPage() {
  const { artists } = useStore()
  const [artistId, setArtistId] = useState('')
  const [rider, setRider] = useState({ ...DEFAULT_RIDER })

  const set = (key: string, val: string) => setRider(prev => ({ ...prev, [key]: val }))

  const artist = artists.find(a => a.id === artistId)

  const generateText = () => {
    const lines = [
      `TECHNICAL RIDER — ${rider.name || artist?.name || 'Artist'}`,
      `${rider.instrument ? `Instrument: ${rider.instrument}` : ''}`,
      '',
      '== SCÈNE / STAGE ==',
      rider.stage && `Configuration: ${rider.stage}`,
      rider.backline && `Backline: ${rider.backline}`,
      rider.power && `Alimentation: ${rider.power}`,
      '',
      '== SON / SOUND ==',
      rider.monitors && `Retours: ${rider.monitors}`,
      rider.mics && `Micros: ${rider.mics}`,
      rider.stands && `Pieds de micro: ${rider.stands}`,
      rider.di && `DI: ${rider.di}`,
      '',
      rider.lighting && `== LUMIÈRES ==\n${rider.lighting}`,
      '',
      rider.extra && `== DIVERS ==\n${rider.extra}`,
      '',
      rider.contact && `Contact technique: ${rider.contact}`,
    ].filter(Boolean).join('\n')
    return lines
  }

  const copy = () => {
    navigator.clipboard?.writeText(generateText())
    showToast('Rider copied!')
  }

  const share = (via: string) => {
    const text = generateText()
    if (via === 'wa') window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    if (via === 'gmail') window.open(`https://mail.google.com/mail/?view=cm&tf=1&su=${encodeURIComponent('Technical Rider')}&body=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <div style={{ padding: '0 0 100px' }}>
      <Toolbar title="Technical Rider" />
      <div style={{ padding: '0 16px' }}>
        <Select label="Artist" value={artistId} onChange={e => setArtistId(e.target.value)}>
          <option value="">Select artist (optional)</option>
          {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
        <Input label="Name on rider" value={rider.name} onChange={e => set('name', e.target.value)} placeholder={artist?.name || 'e.g. Vincent Dedienne'} />
        <Input label="Instrument / Role" value={rider.instrument} onChange={e => set('instrument', e.target.value)} placeholder="e.g. Batterie, Guitare, Comédien" />

        <div style={{ fontSize: '11px', fontWeight: 800, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.1em', margin: '12px 0 8px' }}>🎛 Scène</div>
        <Textarea label="Configuration scène" value={rider.stage} onChange={e => set('stage', e.target.value)} placeholder="e.g. 6m x 4m minimum, accès côté cour" style={{ minHeight: '60px' }} />
        <Textarea label="Backline demandé" value={rider.backline} onChange={e => set('backline', e.target.value)} placeholder="e.g. Batterie acoustique 5 fûts, ampli guitare..." style={{ minHeight: '60px' }} />
        <Input label="Alimentation électrique" value={rider.power} onChange={e => set('power', e.target.value)} placeholder="e.g. 2x 220V sur scène" />

        <div style={{ fontSize: '11px', fontWeight: 800, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.1em', margin: '12px 0 8px' }}>🔊 Son</div>
        <Input label="Retours / Monitors" value={rider.monitors} onChange={e => set('monitors', e.target.value)} placeholder="e.g. 2 retours face + 1 latéral" />
        <Textarea label="Micros" value={rider.mics} onChange={e => set('mics', e.target.value)} placeholder="e.g. 1 SM58 voix, 1 SM57 caisse claire..." style={{ minHeight: '60px' }} />
        <Input label="Pieds de micro" value={rider.stands} onChange={e => set('stands', e.target.value)} placeholder="e.g. 3 pieds droits, 1 perche" />
        <Input label="Boîtes DI" value={rider.di} onChange={e => set('di', e.target.value)} placeholder="e.g. 2 DI passives" />

        <div style={{ fontSize: '11px', fontWeight: 800, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.1em', margin: '12px 0 8px' }}>💡 Lumières</div>
        <Textarea label="Demandes lumières" value={rider.lighting} onChange={e => set('lighting', e.target.value)} placeholder="e.g. Éclairage blanc neutre, pas de stroboscope" style={{ minHeight: '60px' }} />

        <div style={{ fontSize: '11px', fontWeight: 800, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.1em', margin: '12px 0 8px' }}>📋 Divers</div>
        <Textarea label="Divers / Catering" value={rider.extra} onChange={e => set('extra', e.target.value)} placeholder="e.g. Eau, café, loge chauffée..." style={{ minHeight: '60px' }} />
        <Input label="Contact technique" value={rider.contact} onChange={e => set('contact', e.target.value)} placeholder="e.g. nom@email.com / +33 6 ..." />

        {/* Preview */}
        <Card style={{ marginTop: '16px', marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '10px' }}>Preview</div>
          <pre style={{ fontSize: '12px', color: '#E8E0F0', whiteSpace: 'pre-wrap', fontFamily: 'monospace', lineHeight: 1.7, margin: 0 }}>{generateText()}</pre>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
          <button onClick={() => share('wa')} style={{ background: '#25D366', border: 'none', color: 'white', borderRadius: '10px', padding: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: '13px' }}>💬 WhatsApp</button>
          <button onClick={() => share('gmail')} style={{ background: '#EA4335', border: 'none', color: 'white', borderRadius: '10px', padding: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: '13px' }}>✉ Gmail</button>
        </div>
        <Button onClick={copy} variant="secondary" style={{ width: '100%' }}>📋 Copy rider</Button>
      </div>
    </div>
  )
}
