'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useStore, getToken } from '@/lib/store'

export default function JoinPage() {
  const { token } = useParams()
  const router = useRouter()
  const { userEmail } = useStore()
  const [invite, setInvite] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/invite-member?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setInvite(d)
        setLoading(false)
      })
  }, [token])

  const acceptInvite = async () => {
    setJoining(true)
    const authToken = getToken()
    if (!authToken) {
      // Not logged in — redirect to login with return URL
      localStorage.setItem('pendingInvite', token as string)
      router.push(`/auth/login?redirect=/join/${token}`)
      return
    }
    const res = await fetch('/api/invite-member', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify({ token })
    })
    const data = await res.json()
    if (data.ok) {
      setDone(true)
      setTimeout(() => router.push('/app2/tours'), 2000)
    } else {
      setError(data.error || 'Something went wrong')
    }
    setJoining(false)
  }

  // Check for pending invite after login
  useEffect(() => {
    if (userEmail && !done) {
      const pending = localStorage.getItem('pendingInvite')
      if (pending === token) {
        localStorage.removeItem('pendingInvite')
        acceptInvite()
      }
    }
  }, [userEmail])

  const style = { minHeight: '100vh', background: '#0A0A0F', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'system-ui', color: '#E8E0F0' }

  if (loading) return <div style={style}><div style={{ color: '#5A5570' }}>Loading...</div></div>

  if (error) return (
    <div style={style}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>😕</div>
      <div style={{ fontWeight: 800, fontSize: '18px', marginBottom: '8px' }}>Invalid invite</div>
      <div style={{ fontSize: '13px', color: '#5A5570' }}>{error}</div>
    </div>
  )

  if (done) return (
    <div style={style}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
      <div style={{ fontWeight: 800, fontSize: '20px', color: '#5DC9A0', marginBottom: '8px' }}>You're in!</div>
      <div style={{ fontSize: '13px', color: '#5A5570' }}>Redirecting to your tour...</div>
    </div>
  )

  return (
    <div style={style}>
      <img src="/images/tourdesk-logo.png" alt="TourDesk" style={{ height: '32px', marginBottom: '32px', opacity: 0.8 }} />
      <div style={{ background: '#13131C', border: '1px solid #1F1F2E', borderRadius: '20px', padding: '32px 24px', maxWidth: '380px', width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>🎪</div>
        <h1 style={{ fontWeight: 900, fontSize: '22px', margin: '0 0 8px', color: '#C9A84C' }}>{invite?.tour?.name}</h1>
        <p style={{ fontSize: '14px', color: '#5A5570', margin: '0 0 8px' }}>
          You've been added as
        </p>
        <p style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 24px' }}>
          {invite?.member?.name}{invite?.member?.role ? ` · ${invite?.member?.role}` : ''}
        </p>
        <p style={{ fontSize: '13px', color: '#5A5570', margin: '0 0 28px', lineHeight: 1.6 }}>
          Join TourDesk to see your travel tickets, hotel info, planning and chat with the team.
        </p>

        {userEmail ? (
          <>
            <div style={{ fontSize: '12px', color: '#5A5570', marginBottom: '12px' }}>Logged in as {userEmail}</div>
            <button onClick={acceptInvite} disabled={joining}
              style={{ width: '100%', background: '#C9A84C', border: 'none', color: '#0A0A0F', borderRadius: '12px', padding: '14px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: '15px' }}>
              {joining ? 'Joining...' : 'Join the tour →'}
            </button>
          </>
        ) : (
          <>
            <button onClick={acceptInvite}
              style={{ width: '100%', background: '#C9A84C', border: 'none', color: '#0A0A0F', borderRadius: '12px', padding: '14px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: '15px', marginBottom: '10px' }}>
              Create account & join →
            </button>
            <div style={{ fontSize: '12px', color: '#5A5570' }}>
              Already have an account? <a href={`/auth/login?redirect=/join/${token}`} style={{ color: '#C9A84C' }}>Sign in</a>
            </div>
          </>
        )}
      </div>
      <div style={{ marginTop: '24px', fontSize: '11px', color: '#3A3550' }}>
        Powered by <a href="https://tourdesktop.com" style={{ color: '#C9A84C', textDecoration: 'none' }}>TourDesk</a>
      </div>
    </div>
  )
}
