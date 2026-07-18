'use client'
import { useState, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { Card, Input, Select, Toolbar } from '@/components/ui'

// ─── France Travail formulas ───────────────────────────────────────────────
const AJ_MIN = 31.36
const PLANCHER_A10 = 44     // artistes
const PLANCHER_A8 = 38      // techniciens
const PLAFOND = 152.77
const CACHET_HOURS = 12     // since Aug 2016

function calcAJ(salaire: number, heures: number, annexe: '8' | '10') {
  const H_REF = annexe === '10' ? 507 : 507
  const SAR = salaire // salaire de référence brut

  // Partie A — liée au salaire
  const SA1 = Math.min(SAR, 13700)
  const SA2 = Math.max(SAR - 13700, 0)
  const A_coef = annexe === '10' ? { a: 0.36, b: 0.05 } : { a: 0.42, b: 0.06 }
  const A = AJ_MIN * (A_coef.a * SA1 + A_coef.b * SA2) / 5000

  // Partie B — liée aux heures
  const H1 = Math.min(heures, 690)
  const H2 = Math.max(heures - 690, 0)
  const B_coef = annexe === '10' ? { a: 0.26, b: 0.08 } : { a: 0.40, b: 0.10 }
  const B = AJ_MIN * (B_coef.a * H1 + B_coef.b * H2) / H_REF

  // Partie C — fixe
  const C = annexe === '10' ? 21.95 : 14.40

  const AJ = A + B + C
  const plancher = annexe === '10' ? PLANCHER_A10 : PLANCHER_A8
  return Math.min(Math.max(AJ, plancher), PLAFOND)
}

// Jours non indemnisés quand on travaille (cumul)
function joursNonIndemnises(heuresTravaillees: number, annexe: '8' | '10') {
  if (annexe === '10') return (heuresTravaillees / 10) * 1.34
  return (heuresTravaillees / 8) * 1.4
}

export default function SimulatorPage() {
  const { tours, artists, hoursPerEventType } = useStore()
  const [annexe, setAnnexe] = useState<'8' | '10'>('10')
  const [manualSalary, setManualSalary] = useState('')
  const [manualHours, setManualHours] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [heuresTouche, setHeuresTouche] = useState('100') // heures travaillées dans le mois pour cumul

  const today = new Date()
  const ref12Start = new Date(today)
  ref12Start.setMonth(ref12Start.getMonth() - 12)
  const ref10Start = new Date(today)
  ref10Start.setMonth(ref10Start.getMonth() - 10)

  // Compute from real calendar data
  const stats = useMemo(() => {
    const ref12 = ref12Start.toISOString().slice(0, 10)
    const ref10 = ref10Start.toISOString().slice(0, 10)
    const todayStr = today.toISOString().slice(0, 10)

    let heures12 = 0, cachets12 = 0, salaire12 = 0
    let heures10 = 0, cachets10 = 0

    for (const t of tours) {
      if (t.start > todayStr) continue
      const hType = (hoursPerEventType as any)[t.type] || 1
      const h = t.customHours || hType
      // salary estimation: cachet brut moyen (rough)
      const cachetCount = (t as any).cachetCount || 1

      if (t.start >= ref12) {
        heures12 += h * cachetCount
        cachets12 += cachetCount
        // If artist has defaultCachet use it, otherwise rough
        const artist = artists.find(a => a.id === t.aId)
        const cachetBrut = (t as any).customCachet || (artist as any)?.defaultCachet || 150
        salaire12 += cachetBrut * cachetCount
      }
      if (t.start >= ref10) {
        heures10 += h * cachetCount
        cachets10 += cachetCount
      }
    }

    return { heures12, cachets12, salaire12, heures10, cachets10 }
  }, [tours, artists, hoursPerEventType])

  // Use manual overrides or real data
  const heures = parseFloat(manualHours) || stats.heures12
  const salaire = parseFloat(manualSalary) || stats.salaire12

  const has507_12 = heures >= 507
  const has507_10 = stats.heures10 >= 507
  const manque12 = Math.max(507 - heures, 0)
  const manque10 = Math.max(507 - stats.heures10, 0)
  const cachetsManquants = Math.ceil(manque12 / CACHET_HOURS)

  const pct = Math.min((heures / 507) * 100, 100)

  const aj = calcAJ(salaire, heures, annexe)
  const mensuel = aj * 30.42
  const heuresCumul = parseFloat(heuresTouche) || 0
  const joursDeduitsParMois = joursNonIndemnises(heuresCumul, annexe)
  const joursIndemnisesParMois = Math.max(30.42 - joursDeduitsParMois, 0)
  const revenuCumul = aj * joursIndemnisesParMois

  const plancher = annexe === '10' ? PLANCHER_A10 : PLANCHER_A8
  const usePlancher = calcAJ(salaire, heures, annexe) <= plancher

  return (
    <div style={{ padding: '0 0 100px' }}>
      <Toolbar title="Simulateur ARE" />
      <div style={{ padding: '0 16px' }}>

        {/* Annexe selector */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {(['10', '8'] as const).map(a => (
            <button key={a} onClick={() => setAnnexe(a)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: `2px solid ${annexe === a ? '#C9A84C' : '#1F1F2E'}`, background: annexe === a ? 'rgba(201,168,76,.1)' : '#12121A', color: annexe === a ? '#C9A84C' : '#5A5570', fontFamily: 'inherit', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}>
              {a === '10' ? '🎤 Artiste\nAnnexe 10' : '🎛 Technicien\nAnnexe 8'}
            </button>
          ))}
        </div>

        {/* 507h progress */}
        <Card style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800 }}>Progression 507h</div>
              <div style={{ fontSize: '11px', color: '#5A5570' }}>12 derniers mois</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '24px', fontWeight: 900, color: has507_12 ? '#5DC9A0' : '#C9A84C' }}>{heures.toFixed(0)}h</div>
              <div style={{ fontSize: '11px', color: '#5A5570' }}>{stats.cachets12} cachets</div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ background: '#12121A', borderRadius: '8px', height: '12px', overflow: 'hidden', marginBottom: '8px', position: 'relative' }}>
            <div style={{ height: '100%', background: has507_12 ? '#5DC9A0' : 'linear-gradient(90deg, #C9A84C, #E8B86D)', width: `${pct}%`, transition: 'width .5s', borderRadius: '8px' }} />
            {/* 507h marker */}
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: '100%', width: '2px', background: '#5DC9A0' }} />
          </div>

          {has507_12 ? (
            <div style={{ background: 'rgba(93,201,160,.1)', border: '1px solid rgba(93,201,160,.2)', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: '#5DC9A0', fontWeight: 700 }}>
              ✓ Tu as les 507h — droits ouverts sur 12 mois
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ background: 'rgba(201,168,76,.08)', border: '1px solid rgba(201,168,76,.2)', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: '#C9A84C' }}>
                ⚡ Il te manque <strong>{manque12.toFixed(0)}h</strong> soit <strong>{cachetsManquants} cachets</strong> pour les 507h
              </div>
              {has507_10 ? (
                <div style={{ background: 'rgba(93,201,160,.06)', border: '1px solid rgba(93,201,160,.15)', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: '#5DC9A0' }}>
                  ✓ Clause de rattrapage : 507h atteintes sur 10 mois
                </div>
              ) : manque10 < manque12 ? (
                <div style={{ fontSize: '11px', color: '#5A5570', padding: '4px 8px' }}>
                  Sur 10 mois (réadmission) : {stats.heures10.toFixed(0)}h · il manque {manque10.toFixed(0)}h
                </div>
              ) : null}
            </div>
          )}
        </Card>

        {/* Salary input */}
        <Card style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '12px' }}>Salaire de référence</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#5A5570', marginBottom: '4px' }}>Brut total (€)</div>
              <input
                type="number"
                value={manualSalary}
                onChange={e => setManualSalary(e.target.value)}
                placeholder={stats.salaire12.toFixed(0) + ' (estimé)'}
                style={{ width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid #1E1E2E', color: '#E8E0F0', borderRadius: '8px', padding: '10px', fontFamily: 'inherit', fontSize: '14px', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#5A5570', marginBottom: '4px' }}>Heures travaillées</div>
              <input
                type="number"
                value={manualHours}
                onChange={e => setManualHours(e.target.value)}
                placeholder={heures.toFixed(0)}
                style={{ width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid #1E1E2E', color: '#E8E0F0', borderRadius: '8px', padding: '10px', fontFamily: 'inherit', fontSize: '14px', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <div style={{ fontSize: '11px', color: '#5A5570', marginTop: '8px' }}>
            Laisse vide pour utiliser tes données réelles · {stats.cachets12} cachets · ~€{stats.salaire12.toFixed(0)} estimé
          </div>
        </Card>

        {/* Result */}
        <Card style={{ marginBottom: '12px', background: 'rgba(93,201,160,.04)', border: '1px solid rgba(93,201,160,.15)' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '16px' }}>Allocation journalière (ARE)</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
            <div style={{ fontSize: '48px', fontWeight: 900, color: '#5DC9A0', lineHeight: 1 }}>€{aj.toFixed(2)}</div>
            <div style={{ fontSize: '14px', color: '#5A5570', paddingBottom: '8px' }}>/jour</div>
          </div>
          {usePlancher && (
            <div style={{ textAlign: 'center', fontSize: '11px', color: '#C9A84C', marginBottom: '12px' }}>
              Plancher Annexe {annexe} appliqué (minimum garanti)
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
            <div style={{ background: '#12121A', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#5A5570', marginBottom: '4px' }}>Mensuel estimé</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#C9A84C' }}>€{mensuel.toFixed(0)}</div>
              <div style={{ fontSize: '10px', color: '#5A5570' }}>sans travail</div>
            </div>
            <div style={{ background: '#12121A', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#5A5570', marginBottom: '4px' }}>Durée</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#5DC9A0' }}>12 mois</div>
              <div style={{ fontSize: '10px', color: '#5A5570' }}>date anniversaire</div>
            </div>
          </div>
        </Card>

        {/* Cumul simulator */}
        <Card style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '12px' }}>
            Simulateur cumul travail + ARE
          </div>
          <div style={{ fontSize: '12px', color: '#5A5570', marginBottom: '12px' }}>
            Si tu travailles ce mois, combien de jours sont indemnisés ?
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#5A5570', marginBottom: '4px' }}>Heures travaillées ce mois</div>
            <input
              type="number"
              value={heuresTouche}
              onChange={e => setHeuresTouche(e.target.value)}
              placeholder="ex: 48"
              style={{ width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid #1E1E2E', color: '#E8E0F0', borderRadius: '8px', padding: '10px', fontFamily: 'inherit', fontSize: '14px', fontWeight: 700, outline: 'none', boxSizing: 'border-box', marginBottom: '12px' }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div style={{ background: '#12121A', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#5A5570', marginBottom: '4px' }}>Jours déduits</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#E8453C' }}>{joursDeduitsParMois.toFixed(1)}</div>
              <div style={{ fontSize: '10px', color: '#5A5570' }}>non indemnisés</div>
            </div>
            <div style={{ background: '#12121A', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#5A5570', marginBottom: '4px' }}>ARE ce mois</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#5DC9A0' }}>€{revenuCumul.toFixed(0)}</div>
              <div style={{ fontSize: '10px', color: '#5A5570' }}>{joursIndemnisesParMois.toFixed(1)} jours</div>
            </div>
          </div>
          <div style={{ fontSize: '11px', color: '#5A5570', marginTop: '8px' }}>
            Formule Annexe {annexe} : heures ÷ {annexe === '10' ? '10 × 1,34' : '8 × 1,4'} = jours déduits
          </div>
        </Card>

        {/* Formula detail */}
        <button onClick={() => setShowAdvanced(!showAdvanced)} style={{ width: '100%', background: 'none', border: '1px solid #1F1F2E', color: '#5A5570', borderRadius: '10px', padding: '12px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', marginBottom: '12px' }}>
          {showAdvanced ? '▲' : '▼'} Détail du calcul A + B + C
        </button>

        {showAdvanced && (() => {
          const SA1 = Math.min(salaire, 13700)
          const SA2 = Math.max(salaire - 13700, 0)
          const Ac = annexe === '10' ? { a: 0.36, b: 0.05 } : { a: 0.42, b: 0.06 }
          const A = AJ_MIN * (Ac.a * SA1 + Ac.b * SA2) / 5000
          const H1 = Math.min(heures, 690)
          const H2 = Math.max(heures - 690, 0)
          const Bc = annexe === '10' ? { a: 0.26, b: 0.08 } : { a: 0.40, b: 0.10 }
          const B = AJ_MIN * (Bc.a * H1 + Bc.b * H2) / 507
          const C = annexe === '10' ? 21.95 : 14.40
          return (
            <Card style={{ marginBottom: '12px', background: '#0D0D14' }}>
              <div style={{ fontSize: '12px', color: '#5A5570', marginBottom: '8px', fontWeight: 700 }}>Formule France Travail — Annexe {annexe}</div>
              {[
                { label: 'A (salaire)', val: A, formula: `31,36 × (${Ac.a} × €${SA1.toFixed(0)}${SA2 > 0 ? ` + ${Ac.b} × €${SA2.toFixed(0)}` : ''}) ÷ 5000` },
                { label: 'B (heures)', val: B, formula: `31,36 × (${Bc.a} × ${H1}h${H2 > 0 ? ` + ${Bc.b} × ${H2}h` : ''}) ÷ 507` },
                { label: 'C (fixe)', val: C, formula: 'montant fixe' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid #1F1F2E' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700 }}>{row.label}</div>
                    <div style={{ fontSize: '10px', color: '#5A5570' }}>{row.formula}</div>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#C9A84C' }}>€{row.val.toFixed(2)}</div>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px' }}>
                <div style={{ fontWeight: 800 }}>Total brut</div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#5DC9A0' }}>€{aj.toFixed(2)}</div>
              </div>
              <div style={{ fontSize: '11px', color: '#5A5570', marginTop: '8px' }}>
                Plancher: €{annexe === '10' ? '44' : '38'}/j · Plafond: €{PLAFOND}/j
              </div>
            </Card>
          )
        })()}

        {/* Disclaimer */}
        <div style={{ fontSize: '11px', color: '#3A3550', textAlign: 'center', lineHeight: 1.6 }}>
          Estimation basée sur la formule officielle France Travail (Annexes 8 et 10, convention 2017).
          Le montant réel dépend de ton dossier complet. Consulte ton conseiller France Travail pour confirmation.
        </div>
      </div>
    </div>
  )
}
