'use client'
import { useState, useEffect } from 'react'
import { useStore, newId } from '@/lib/store'
import { syncToCloud, deleteFromCloud } from '@/lib/sync'
import { Button, Card, Input, Select, Textarea, Modal, EmptyState, Toolbar, showToast } from '@/components/ui'
import { Artist } from '@/lib/types'

const COLORS = ['#C9A84C','#7B8CDE','#5DC9A0','#E8453C','#F39C12','#9B59B6','#1ABC9C','#E67E22','#3498DB','#E91E63']

function ArtistModal({ open, onClose, editing, plan, artistCount }: {
  open: boolean, onClose: () => void, editing?: Artist | null, plan: string, artistCount: number
}) {
  const { artists, addArtist, updateArtist } = useStore()
  const [name, setName] = useState(editing?.name || '')
  const [genre, setGenre] = useState(editing?.genre || '')
  const [color, setColor] = useState(editing?.color || COLORS[0])
  const [siret, setSiret] = useState(editing?.siret || '')
  const [address, setAddress] = useState(editing?.address || '')
  const [nature, setNature] = useState(editing?.nature || '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!name.trim()) { showToast('Name required', false); return }
    if (saving) return
    if (!editing && plan === 'solo' && artistCount >= 3) {
      showToast('Solo plan is limited to 3 artists. Upgrade to Pro!', false)
      return
    }
    setSaving(true)
    const artist: Artist = { id: editing?.id || newId(), name: name.trim(), genre, color, siret, address, nature }
    if (editing) updateArtist(artist)
    else addArtist(artist)
    await syncToCloud()
    showToast(name + (editing ? ' updated ✓' : ' added ✓'))
    setSaving(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? `Edit ${editing.name}` : 'New Employer / Artist'}>
      <Input label="Name *" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Vincent Dedienne" />
      <Input label="Genre / Style" value={genre} onChange={e => setGenre(e.target.value)} placeholder="e.g. Theatre, Jazz, Pop" />
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '8px' }}>Color</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {COLORS.map(c => (
            <div key={c} onClick={() => setColor(c)} style={{ width: '30px', height: '30px', borderRadius: '8px', background: c, cursor: 'pointer', border: color === c ? '3px solid white' : '2px solid transparent' }} />
          ))}
        </div>
      </div>
      <Select label="Nature of contract" value={nature} onChange={e => setNature(e.target.value)}>
        <option value="">Select...</option>
        <option value="cachet">Cachet (intermittent)</option>
        <option value="salaire">Salaire fixe</option>
        <option value="auteur">Droits d'auteur</option>
        <option value="autre">Autre</option>
      </Select>
      <Input label="SIRET" value={siret} onChange={e => setSiret(e.target.value)} placeholder="e.g. 123 456 789 00012" />
      <Textarea label="Address" value={address} onChange={e => setAddress(e.target.value)} style={{ minHeight: '60px' }} />
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
        <Button onClick={save} disabled={saving} style={{ flex: 2 }}>{saving ? 'Saving...' : 'Save'}</Button>
      </div>
    </Modal>
  )
}

export default function ArtistsPage() {
  const { artists, tours, deleteArtist } = useStore()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Artist | null>(null)
  const [plan, setPlan] = useState('solo')

  useEffect(() => {
    const token = typeof window !== 'undefined' ? (localStorage.getItem('td_token') || '') : ''
    if (!token) return
    fetch('/api/plan', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setPlan(d.plan || 'solo')).catch(() => {})
  }, [])

  const handleDelete = async (artist: Artist) => {
    const count = tours.filter(t => t.aId === artist.id).length
    if (!confirm(`Delete "${artist.name}"${count > 0 ? ` and all ${count} events` : ''}?\nThis cannot be undone.`)) return
    await deleteFromCloud('artists', artist.id)
    const artistTours = tours.filter(t => t.aId === artist.id)
    for (const t of artistTours) await deleteFromCloud('tours', t.id)
    deleteArtist(artist.id)
    showToast(artist.name + ' deleted')
  }

  const today = new Date().toISOString().slice(0, 10)
  const atLimit = plan === 'solo' && artists.length >= 3

  return (
    <div style={{ padding: '0 0 100px' }}>
      <Toolbar
        title="My Artists"
        actions={<Button size="sm" onClick={() => { setEditing(null); setShowModal(true) }}>+ Add artist</Button>}
      />
      <div style={{ padding: '0 16px' }}>

        {/* Solo plan limit banner */}
        {plan === 'solo' && (
          <div style={{ marginBottom: '16px', padding: '12px 14px', background: atLimit ? 'rgba(232,69,60,.08)' : 'rgba(201,168,76,.06)', border: `1px solid ${atLimit ? 'rgba(232,69,60,.2)' : 'rgba(201,168,76,.15)'}`, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: atLimit ? '#E8453C' : '#5A5570' }}>
              {atLimit ? '⚠️ Limit reached — Solo plan allows 3 artists max' : `🎤 ${artists.length}/3 artists — Solo plan`}
            </span>
            {atLimit && (
              <button onClick={() => window.location.href = '/app2/pricing'} style={{ background: '#C9A84C', border: 'none', color: '#0A0A0F', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', fontWeight: 800, flexShrink: 0 }}>
                Upgrade
              </button>
            )}
          </div>
        )}

        {artists.length === 0 && (
          <EmptyState icon="🎤" title="No artists yet" sub="Add your employers and the artists you work with." />
        )}

        {artists.map(artist => {
          const eventCount = tours.filter(t => t.aId === artist.id).length
          const upcoming = tours.filter(t => t.aId === artist.id && t.start >= today).length
          return (
            <Card key={artist.id} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: artist.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                  🎤
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: '16px', marginBottom: '2px' }}>{artist.name}</div>
                  {artist.genre && <div style={{ fontSize: '12px', color: '#5A5570', marginBottom: '4px' }}>{artist.genre}</div>}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    {artist.nature && (
                      <div style={{ fontSize: '11px', background: '#12121A', border: '1px solid #1F1F2E', borderRadius: '6px', padding: '2px 8px', color: '#5A5570' }}>
                        {artist.nature === 'cachet' ? 'Intermittent' : artist.nature}
                      </div>
                    )}
                    {artist.siret && (
                      <div style={{ fontSize: '11px', background: '#12121A', border: '1px solid #1F1F2E', borderRadius: '6px', padding: '2px 8px', color: '#5A5570' }}>
                        SIRET: {artist.siret}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#5A5570' }}>
                    <span>📅 {eventCount} event{eventCount !== 1 ? 's' : ''}</span>
                    {upcoming > 0 && <span style={{ color: '#C9A84C' }}>⏳ {upcoming} upcoming</span>}
                  </div>
                  {artist.address && <div style={{ fontSize: '11px', color: '#5A5570', marginTop: '4px' }}>📍 {artist.address}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                  <Button size="sm" onClick={() => { setEditing(artist); setShowModal(true) }}>✏ Edit</Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(artist)}>✕ Delete</Button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
      <ArtistModal open={showModal} onClose={() => { setShowModal(false); setEditing(null) }} editing={editing} plan={plan} artistCount={artists.length} />
    </div>
  )
}
