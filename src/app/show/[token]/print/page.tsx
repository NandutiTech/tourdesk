'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

export default function ShowPrintPage() {
  const { token } = useParams()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/show-public?token=${token}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
  }, [token])

  useEffect(() => {
    if (!loading && data) {
      setTimeout(() => window.print(), 500)
    }
  }, [loading, data])

  if (loading) return <div style={{ padding: '40px', fontFamily: 'Georgia, serif', textAlign: 'center' }}>Loading...</div>

  const { show, tour, members, tickets, guests } = data

  const getMemberTickets = (memberId: string) => ({
    out: tickets.filter((t: any) => t.member_id === memberId && t.direction === 'out'),
    ret: tickets.filter((t: any) => t.member_id === memberId && t.direction === 'ret'),
  })

  return (
    <div style={{ fontFamily: 'Georgia, serif', color: '#000', maxWidth: '750px', margin: '0 auto', padding: '32px 24px' }}>
      <style>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
          .page-break { page-break-before: always; }
        }
        @page { margin: 1.5cm; }
      `}</style>

      {/* Print button */}
      <div className="no-print" style={{ textAlign: 'right', marginBottom: '24px' }}>
        <button onClick={() => window.print()} style={{ background: '#000', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 700 }}>
          🖨 Print / Save as PDF
        </button>
      </div>

      {/* Header */}
      <div style={{ borderBottom: '3px solid #000', paddingBottom: '16px', marginBottom: '24px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px', color: '#666' }}>TourDesk · Tour Sheet</div>
        <h1 style={{ margin: '0 0 4px', fontSize: '28px', fontWeight: 900 }}>{show.venue || 'Show'}</h1>
        <div style={{ fontSize: '16px', color: '#444' }}>
          {show.date}{show.city ? ` · ${show.city}` : ''}
          {tour?.name && ` · ${tour.name}`}
        </div>
      </div>

      {/* Show info sections */}
      {[
        { key: 'hotel', icon: '🏨', label: 'Accommodation' },
        { key: 'transfers', icon: '🚌', label: 'Transfers' },
        { key: 'meals', icon: '🍽', label: 'Meals' },
        { key: 'planning', icon: '📅', label: 'Planning' },
        { key: 'technique', icon: '🎛', label: 'Technical' },
        { key: 'setlist', icon: '🎵', label: 'Setlist' },
      ].filter(f => show[f.key]).map(f => (
        <div key={f.key} style={{ marginBottom: '20px' }}>
          <h2 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid #ddd', paddingBottom: '4px' }}>
            {f.icon} {f.label}
          </h2>
          <div style={{ fontSize: '13px', lineHeight: 1.7, whiteSpace: 'pre-wrap', color: '#222' }}>{show[f.key]}</div>
          {f.key === 'hotel' && show.hotel_addr && <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>📍 {show.hotel_addr}</div>}
          {f.key === 'hotel' && show.hotel_notes && <div style={{ fontSize: '12px', color: '#444', marginTop: '4px', fontStyle: 'italic' }}>{show.hotel_notes}</div>}
        </div>
      ))}

      {/* Team & Tickets */}
      {members.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <h2 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid #ddd', paddingBottom: '4px' }}>
            ✈ Team & Tickets
          </h2>
          {members.map((m: any) => {
            const tix = getMemberTickets(m.id)
            return (
              <div key={m.id} style={{ marginBottom: '14px', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>{m.name}{m.role ? ` · ${m.role}` : ''}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#888', marginBottom: '4px' }}>Outbound</div>
                    {tix.out.length === 0 ? <div style={{ fontSize: '12px', color: '#aaa' }}>—</div> : tix.out.map((t: any, i: number) => (
                      <div key={i} style={{ fontSize: '12px', lineHeight: 1.5 }}>
                        {t.info?.from && t.info?.to && <div>{t.info.from} → {t.info.to}</div>}
                        {t.info?.date && <div style={{ color: '#666' }}>{t.info.date}{t.info.time ? ` · ${t.info.time}` : ''}{t.info.ref ? ` · ${t.info.ref}` : ''}</div>}
                        {!t.info?.from && <div style={{ color: '#666' }}>{t.ticket_name}</div>}
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#888', marginBottom: '4px' }}>Return</div>
                    {tix.ret.length === 0 ? <div style={{ fontSize: '12px', color: '#aaa' }}>—</div> : tix.ret.map((t: any, i: number) => (
                      <div key={i} style={{ fontSize: '12px', lineHeight: 1.5 }}>
                        {t.info?.from && t.info?.to && <div>{t.info.from} → {t.info.to}</div>}
                        {t.info?.date && <div style={{ color: '#666' }}>{t.info.date}{t.info.time ? ` · ${t.info.time}` : ''}{t.info.ref ? ` · ${t.info.ref}` : ''}</div>}
                        {!t.info?.from && <div style={{ color: '#666' }}>{t.ticket_name}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Guest list */}
      {guests?.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <h2 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid #ddd', paddingBottom: '4px' }}>
            🎫 Guest List ({guests.reduce((s: number, g: any) => s + (g.count || 1), 0)} places)
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ddd' }}>
                <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 700 }}>Name</th>
                <th style={{ textAlign: 'center', padding: '4px 8px', fontWeight: 700 }}>Places</th>
                <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 700 }}>For</th>
                <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 700 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((g: any) => (
                <tr key={g.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '6px 8px' }}>{g.name}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'center' }}>{g.count || 1}</td>
                  <td style={{ padding: '6px 8px', color: '#666' }}>{g.member_id ? members.find((m: any) => m.id === g.member_id)?.name || '' : ''}</td>
                  <td style={{ padding: '6px 8px', color: g.status === 'confirmed' ? '#2a7' : g.status === 'pending' ? '#a70' : '#a22' }}>{g.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: '40px', paddingTop: '12px', borderTop: '1px solid #ddd', fontSize: '10px', color: '#aaa', display: 'flex', justifyContent: 'space-between' }}>
        <span>Generated by TourDesk · tourdesktop.com</span>
        <span>{new Date().toLocaleDateString('fr-FR')}</span>
      </div>
    </div>
  )
}
