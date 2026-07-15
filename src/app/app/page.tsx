'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function AppPage() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        window.location.href = '/auth/login'
        return
      }
      setUser(user)
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div style={{
      minHeight: '100vh', background: '#0A0A0F', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: '-apple-system, Inter, system-ui, sans-serif', color: '#E8E0F0'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '40px', height: '40px', background: '#C9A84C', borderRadius: '10px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px', margin: '0 auto 16px'
        }}>♩</div>
        <div style={{ color: '#5A5570', fontSize: '13px' }}>Loading TourDesk...</div>
      </div>
    </div>
  )

  // The main app is served as an iframe from /app-shell
  // which contains the full HTML app with Supabase integration
  return (
    <iframe
      src="/app-shell"
      style={{ width: '100%', height: '100vh', border: 'none' }}
      title="TourDesk App"
    />
  )
}
