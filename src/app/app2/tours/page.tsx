'use client'
import { useState, useRef } from 'react'
import { useStore, newId } from '@/lib/store'
import { syncToCloud, deleteFromCloud, callClaude } from '@/lib/sync'
import { Button, Card, Input, Select, Textarea, Modal, EmptyState, Toolbar, showToast, ColorDot, SectionLabel } from '@/components/ui'
import { Artist, Tour, EventType, EVENT_LABELS, EVENT_COLORS } from '@/lib/types'

const COLORS = ['#C9A84C','#7B8CDE','#5DC9A0','#E8453C','#F39C12','#9B59B6','#1ABC9C','#E67E22','#3498DB','#E91E63']
type SortMode = 'date' | 'artist'

// ── Artist Modal ────────────────────────────────────────────
function ArtistModal({ open, onClose, editing }: { open: boolean, onClose: () => void, editing?: Artist | null }) {
  const { addArtist, updateArtist } = useStore()
  const [name, setName] = useState(editing?.name || '')
  const [genre, setGenre] = useState(editing?.genre || '')
  const [color, setColor] = useState(editing?.color || COLORS[0])
  const [siret, setSiret] = useState(editing?.siret || '')
  const [address, setAddress] = useState(editing?.address || '')
  const [nature, setNature] = useState(editing?.nature || '')

  const [saving, setSaving] = useState(false)

  const reset = () => { setName(''); setGenre(''); setColor(COLORS[0]); setSiret(''); setAddress(''); setNature('') }

  const save = async () => {
    if (!name.trim()) { showToast('Name required', false); return }
    if (saving) return
    setSaving(true)
    const artist: Artist = {
      id: editing?.id || newId(),
      name: name.trim(), genre, color, siret, address, nature
    }
    if (editing) updateArtist(artist)
    else addArtist(artist)
    await syncToCloud()
    showToast(name + (editing ? ' updated' : ' added'))
    reset()
    setSaving(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Employer' : 'New Employer / Artist'}>
      <Input label="Name *" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Vincent Dedienne" />
      <Input label="Genre / Style" value={genre} onChange={e => setGenre(e.target.value)} placeholder="e.g. Theatre, Jazz, Pop" />
      <div style={{ marginBottom: '12px' }}>
        <SectionLabel>Color</SectionLabel>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {COLORS.map(c => (
            <div key={c} onClick={() => setColor(c)} style={{
              width: '28px', height: '28px', borderRadius: '6px', background: c, cursor: 'pointer',
              border: color === c ? '3px solid white' : '2px solid transparent'
            }} />
          ))}
        </div>
      </div>
      <Input label="SIRET" value={siret} onChange={e => setSiret(e.target.value)} placeholder="e.g. 123 456 789 00012" />
      <Select label="Nature of contract" value={nature} onChange={e => setNature(e.target.value)}>
        <option value="">Select...</option>
        <option value="cachet">Cachet (intermittent)</option>
        <option value="salaire">Salaire fixe</option>
        <option value="auteur">Droits d'auteur</option>
        <option value="autre">Autre</option>
      </Select>
      <Textarea label="Address" value={address} onChange={e => setAddress(e.target.value)} placeholder="e.g. 12 rue de la Paix, Paris" style={{ minHeight: '60px' }} />
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
        <Button onClick={save} disabled={saving} style={{ flex: 2 }}>{saving ? 'Saving...' : 'Save'}</Button>
      </div>
    </Modal>
  )
}

// ── Tour Modal ───────────────────────────────────────────────
function TourModal({ open, onClose, editing, defaultArtistId }: {
  open: boolean, onClose: () => void, editing?: Tour | null, defaultArtistId?: string
}) {
  const { artists, addTour, updateTour } = useStore()
  const [aId, setAId] = useState(editing?.aId || defaultArtistId || '')
  const [title, setTitle] = useState(editing?.title || '')
  const [start, setStart] = useState(editing?.start || '')
  const [end, setEnd] = useState(editing?.end || '')
  const [city, setCity] = useState(editing?.city || '')
  const [type, setType] = useState<EventType>(editing?.type || 'show')
  const [notes, setNotes] = useState(editing?.notes || '')
  const [hotel, setHotel] = useState(editing?.hotel || '')
  const [room, setRoom] = useState(editing?.room || '')
  const [hotelAddr, setHotelAddr] = useState(editing?.hotelAddr || '')
  const [doclink, setDoclink] = useState(editing?.doclink || '')
  const [customCachet, setCustomCachet] = useState(editing?.customCachet?.toString() || '')
  const [customHours, setCustomHours] = useState(editing?.customHours?.toString() || '')
  const [showExtra, setShowExtra] = useState(false)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!start) { showToast('Date required', false); return }
    if (saving) return
    setSaving(true)
    const tour: Tour = {
      id: editing?.id || newId(),
      aId: aId || null,
      title: title.trim() || (type in EVENT_LABELS ? EVENT_LABELS[type] : 'Event'),
      start, end: end || start, city, type, paid: true, received: false,
      notes, hotel, room, hotelAddr, doclink,
      customCachet: customCachet ? parseFloat(customCachet) : null,
      customHours: customHours ? parseFloat(customHours) : null,
    }
    if (editing) updateTour(tour)
    else addTour(tour)
    await syncToCloud()
    showToast(tour.title + (editing ? ' updated' : ' added'))
    setSaving(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Event' : 'New Event'}>
      <Select label="Employer / Artist" value={aId} onChange={e => setAId(e.target.value)}>
        <option value="">No employer</option>
        {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
      </Select>
      <Select label="Type" value={type} onChange={e => setType(e.target.value as EventType)}>
        {Object.entries(EVENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </Select>
      <Input label="Title (optional)" value={title} onChange={e => setTitle(e.target.value)} placeholder={EVENT_LABELS[type]} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
        <Input label="Date *" type="date" value={start} onChange={e => setStart(e.target.value)} />
        <Input label="End date" type="date" value={end} onChange={e => setEnd(e.target.value)} />
      </div>
      <Input label="City" value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Paris" />

      <div onClick={() => setShowExtra(!showExtra)} style={{ cursor: 'pointer', color: '#5A5570', fontSize: '12px', marginBottom: showExtra ? '12px' : '0', display: 'flex', alignItems: 'center', gap: '4px' }}>
        {showExtra ? '▾' : '▸'} More details (hotel, ticket, cachet...)
      </div>

      {showExtra && (
        <>
          <Textarea label="Notes" value={notes} onChange={e => setNotes(e.target.value)} style={{ minHeight: '60px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <Input label="Hotel" value={hotel} onChange={e => setHotel(e.target.value)} />
            <Input label="Room #" value={room} onChange={e => setRoom(e.target.value)} />
          </div>
          <Input label="Hotel address" value={hotelAddr} onChange={e => setHotelAddr(e.target.value)} />
          <Input label="Document link" value={doclink} onChange={e => setDoclink(e.target.value)} placeholder="https://..." />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <Input label="Custom cachet (€)" type="number" value={customCachet} onChange={e => setCustomCachet(e.target.value)} placeholder="Use employer default" />
            <Input label="Custom hours" type="number" value={customHours} onChange={e => setCustomHours(e.target.value)} placeholder="Use employer default" />
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
        <Button onClick={save} disabled={saving} style={{ flex: 2 }}>{saving ? 'Saving...' : 'Save'}</Button>
      </div>
    </Modal>
  )
}

// ── Import Modal ────────────────────────────────────────────
function ImportModal({ open, onClose }: { open: boolean, onClose: () => void }) {
  const { artists, addTours } = useStore()
  const [artistId, setArtistId] = useState('')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<Tour[]>([])
  const [step, setStep] = useState<'upload' | 'preview'>('upload')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setStep('upload')

    try {
      const isImage = file.type.startsWith('image/')
      const isPDF = file.type === 'application/pdf'
      if (!isImage && !isPDF) { showToast('Please upload a PDF or image', false); setLoading(false); return }

      const b64 = await new Promise<string>((res) => {
        const reader = new FileReader()
        reader.onload = () => res((reader.result as string).split(',')[1])
        reader.readAsDataURL(file)
      })

      const contentBlocks = isImage
        ? [{ type: 'image', source: { type: 'base64', media_type: file.type, data: b64 } }, { type: 'text', text: IMPORT_PROMPT }]
        : [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } }, { type: 'text', text: IMPORT_PROMPT }]

      const data = await callClaude([{ role: 'user', content: contentBlocks }], 4000)

      if (data.error) { showToast('Error: ' + (data.error.message || 'Unknown error'), false); setLoading(false); return }

      const text = data.content?.[0]?.text || ''
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (!jsonMatch) { showToast('Could not parse dates from this document', false); setLoading(false); return }

      const parsed = JSON.parse(jsonMatch[0])
      const tours: Tour[] = parsed.map((e: any) => ({
        id: newId(),
        aId: artistId || null,
        title: e.venue || EVENT_LABELS[e.type as EventType] || 'Event',
        start: e.date,
        end: e.endDate || e.date,
        city: e.city || '',
        type: (e.type || 'show') as EventType,
        paid: true,
        received: false,
        notes: e.notes || '',
      }))

      setPreview(tours)
      setStep('preview')
    } catch (err) {
      showToast('Could not read the file', false)
    }
    setLoading(false)
  }

  const confirm = async () => {
    addTours(preview)
    await syncToCloud()
    showToast(`${preview.length} event${preview.length !== 1 ? 's' : ''} added ✓`)
    setPreview([])
    setStep('upload')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Import planning">
      {step === 'upload' && (
        <>
          <p style={{ fontSize: '13px', color: '#5A5570', marginBottom: '16px', lineHeight: 1.6 }}>
            Upload a PDF or screenshot of your planning — dates, venues and cities are added automatically.
          </p>
          <Select label="Employer / Artist" value={artistId} onChange={e => setArtistId(e.target.value)} style={{ marginBottom: '16px' }}>
            <option value="">Select employer (optional)</option>
            {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
          <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleFile} />
          <Button onClick={() => fileRef.current?.click()} disabled={loading} style={{ width: '100%' }}>
            {loading ? '⏳ Reading file...' : '📎 Choose PDF or photo'}
          </Button>
        </>
      )}

      {step === 'preview' && (
        <>
          <p style={{ fontSize: '13px', color: '#5A5570', marginBottom: '12px' }}>
            Found <strong style={{ color: '#E8E0F0' }}>{preview.length} events</strong>. Review before adding:
          </p>
          <div style={{ maxHeight: '50vh', overflowY: 'auto', marginBottom: '16px' }}>
            {preview.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid #1F1F2E' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: EVENT_COLORS[t.type], flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>{t.start} — {t.title}</div>
                  {t.city && <div style={{ fontSize: '11px', color: '#5A5570' }}>{t.city}</div>}
                </div>
                <div style={{ fontSize: '11px', color: '#5A5570' }}>{EVENT_LABELS[t.type]}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" onClick={() => setStep('upload')} style={{ flex: 1 }}>← Back</Button>
            <Button onClick={confirm} style={{ flex: 2 }}>Add {preview.length} events ✓</Button>
          </div>
        </>
      )}
    </Modal>
  )
}

const IMPORT_PROMPT = `You are extracting tour dates from an artist planning document.

IMPORTANT — DOCUMENT STRUCTURE:
Many tour plannings use a TWO-COLUMN layout where each column represents a different month.
- LEFT column = earlier month (e.g. June)
- RIGHT column = later month (e.g. July)
- You MUST identify which month header each date belongs to, not its physical position in the extracted text

CRITICAL DATE RULES:
- NEVER swap day and month
- French months: janvier=01, février=02, mars=03, avril=04, mai=05, juin=06, juillet=07, août=08, septembre=09, octobre=10, novembre=11, décembre=12
- Find the month headers first, then assign each day number to the correct month

EVENT TYPES: VOYAGE/DÉPART=travel, ARRIVÉE=travel, RÉPÉTITIONS/MONTAGE/BALANCE=rehearsal, Concert/Show/Spectacle=show, RÉSIDENCE=residence, else=workday

Return ONLY a valid JSON array:
[{"date":"YYYY-MM-DD","endDate":"YYYY-MM-DD","venue":"venue name","city":"city","type":"show|rehearsal|travel|workday|residence","notes":""}]`

// ── Tour Row ─────────────────────────────────────────────────
function TourRow({ tour, artist, onEdit, onDelete }: { tour: Tour, artist?: Artist, onEdit: () => void, onDelete: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderTop: '1px solid #1F1F2E' }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: EVENT_COLORS[tour.type], flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 700 }}>{tour.start}{tour.end && tour.end !== tour.start ? ` → ${tour.end}` : ''}</div>
        <div style={{ fontSize: '12px', color: '#5A5570' }}>
          {tour.title}{tour.city ? ` · ${tour.city}` : ''}
          {artist && <span style={{ color: artist.color }}> · {artist.name}</span>}
        </div>
      </div>
      <div style={{ fontSize: '11px', color: '#5A5570', flexShrink: 0 }}>{EVENT_LABELS[tour.type]}</div>
      <div style={{ display: 'flex', gap: '4px' }}>
        <Button variant="secondary" size="sm" onClick={onEdit}>✏</Button>
        <Button variant="danger" size="sm" onClick={onDelete}>✕</Button>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────
export default function ToursPage() {
  const { artists, tours, deleteArtist, deleteTour } = useStore()
  const [showArtistModal, setShowArtistModal] = useState(false)
  const [showTourModal, setShowTourModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingArtist, setEditingArtist] = useState<Artist | null>(null)
  const [editingTour, setEditingTour] = useState<Tour | null>(null)
  const [selectedArtistId, setSelectedArtistId] = useState<string>('all')
  const [sortMode, setSortMode] = useState<SortMode>('date')

  const filteredArtists = selectedArtistId === 'all' ? artists : artists.filter(a => a.id === selectedArtistId)

  const handleDeleteArtist = async (artist: Artist) => {
    const count = tours.filter(t => t.aId === artist.id).length
    if (!confirm(`Delete "${artist.name}"${count > 0 ? ` and all ${count} events` : ''}? This cannot be undone.`)) return
    await deleteFromCloud('artists', artist.id)
    const artistTours = tours.filter(t => t.aId === artist.id)
    for (const t of artistTours) await deleteFromCloud('tours', t.id)
    deleteArtist(artist.id)
    showToast(artist.name + ' deleted')
  }

  const handleDeleteTour = async (tour: Tour) => {
    if (!confirm(`Delete "${tour.title}"?`)) return
    await deleteFromCloud('tours', tour.id)
    deleteTour(tour.id)
    showToast('Event deleted')
  }

  return (
    <div style={{ padding: '0 0 100px' }}>
      <Toolbar
        title="Tours & Events"
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => { setShowArtistModal(true); setEditingArtist(null) }}>+ Artist</Button>
            <Button size="sm" onClick={() => { setShowTourModal(true); setEditingTour(null) }}>+ Date</Button>
          </>
        }
      />

      {/* Import banner */}
      <div style={{ margin: '0 16px 16px', background: '#17171F', border: '1px solid #1F1F2E', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '2px' }}>Import a production planning PDF</div>
          <div style={{ fontSize: '12px', color: '#5A5570' }}>Upload the planning sent by the production — all dates added automatically.</div>
        </div>
        <Button size="sm" onClick={() => setShowImportModal(true)} style={{ flexShrink: 0 }}>📎 Import</Button>
      </div>

      {/* Sort toggle + Artist filter */}
      <div style={{ padding: '0 16px', marginBottom: '16px', display: 'flex', gap: '8px' }}>
        <div style={{ display: 'flex', background: '#12121A', borderRadius: '8px', border: '1px solid #1F1F2E', overflow: 'hidden' }}>
          <button onClick={() => setSortMode('date')} style={{ padding: '7px 12px', background: sortMode === 'date' ? '#C9A84C' : 'transparent', color: sortMode === 'date' ? '#0A0A0F' : '#5A5570', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 700 }}>📅 By date</button>
          <button onClick={() => setSortMode('artist')} style={{ padding: '7px 12px', background: sortMode === 'artist' ? '#C9A84C' : 'transparent', color: sortMode === 'artist' ? '#0A0A0F' : '#5A5570', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 700 }}>🎤 By artist</button>
        </div>
        {sortMode === 'artist' && artists.length > 1 && (
          <select value={selectedArtistId} onChange={e => setSelectedArtistId(e.target.value)} style={{ flex: 1, background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '8px', padding: '8px 12px', fontFamily: 'inherit', fontSize: '13px' }}>
            <option value="all">All artists</option>
            {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}
      </div>

      {/* By date view */}
      {sortMode === 'date' && (
        <div style={{ padding: '0 16px' }}>
          {tours.length === 0 ? (
            <EmptyState icon="🎤" title="No events yet" sub='Add an employer / artist with "+ Artist", then add dates or import a planning PDF.' />
          ) : (
            <>
              {(() => {
                const today = new Date().toISOString().slice(0, 10)
                const sorted = [...tours].sort((a, b) => a.start.localeCompare(b.start))
                const upcoming = sorted.filter(t => t.start >= today)
                const past = sorted.filter(t => t.start < today).reverse()
                return (
                  <>
                    {upcoming.length > 0 && (
                      <>
                        <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: '#5A5570', marginBottom: '10px' }}>Upcoming</div>
                        {upcoming.map(tour => {
                          const artist = artists.find(a => a.id === tour.aId)
                          return <TourRow key={tour.id} tour={tour} artist={artist} onEdit={() => { setEditingTour(tour); setShowTourModal(true) }} onDelete={() => handleDeleteTour(tour)} />
                        })}
                      </>
                    )}
                    {past.length > 0 && (
                      <>
                        <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: '#5A5570', margin: '16px 0 10px', opacity: 0.5 }}>Past</div>
                        {past.map(tour => {
                          const artist = artists.find(a => a.id === tour.aId)
                          return <TourRow key={tour.id} tour={tour} artist={artist} onEdit={() => { setEditingTour(tour); setShowTourModal(true) }} onDelete={() => handleDeleteTour(tour)} />
                        })}
                      </>
                    )}
                  </>
                )
              })()}
            </>
          )}
        </div>
      )}

      {/* By artist view */}
      {sortMode === 'artist' && (
        <div style={{ padding: '0 16px' }}>
          {artists.length === 0 ? (
            <EmptyState icon="🎤" title="No artists yet" sub='Add an employer / artist with "+ Artist" to get started.' />
          ) : (
            (selectedArtistId === 'all' ? artists : artists.filter(a => a.id === selectedArtistId)).map(artist => {
              const artistTours = tours.filter(t => t.aId === artist.id).sort((a, b) => a.start.localeCompare(b.start))
              return (
                <Card key={artist.id} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: artistTours.length ? '12px' : '0' }}>
                    <ColorDot color={artist.color} size={10} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 900, fontSize: '15px' }}>{artist.name}</div>
                      {artist.genre && <div style={{ fontSize: '12px', color: '#5A5570' }}>{artist.genre}</div>}
                      <div style={{ fontSize: '11px', color: '#5A5570' }}>{artistTours.length} event{artistTours.length !== 1 ? 's' : ''}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <Button variant="secondary" size="sm" onClick={() => { setEditingArtist(artist); setShowArtistModal(true) }}>✏ Edit</Button>
                      <Button variant="danger" size="sm" onClick={() => handleDeleteArtist(artist)}>✕</Button>
                    </div>
                  </div>
                  {artistTours.length === 0 && (
                    <div style={{ fontSize: '12px', color: '#5A5570', fontStyle: 'italic', marginTop: '8px' }}>No dates yet.</div>
                  )}
                  {artistTours.map(tour => (
                    <TourRow key={tour.id} tour={tour} artist={artist} onEdit={() => { setEditingTour(tour); setShowTourModal(true) }} onDelete={() => handleDeleteTour(tour)} />
                  ))}
                  <button onClick={() => { setEditingTour(null); setSelectedArtistId(artist.id); setShowTourModal(true) }} style={{ width: '100%', background: 'none', border: '1px dashed #1F1F2E', color: '#5A5570', borderRadius: '8px', padding: '8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', marginTop: '8px' }}>
                    + Add date for {artist.name}
                  </button>
                </Card>
              )
            })
          )}
        </div>
      )}

      <ArtistModal open={showArtistModal} onClose={() => setShowArtistModal(false)} editing={editingArtist} />
      <TourModal open={showTourModal} onClose={() => setShowTourModal(false)} editing={editingTour} defaultArtistId={selectedArtistId !== 'all' ? selectedArtistId : undefined} />
      <ImportModal open={showImportModal} onClose={() => setShowImportModal(false)} />
    </div>
  )
}
