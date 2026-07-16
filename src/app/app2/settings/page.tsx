'use client'
import { useStore } from '@/lib/store'
import { Button, Card, showToast } from '@/components/ui'
import { useState, useEffect } from 'react'

export default function SettingsPage() {
  const { userEmail, clearAll } = useStore()
  const [plan, setPlan] = useState('solo')
  const [planExpires, setPlanExpires] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminUsers, setAdminUsers] = useState<any[]>([])
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPlan, setAdminPlan] = useState('pro')
  const [adminMonths, setAdminMonths] = useState('0')
  const [adminNote, setAdminNote] = useState('')
  const [sendInvite, setSendInvite] = useState(true)

  useEffect(() => {
    const token = typeof window !== 'undefined' ? (localStorage.getItem('td_token') || '') : ''
    if (!token) return

    // Fetch plan
    fetch('/api/plan', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => {
        setPlan(d.plan || 'solo')
        setPlanExpires(d.expires_at || null)
      }).catch(() => {})

    // Check if admin
    if (userEmail === 'sannie.patron@gmail.com') {
      setIsAdmin(true)
      fetch('/api/admin', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(d => setAdminUsers(d.users || [])).catch(() => {})
    }
  }, [userEmail])

  const handleSignOut = () => {
    if (!confirm('Sign out?')) return
    try {
      const keys = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && (k.includes('auth') || k.includes('supabase') || k === 'td_token' || k === 'td_email')) keys.push(k)
      }
      keys.forEach(k => localStorage.removeItem(k))
      sessionStorage.clear()
    } catch {}
    window.location.href = '/auth/login'
  }

  const handleClearData = () => {
    if (!confirm('Delete ALL your data? This cannot be undone.')) return
    clearAll()
    try { localStorage.removeItem('tourdesk_data_v1') } catch {}
    showToast('All data deleted')
  }

  const handleAdminAdd = async () => {
    if (!adminEmail) { showToast('Enter an email', false); return }
    const token = localStorage.getItem('td_token') || ''
    const months = parseInt(adminMonths) || 0
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email: adminEmail, plan: adminPlan, months, note: adminNote })
    })
    const d = await res.json()
    if (d.success) {
      showToast(adminEmail + ' added ✓')
      if (sendInvite) {
        await fetch('/api/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ email: adminEmail, plan: adminPlan, months, note: adminNote })
        })
        showToast('Invite email sent ✓')
      }
      setAdminEmail(''); setAdminNote('')
      const updated = await fetch('/api/admin', { headers: { Authorization: `Bearer ${token}` } })
      const ud = await updated.json()
      setAdminUsers(ud.users || [])
    } else {
      showToast('Error: ' + (d.error || '?'), false)
    }
  }

  const handleAdminRemove = async (email: string) => {
    if (!confirm(`Remove access for ${email}?`)) return
    const token = localStorage.getItem('td_token') || ''
    await fetch('/api/admin', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email })
    })
    showToast('Removed ✓')
    setAdminUsers(prev => prev.filter(u => u.email !== email))
  }

  const planLabel = { solo: 'Solo', pro: 'Pro', manager: 'Manager' }[plan] || 'Solo'
  const planColor = { solo: '#5A5570', pro: '#C9A84C', manager: '#5DC9A0' }[plan] || '#5A5570'

  return (
    <div style={{ padding: '0 0 100px' }}>
      <div style={{ padding: '16px 16px 0', marginBottom: '16px' }}>
        <div style={{ fontWeight: 900, fontSize: '20px', letterSpacing: '-0.03em' }}>Settings</div>
      </div>
      <div style={{ padding: '0 16px' }}>

        {/* Account */}
        <Card style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{ width: '48px', height: '48px', background: '#C9A84C', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#0A0A0F', fontSize: '18px' }}>
              {userEmail?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px' }}>{userEmail || 'Your account'}</div>
              <div style={{ fontSize: '12px', color: planColor, fontWeight: 700 }}>{planLabel} plan{planExpires ? ` · expires ${planExpires.slice(0, 10)}` : ''}</div>
            </div>
          </div>
          {plan === 'solo' && (
            <div style={{ background: 'rgba(201,168,76,.08)', border: '1px solid rgba(201,168,76,.2)', borderRadius: '10px', padding: '14px', marginBottom: '12px' }}>
              <div style={{ fontWeight: 800, color: '#C9A84C', marginBottom: '4px' }}>⭐ Upgrade to Pro</div>
              <div style={{ fontSize: '12px', color: '#5A5570', marginBottom: '12px', lineHeight: 1.6 }}>Unlock Travel, Expenses, Guest list, Contacts and more.</div>
              <button onClick={() => window.open('mailto:sannie.patron@gmail.com?subject=TourDesk Pro upgrade', '_blank')} style={{ width: '100%', background: '#C9A84C', border: 'none', color: '#0A0A0F', borderRadius: '8px', padding: '10px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 900, fontSize: '13px' }}>
                Contact us to upgrade →
              </button>
            </div>
          )}
          <Button onClick={handleSignOut} variant="secondary" style={{ width: '100%' }}>Sign out</Button>
        </Card>

        {/* About */}
        <Card style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#5A5570', marginBottom: '12px' }}>💬 Support</div>
          <button onClick={() => window.open('mailto:sannie.patron@gmail.com?subject=TourDesk feedback', '_blank')} style={{ width: '100%', background: 'none', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '8px', padding: '10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', marginBottom: '8px' }}>💬 Contact us</button>
          <button onClick={() => window.open('mailto:sannie.patron@gmail.com?subject=TourDesk bug report', '_blank')} style={{ width: '100%', background: 'none', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '8px', padding: '10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}>🐛 Report a bug</button>
        </Card>

        {/* Danger zone */}
        <Card style={{ marginBottom: '12px', borderColor: 'rgba(232,69,60,.2)', background: 'rgba(232,69,60,.03)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#E8453C', marginBottom: '12px' }}>⚠️ Danger zone</div>
          <Button variant="danger" onClick={handleClearData} style={{ width: '100%' }}>Delete all my data</Button>
        </Card>

        {/* Admin panel */}
        {isAdmin && (
          <Card style={{ marginBottom: '12px', borderColor: '#C9A84C' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: '14px' }}>👑 Admin — Free Access</div>

            {/* User list */}
            {adminUsers.length === 0 ? (
              <p style={{ fontSize: '12px', color: '#5A5570', marginBottom: '14px' }}>No free access users yet.</p>
            ) : (
              <div style={{ marginBottom: '14px' }}>
                {adminUsers.map(u => {
                  const exp = u.expires_at ? new Date(u.expires_at).toLocaleDateString('en-GB') : 'Indefinite'
                  const expired = u.expires_at && new Date(u.expires_at) < new Date()
                  return (
                    <div key={u.email} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: '1px solid #1F1F2E' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: expired ? '#E8453C' : '#E8E0F0' }}>{u.email}</div>
                        <div style={{ fontSize: '11px', color: '#5A5570' }}>{u.plan} · {exp}{u.note ? ` · ${u.note}` : ''}</div>
                      </div>
                      <button onClick={() => handleAdminRemove(u.email)} style={{ background: 'rgba(232,69,60,.1)', border: '1px solid rgba(232,69,60,.3)', color: '#E8453C', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px' }}>✕</button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Add user */}
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#5A5570', marginBottom: '8px' }}>Add free access</div>
            <input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="user@email.com" style={{ width: '100%', background: '#0A0A0F', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '8px', padding: '9px 12px', fontFamily: 'inherit', fontSize: '13px', boxSizing: 'border-box', marginBottom: '8px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <select value={adminPlan} onChange={e => setAdminPlan(e.target.value)} style={{ background: '#0A0A0F', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '8px', padding: '9px', fontFamily: 'inherit', fontSize: '13px' }}>
                <option value="solo">Solo</option>
                <option value="pro">Pro</option>
                <option value="manager">Manager</option>
              </select>
              <select value={adminMonths} onChange={e => setAdminMonths(e.target.value)} style={{ background: '#0A0A0F', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '8px', padding: '9px', fontFamily: 'inherit', fontSize: '13px' }}>
                <option value="0">Indefinite</option>
                <option value="1">1 month</option>
                <option value="3">3 months</option>
                <option value="6">6 months</option>
                <option value="12">12 months</option>
              </select>
            </div>
            <input type="text" value={adminNote} onChange={e => setAdminNote(e.target.value)} placeholder="Note (e.g. Beta tester)" style={{ width: '100%', background: '#0A0A0F', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '8px', padding: '9px 12px', fontFamily: 'inherit', fontSize: '13px', boxSizing: 'border-box', marginBottom: '8px' }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', cursor: 'pointer', fontSize: '13px', color: '#5A5570' }}>
              <input type="checkbox" checked={sendInvite} onChange={e => setSendInvite(e.target.checked)} style={{ accentColor: '#C9A84C' }} />
              Send invitation email
            </label>
            <Button onClick={handleAdminAdd} style={{ width: '100%' }}>Add free access</Button>
          </Card>
        )}

        <div style={{ textAlign: 'center', fontSize: '11px', color: '#5A5570', marginTop: '20px', lineHeight: 1.6 }}>
          TourDesk · Artist Agenda<br />
          Data stored securely in Europe 🇪🇺
        </div>
      </div>
    </div>
  )
}
