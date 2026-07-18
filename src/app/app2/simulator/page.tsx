'use client'
import { useState, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { Card, Toolbar } from '@/components/ui'

const AJ_MIN = 31.36
const PLANCHER_A10 = 44
const PLANCHER_A8 = 38
const PLAFOND = 152.77

function calcAJ(salaire: number, heures: number, annexe: '8' | '10') {
  const SA1 = Math.min(salaire, 13700)
  const SA2 = Math.max(salaire - 13700, 0)
  const Ac = annexe === '10' ? { a: 0.36, b: 0.05 } : { a: 0.42, b: 0.06 }
  const A = AJ_MIN * (Ac.a * SA1 + Ac.b * SA2) / 5000
  const H1 = Math.min(heures, 690)
  const H2 = Math.max(heures - 690, 0)
  const Bc = annexe === '10' ? { a: 0.26, b: 0.08 } : { a: 0.40, b: 0.10 }
  const B = AJ_MIN * (Bc.a * H1 + Bc.b * H2) / 507
  const C = annexe === '10' ? 21.95 : 14.40
  const plancher = annexe === '10' ? PLANCHER_A10 : PLANCHER_A8
  return Math.min(Math.max(A + B + C, plancher), PLAFOND)
}

export default function SimulatorPage() {
  const { tours, artists, hoursPerEventType } = useStore()
  const [annexe, setAnnexe] = useState<'8' | '10'>('10')
  const [salaire, setSalaire] = useState('')
  const [heuresCumul, setHeuresCumul] = useState('')

  const today = new Date().toISOString().slice(0, 10)
  const ref12 = new Date(); ref12.setMonth(ref12.getMonth() - 12)
  const ref12Str = ref12.toISOString().slice(0, 10)

  const { heures12 } = useMemo(() => {
    let h = 0
    for (const t of tours) {
      if (t.start > today || t.start < ref12Str) continue
      const artist = artists.find(a => a.id === t.aId)
      const hDefault = (artist as any)?.defaultHours ?? (hoursPerEventType as any)[t.type] ?? 12
      h += (t.customHours ?? hDefault) * ((t as any).cachetCount || 1)
    }
    return { heures12: h }
  }, [tours, artists, hoursPerEventType])

  const salaireNum = parseFloat(salaire) || 0
  const heuresNum = heures12
  const aj = salaireNum > 0 ? calcAJ(salaireNum, heuresNum, annexe) : null

  // Cumul
  const hCumul = parseFloat(heuresCumul) || 0
  const joursDeduitsRaw = annexe === '10' ? (hCumul / 10) * 1.34 : (hCumul / 8) * 1.4
  const joursDeduits = Math.min(joursDeduitsRaw, 30)
  const joursIndemnises = Math.max(30 - joursDeduits, 0)
  const areCumul = aj ? aj * joursIndemnises : null

  return (
    <div style={{ padding: '0 0 100px' }}>
      <Toolbar title="Simulateur ARE" />
      <div style={{ padding: '0 16px' }}>

        {/* Annexe selector */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {(['10', '8'] as const).map(a => (
            <button key={a} onClick={() => setAnnexe(a)} style={{ flex: 1, padding: '14px 8px', borderRadius: '12px', border: `2px solid ${annexe === a ? '#C9A84C' : '#1F1F2E'}`, background: annexe === a ? 'rgba(201,168,76,.1)' : '#12121A', color: annexe === a ? '#C9A84C' : '#5A5570', fontFamily: 'inherit', fontWeight: 800, fontSize: '13px', cursor: 'pointer', lineHeight: 1.4 }}>
              {a === '10' ? '🎤 Artiste' : '🎛 Technicien'}<br />
              <span style={{ fontSize: '11px', fontWeight: 400 }}>Annexe {a}</span>
            </button>
          ))}
        </div>

        {/* Heures from calendar */}
        <Card style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700 }}>Heures travaillées</div>
              <div style={{ fontSize: '11px', color: '#5A5570' }}>12 derniers mois · depuis ton calendrier</div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: heures12 >= 507 ? '#5DC9A0' : '#C9A84C' }}>
              {heures12.toFixed(0)}h
            </div>
          </div>
        </Card>

        {/* Salary input */}
        <Card style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>Salaire brut de référence</div>
          <div style={{ fontSize: '11px', color: '#5A5570', marginBottom: '12px' }}>
            Total de tes salaires bruts sur 12 mois — visible sur tes AEM (attestations employeur)
          </div>
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              value={salaire}
              onChange={e => setSalaire(e.target.value)}
              placeholder="ex: 8500"
              style={{ width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid #1E1E2E', color: '#E8E0F0', borderRadius: '10px', padding: '14px 40px 14px 14px', fontFamily: 'inherit', fontSize: '20px', fontWeight: 800, outline: 'none', boxSizing: 'border-box' }}
            />
            <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#5A5570', fontSize: '18px', fontWeight: 700 }}>€</span>
          </div>
        </Card>

        {/* Result */}
        {aj !== null ? (
          <Card style={{ marginBottom: '12px', background: 'rgba(93,201,160,.04)', border: '1px solid rgba(93,201,160,.2)' }}>
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: '12px', color: '#5A5570', marginBottom: '6px' }}>Allocation journalière estimée</div>
              <div style={{ fontSize: '52px', fontWeight: 900, color: '#5DC9A0', lineHeight: 1 }}>€{aj.toFixed(2)}</div>
              <div style={{ fontSize: '13px', color: '#5A5570', marginBottom: '20px' }}>/jour</div>
              <div style={{ background: '#12121A', borderRadius: '12px', padding: '16px', display: 'inline-block', width: '100%', boxSizing: 'border-box' }}>
                <div style={{ fontSize: '12px', color: '#5A5570', marginBottom: '4px' }}>Mensuel sans travailler</div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#C9A84C' }}>€{(aj * 30).toFixed(0)}</div>
              </div>
            </div>
          </Card>
        ) : (
          <Card style={{ marginBottom: '12px', background: '#12121A', textAlign: 'center', padding: '24px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>💶</div>
            <div style={{ fontSize: '13px', color: '#5A5570' }}>Entre ton salaire brut pour voir ton allocation estimée</div>
          </Card>
        )}

        {/* Cumul section */}
        {aj !== null && (
          <Card style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>Si tu travailles ce mois</div>
            <div style={{ fontSize: '11px', color: '#5A5570', marginBottom: '12px' }}>
              Tu peux cumuler travail et ARE. Entre tes heures travaillées ce mois pour voir combien tu reçois quand même.
            </div>
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <input
                type="number"
                value={heuresCumul}
                onChange={e => setHeuresCumul(e.target.value)}
                placeholder="ex: 36"
                style={{ width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid #1E1E2E', color: '#E8E0F0', borderRadius: '10px', padding: '12px 50px 12px 14px', fontFamily: 'inherit', fontSize: '18px', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
              />
              <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#5A5570', fontSize: '13px' }}>heures</span>
            </div>
            {hCumul > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ background: '#12121A', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#5A5570', marginBottom: '4px' }}>Jours déduits</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#E8453C' }}>{joursDeduits.toFixed(1)}</div>
                </div>
                <div style={{ background: '#12121A', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#5A5570', marginBottom: '4px' }}>ARE quand même</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#5DC9A0' }}>€{areCumul?.toFixed(0)}</div>
                </div>
              </div>
            )}
          </Card>
        )}

        <div style={{ fontSize: '11px', color: '#3A3550', textAlign: 'center', lineHeight: 1.6 }}>
          Estimation basée sur la formule officielle France Travail.<br />
          Confirme ton montant réel avec France Travail.
        </div>
      </div>
    </div>
  )
}
