'use client'
import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { loadFromCloud } from '@/lib/sync'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { InstallPrompt } from '@/components/InstallPrompt'

const NAV = [
  { section: '📅 Schedule', items: [
    { href: '/app2/artists', label: 'My Artists', sub: 'Manage employers & artists', icon: '🎤' },
    { href: '/app2/tours', label: 'Tours & Events', sub: 'Add your bookings & import planning', icon: '📋' },
    { href: '/app2/calendar', label: 'Calendar', sub: 'Your schedule at a glance', icon: '📅' },
    { href: '/app2/meetings', label: 'Meetings', sub: 'Production calls & syncs', icon: '📞' },
    { href: '/app2/alerts', label: 'Alerts', sub: 'Conflicts & upcoming events', icon: '🔔' },
    { href: '/app2/availability', label: 'Check Availability', sub: 'Upload dates and check conflicts', icon: '⚡' },
    { href: '/app2/mypage', label: 'Share My Calendar', sub: 'Share your availability with others', icon: '📤' },
  ]},
  { section: '💶 Money & Hours', items: [
    { href: '/app2/earnings', label: 'Earnings & Hours', sub: 'Cachets & hour counter', icon: '💶' },
    { href: '/app2/declaration', label: 'Déclaration mensuelle', sub: 'Ready for France Travail', icon: '🇫🇷' },
    { href: '/app2/simulator', label: 'Indemnisation simulator', sub: 'Estimate your payment', icon: '🧮' },
    { href: '/app2/employers', label: 'Dashboard', sub: 'Your year at a glance', icon: '📊' },
  ]},
  { section: '✈ On Tour', items: [
    { href: '/app2/travel', label: 'Travel', sub: 'Tickets & trips', icon: '✈' },
    { href: '/app2/expenses', label: 'Expenses', sub: 'Track your tour expenses', icon: '🧾' },
    { href: '/app2/guests', label: 'Guest List', sub: 'Manage invitations per show', icon: '🎫' },
    { href: '/app2/rider', label: 'Technical Rider', sub: 'Create & send to productions', icon: '🎛' },
  ]},
  { section: '🤝 Network', items: [
    { href: '/app2/contacts', label: 'Industry Contacts', sub: 'Casting directors & managers', icon: '🤝' },
    { href: '/app2/replacements', label: 'Replacements', sub: 'Your go-to performers & crew', icon: '🔄' },
  ]},
  { section: '🎭 Manager', items: [
    { href: '/app2/manager', label: 'Manager Tour Sheet', sub: 'Share tour info with your team', icon: '🎭' },
    { href: '/app2/tours-invited', label: 'My Tours', sub: 'Tours you\'ve been invited to', icon: '🎪' },
  ]},
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [userPlan, setUserPlan] = useState<string>('solo')
  const { isLoaded, setLoaded, applyCloudData, setToken, userEmail } = useStore()
  const router = useRouter()
  const pathname = usePathname()

  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    // Get token from localStorage
    let token = ''
    let email = ''
    try {
      token = localStorage.getItem('td_token') || ''
      email = localStorage.getItem('td_email') || ''
      if (!token) {
        // Check Supabase storage
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i)
          if (k?.startsWith('sb-') && k.includes('auth-token')) {
            try {
              const parsed = JSON.parse(localStorage.getItem(k) || '')
              if (parsed?.access_token) {
                token = parsed.access_token
                email = parsed.user?.email || ''
                localStorage.setItem('td_token', token)
                localStorage.setItem('td_email', email)
                break
              }
            } catch {}
          }
        }
      }
    } catch {}

    if (!token) {
      setAuthChecked(true)
      router.push('/auth/login')
      return
    }

    setToken(token, email)
    // Fetch user plan
    fetch('/api/plan', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setUserPlan(d.plan || 'solo'))
      .catch(() => {})

    // Clear old HTML app data
    try { localStorage.removeItem('tourdesk_data_v1') } catch {}

    // Load from cloud - if token invalid, clear and redirect to login
    setSyncing(true)
    loadFromCloud().then((data) => {
      if (data === 'unauthorized') {
        try {
          const keys: string[] = []
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i)
            if (k) keys.push(k)
          }
          keys.forEach(k => {
            if (k.startsWith('sb-') || k === 'td_token' || k === 'td_email' || k === 'td_refresh_token') {
              localStorage.removeItem(k)
            }
          })
          sessionStorage.clear()
        } catch {}
        window.location.replace('/auth/login')
        return
      }
      if (data) applyCloudData(data as any)
      setLoaded(true)
      setSyncing(false)
      setAuthChecked(true)
    }).catch(() => {
      setLoaded(true)
      setSyncing(false)
      setAuthChecked(true)
    })
  }, [])

  const currentSection = NAV.flatMap(s => s.items).find(i => pathname.startsWith(i.href))

  const [avatarMenu, setAvatarMenu] = useState(false)

  const handleSignOut = () => {
    if (!confirm('Sign out?')) return
    // Clear httpOnly cookie via server
    fetch('/api/auth', { method: 'DELETE' }).catch(() => {})
    try {
      const keys: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k) keys.push(k)
      }
      keys.forEach(k => {
        if (k.includes('auth') || k.includes('supabase') || k.startsWith('sb-') || k === 'td_token' || k === 'td_email' || k === 'td_refresh_token') {
          localStorage.removeItem(k)
        }
      })
      sessionStorage.clear()
    } catch {}
    window.location.replace('/auth/login')
  }

  // Don't render anything until auth is confirmed — prevents white blink
  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0A0F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '44px', height: '44px', background: '#C9A84C', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', margin: '0 auto 16px' }}>♩</div>
          <div style={{ color: '#5A5570', fontSize: '13px' }}>Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <InstallPrompt />
    <div style={{ minHeight: '100vh', background: '#0A0A0F', color: '#E8E0F0', fontFamily: '-apple-system, Inter, system-ui, sans-serif' }}>
      {/* Sync loading bar */}
      {syncing && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: '2px', zIndex: 1000,
          background: 'linear-gradient(90deg, #C9A84C, transparent)',
          animation: 'syncbar 1.5s ease-in-out infinite'
        }} />
      )}

      {/* Header */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: '57px',
        background: '#0A0A0F', borderBottom: '1px solid #1F1F2E',
        display: 'flex', alignItems: 'center', padding: '0 16px',
        gap: '12px', zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }} onClick={() => router.push('/')}>
          <div style={{ width: '32px', height: '32px', background: '#C9A84C', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>♩</div>
          <div>
            <div style={{ fontWeight: 900, fontSize: '14px', letterSpacing: '-0.04em' }}>Tour<span style={{ color: '#C9A84C' }}>Desk</span></div>
            <div style={{ fontSize: '9px', color: '#C9A84C', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700 }}>Artist Agenda</div>
          </div>
        </div>

        <div style={{ flex: 1, textAlign: 'center', fontWeight: 800, fontSize: '14px', letterSpacing: '-0.02em' }}>
          {currentSection?.label || 'TourDesk'}
        </div>

        {/* Avatar with dropdown */}
        {userEmail && (
          <div style={{ position: 'relative' }}>
            <div
              onClick={() => setAvatarMenu(!avatarMenu)}
              style={{
                width: '32px', height: '32px', borderRadius: '50%', background: '#C9A84C',
                color: '#0A0A0F', fontWeight: 900, fontSize: '13px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0, marginRight: '6px'
              }}>
              {userEmail[0].toUpperCase()}
            </div>
            {avatarMenu && (
              <div onClick={() => setAvatarMenu(false)} style={{
                position: 'fixed', inset: 0, zIndex: 150
              }}>
                <div onClick={e => e.stopPropagation()} style={{
                  position: 'absolute', top: '40px', right: '50px',
                  background: '#17171F', border: '1px solid #1F1F2E', borderRadius: '12px',
                  padding: '8px', minWidth: '180px', zIndex: 151, boxShadow: '0 8px 32px rgba(0,0,0,.5)'
                }}>
                  <div style={{ fontSize: '12px', color: '#5A5570', padding: '6px 10px', marginBottom: '4px', borderBottom: '1px solid #1F1F2E' }}>
                    {userEmail}
                  </div>
                  <Link href="/app2/settings" onClick={() => setAvatarMenu(false)} style={{
                    display: 'block', padding: '8px 10px', borderRadius: '8px', fontSize: '13px',
                    fontWeight: 600, color: '#E8E0F0', textDecoration: 'none'
                  }}>⚙️ Settings</Link>
                  <button onClick={() => { setAvatarMenu(false); localStorage.removeItem('td_onboarding_done'); window.location.reload() }} style={{
                    width: '100%', background: 'none', border: 'none', color: '#E8E0F0',
                    padding: '8px 10px', borderRadius: '8px', cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: '13px', fontWeight: 600, textAlign: 'left'
                  }}>❓ How it works</button>
                  <Link href="/about" onClick={() => setAvatarMenu(false)} style={{
                    display: 'block', padding: '8px 10px', borderRadius: '8px', fontSize: '13px',
                    fontWeight: 600, color: '#E8E0F0', textDecoration: 'none'
                  }}>🎭 About us</Link>
                  <button onClick={handleSignOut} style={{
                    width: '100%', background: 'none', border: 'none', color: '#E8453C',
                    padding: '8px 10px', borderRadius: '8px', cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: '13px', fontWeight: 600, textAlign: 'left'
                  }}>Sign out</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hamburger */}
        <button onClick={() => setMenuOpen(!menuOpen)} style={{
          background: '#12121A', border: '1px solid #1F1F2E', borderRadius: '10px',
          cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '4px',
          alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', flexShrink: 0
        }}>
          {[0,1,2].map(i => <span key={i} style={{ width: '18px', height: '2px', background: '#E8E0F0', borderRadius: '2px', display: 'block' }} />)}
        </button>
      </header>

      {/* Menu overlay */}
      {menuOpen && (
        <div style={{
          position: 'fixed', top: '57px', left: 0, right: 0, bottom: 0,
          zIndex: 40, background: 'rgba(5,5,10,.65)', backdropFilter: 'blur(4px)'
        }} onClick={() => setMenuOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#17171F', borderBottom: '1px solid #1F1F2E',
            padding: '6px 16px 80px', maxWidth: '900px', margin: '0 auto',
            maxHeight: 'calc(100vh - 57px)', overflowY: 'scroll',
            WebkitOverflowScrolling: 'touch' as any
          }}>
            {NAV.filter(section => {
              if (section.section === '🎭 Manager' && userPlan !== 'manager') return false
              return true
            }).map(section => (
              <div key={section.section}>
                <div style={{ padding: '8px 10px 4px', fontSize: '9px', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#5A5570' }}>
                  {section.section}
                </div>
                {section.items.map(item => (
                  <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 12px', borderRadius: '10px', textDecoration: 'none',
                    background: pathname.startsWith(item.href) ? 'rgba(201,168,76,.1)' : 'transparent'
                  }}>
                    <div style={{ width: '36px', height: '36px', background: '#12121A', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                      {item.icon}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#E8E0F0' }}>{item.label}</div>
                      <div style={{ fontSize: '11px', color: '#5A5570' }}>{item.sub}</div>
                    </div>
                  </Link>
                ))}
              </div>
            ))}

            <div style={{ borderTop: '1px solid #1F1F2E', margin: '8px 0' }} />
            <Link href="/app2/settings" onClick={() => setMenuOpen(false)} style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '10px', textDecoration: 'none'
            }}>
              <div style={{ width: '36px', height: '36px', background: '#12121A', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>⚙️</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#E8E0F0' }}>Settings</div>
                <div style={{ fontSize: '11px', color: '#5A5570' }}>{userEmail || 'Your account'}</div>
              </div>
            </Link>
            <div style={{ height: '60px' }} />
          </div>
        </div>
      )}

      {/* Main content */}
      <main style={{ paddingTop: '57px', minHeight: '100vh' }}>
        {children}
      </main>

      <style>{`
        @keyframes syncbar { 0% { transform: translateX(-100%) } 100% { transform: translateX(100%) } }
        a { color: inherit; }
      `}</style>
    </div>
    </>
  )
}
