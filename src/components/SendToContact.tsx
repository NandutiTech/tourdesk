'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { Modal, Button, showToast } from '@/components/ui'
import { Contact } from '@/lib/types'

interface SendToContactProps {
  open: boolean
  onClose: () => void
  subject: string
  body: string
}

const PHONE_PREFIXES = [
  { label: '🇫🇷 +33', value: '+33' },
  { label: '🇪🇸 +34', value: '+34' },
  { label: '🇵🇾 +595', value: '+595' },
  { label: '🇧🇪 +32', value: '+32' },
  { label: '🇨🇭 +41', value: '+41' },
  { label: '🇮🇹 +39', value: '+39' },
  { label: '🇬🇧 +44', value: '+44' },
  { label: '🇩🇪 +49', value: '+49' },
  { label: '🇵🇹 +351', value: '+351' },
  { label: '🇳🇱 +31', value: '+31' },
  { label: '🇺🇸 +1', value: '+1' },
  { label: '🇦🇷 +54', value: '+54' },
  { label: '🇧🇷 +55', value: '+55' },
  { label: '🇲🇽 +52', value: '+52' },
]

export function parsePhone(phone: string): { prefix: string, number: string } {
  for (const p of PHONE_PREFIXES) {
    if (phone.startsWith(p.value)) return { prefix: p.value, number: phone.slice(p.value.length) }
  }
  return { prefix: '+33', number: phone }
}

export function SendToContact({ open, onClose, subject, body }: SendToContactProps) {
  const { contacts, artists } = useStore()
  const [selected, setSelected] = useState<Contact | null>(null)
  const [filterArtistId, setFilterArtistId] = useState('all')

  const filtered = contacts.filter(c =>
    filterArtistId === 'all' || !c.aId || c.aId === filterArtistId
  ).sort((a, b) => a.name.localeCompare(b.name))

  const sendVia = (via: 'wa' | 'sms' | 'gmail' | 'copy') => {
    if (!selected) return
    const phone = selected.phone || selected.contact || ''
    const email = selected.email || (selected.contact?.includes('@') ? selected.contact : '')
    const clean = phone.replace(/[^+0-9]/g, '')

    if (via === 'wa') window.open(`https://wa.me/${clean}?text=${encodeURIComponent(body)}`, '_blank')
    if (via === 'sms') window.open(`sms:${clean}?body=${encodeURIComponent(body)}`)
    if (via === 'gmail') window.open(`https://mail.google.com/mail/?view=cm&tf=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank')
    if (via === 'copy') { navigator.clipboard?.writeText(body); showToast('Copied!') }
  }

  const hasPhone = (c: Contact) => !!(c.phone || (c.contact && !c.contact.includes('@')))
  const hasEmail = (c: Contact) => !!(c.email || c.contact?.includes('@'))

  return (
    <Modal open={open} onClose={() => { setSelected(null); onClose() }} title="Send to contact">
      {/* Artist filter */}
      {artists.length > 0 && (
        <select
          value={filterArtistId}
          onChange={e => setFilterArtistId(e.target.value)}
          style={{ width: '100%', background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '8px', padding: '9px 12px', fontFamily: 'inherit', fontSize: '13px', marginBottom: '12px', boxSizing: 'border-box' }}
        >
          <option value="all">All contacts</option>
          {artists.map(a => <option key={a.id} value={a.id}>📁 {a.name}</option>)}
        </select>
      )}

      {/* Contact list */}
      <div style={{ maxHeight: '240px', overflowY: 'auto', marginBottom: '16px', border: '1px solid #1F1F2E', borderRadius: '10px' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#5A5570', fontSize: '13px' }}>
            No contacts yet — add some in Industry Contacts.
          </div>
        ) : filtered.map(c => {
          const isSelected = selected?.id === c.id
          const artist = artists.find(a => a.id === c.aId)
          return (
            <div
              key={c.id}
              onClick={() => setSelected(isSelected ? null : c)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                cursor: 'pointer', borderBottom: '1px solid #1F1F2E',
                background: isSelected ? 'rgba(201,168,76,.1)' : 'transparent'
              }}
            >
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: isSelected ? '#C9A84C' : '#1F1F2E',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: '13px',
                color: isSelected ? '#0A0A0F' : '#5A5570', flexShrink: 0
              }}>
                {isSelected ? '✓' : c.name[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '13px' }}>{c.name}</div>
                <div style={{ fontSize: '11px', color: '#5A5570' }}>
                  {c.role}{c.role && c.company ? ' · ' : ''}{c.company}
                  {artist && <span style={{ color: artist.color }}> · {artist.name}</span>}
                </div>
                <div style={{ fontSize: '11px', color: '#5A5570' }}>
                  {hasPhone(c) && '📱'} {hasEmail(c) && '✉'}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Send buttons */}
      {selected ? (
        <>
          <div style={{ fontSize: '12px', color: '#5A5570', marginBottom: '10px', textAlign: 'center' }}>
            Sending to <strong style={{ color: '#E8E0F0' }}>{selected.name}</strong>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            {hasPhone(selected) && (
              <button onClick={() => sendVia('wa')} style={{ background: '#25D366', border: 'none', color: 'white', borderRadius: '10px', padding: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: '13px' }}>
                💬 WhatsApp
              </button>
            )}
            {hasPhone(selected) && (
              <button onClick={() => sendVia('sms')} style={{ background: '#4C9AC9', border: 'none', color: 'white', borderRadius: '10px', padding: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: '13px' }}>
                📱 SMS
              </button>
            )}
            {hasEmail(selected) && (
              <button onClick={() => sendVia('gmail')} style={{ background: '#EA4335', border: 'none', color: 'white', borderRadius: '10px', padding: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: '13px' }}>
                ✉ Gmail
              </button>
            )}
            <button onClick={() => sendVia('copy')} style={{ background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '10px', padding: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '13px' }}>
              📋 Copy
            </button>
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', color: '#5A5570', fontSize: '13px', padding: '8px 0' }}>
          Select a contact above to send
        </div>
      )}

      <Button variant="secondary" onClick={onClose} style={{ width: '100%', marginTop: '8px' }}>Close</Button>
    </Modal>
  )
}
