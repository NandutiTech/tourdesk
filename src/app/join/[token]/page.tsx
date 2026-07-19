'use client'
import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function JoinPage() {
  const { token } = useParams()
  const router = useRouter()

  useEffect(() => {
    // Store token and redirect to login
    if (token) {
      localStorage.setItem('tourdesk_invite_token', token as string)
      router.push('/auth/login?invite=1')
    }
  }, [token])

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ textAlign: 'center', color: '#E8E0F0' }}>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>🎭</div>
        <div style={{ fontWeight: 800, fontSize: '18px', marginBottom: '8px' }}>You've been invited to a tour</div>
        <div style={{ fontSize: '14px', color: '#5A5570' }}>Redirecting to sign in...</div>
      </div>
    </div>
  )
}
