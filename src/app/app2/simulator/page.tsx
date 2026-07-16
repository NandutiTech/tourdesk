'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { Card, Input, Toolbar } from '@/components/ui'

export default function SimulatorPage() {
  const { tours, hoursPerEventType } = useStore()
  const [salary, setSalary] = useState('100')
  const [days, setDays] = useState('30')
  const [hours, setHours] = useState('507')

  // Calculate from actual data
  const now = new Date()
  const yearStr = String(now.getFullYear())
  let actualHours = 0
  let totalDays = 0
  for (const t of tours.filter(t => t.start.startsWith(yearStr))) {
    const h = (hoursPerEventType as any)[t.type] || 1
    actualHours += t.customHours || h
    totalDays++
  }

  const salaryNum = parseFloat(salary) || 100
  const daysNum = parseInt(days) || 30
  const hoursNum = parseInt(hours) || 507

  // France Travail estimation (simplified)
  const dailyAllowance = Math.max(salaryNum * 0.57, 31.36) // rough estimate
  const monthlyIndemnisation = dailyAllowance * 21.67 // avg working days/month
  const pct = Math.min((actualHours / hoursNum) * 100, 100)

  return (
    <div style={{ padding: '0 0 100px' }}>
      <Toolbar title="Indemnisation Simulator" />
      <div style={{ padding: '0 16px' }}>
        <Card style={{ marginBottom: '16px', background: 'rgba(201,168,76,.05)', borderColor: 'rgba(201,168,76,.2)' }}>
          <div style={{ fontSize: '12px', color: '#5A5570', lineHeight: 1.8 }}>
            ⚠️ This is an <strong style={{ color: '#C9A84C' }}>estimate only</strong>. The actual calculation by France Travail depends on your specific salary history and dates. Always check with your conseiller Pôle Emploi.
          </div>
        </Card>

        {/* Your year so far */}
        <Card style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '12px' }}>Your {yearStr} so far</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ fontSize: '13px' }}>Hours worked</div>
            <div style={{ fontWeight: 800, color: '#5DC9A0' }}>{actualHours}h</div>
          </div>
          <div style={{ background: '#12121A', borderRadius: '6px', height: '8px', overflow: 'hidden', marginBottom: '4px' }}>
            <div style={{ height: '100%', background: pct >= 100 ? '#5DC9A0' : '#C9A84C', width: `${pct}%` }} />
          </div>
          <div style={{ fontSize: '12px', color: '#5A5570' }}>{pct.toFixed(0)}% of 507h threshold · {Math.max(507 - actualHours, 0)}h remaining</div>
        </Card>

        {/* Manual inputs */}
        <Card style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '12px' }}>Simulate your indemnisation</div>
          <Input label="Average daily salary (€)" type="number" value={salary} onChange={e => setSalary(e.target.value)} />
          <Input label="Reference period (days)" type="number" value={days} onChange={e => setDays(e.target.value)} />
          <Input label="Hours threshold" type="number" value={hours} onChange={e => setHours(e.target.value)} />
        </Card>

        <Card style={{ background: 'rgba(93,201,160,.05)', borderColor: 'rgba(93,201,160,.2)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#5A5570', marginBottom: '4px' }}>Estimated daily allowance</div>
            <div style={{ fontSize: '32px', fontWeight: 900, color: '#5DC9A0', marginBottom: '4px' }}>€{dailyAllowance.toFixed(2)}</div>
            <div style={{ fontSize: '12px', color: '#5A5570', marginBottom: '16px' }}>/day</div>
            <div style={{ fontSize: '12px', color: '#5A5570', marginBottom: '4px' }}>Estimated monthly (~21.67 days)</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#C9A84C' }}>€{monthlyIndemnisation.toFixed(0)}</div>
          </div>
        </Card>
      </div>
    </div>
  )
}
