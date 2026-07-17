'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function CallbackPage() {
  useEffect(() => {
    // Parse token from URL hash (implicit flow)
    const hash = window.location.hash.slice(1)
    const params = new URLSearchParams(hash)
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')

    if (accessToken) {
      // Save token directly from hash
      try {
        localStorage.setItem('td_token', accessToken)
        const refreshToken = params.get('refresh_token')
        if (refreshToken) localStorage.setItem('td_refresh_token', refreshToken)
        // Also set httpOnly cookie
        const emailVal = localStorage.getItem('td_email') || ''
        fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: accessToken, email: emailVal, refreshToken: refreshToken || '' })
        }).catch(() => {})
      } catch(e) {}
      
      // Also set session in Supabase client
      const supabase = createClient()
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || ''
      }).then(({ data }) => {
        if (data.user) {
          try {
            localStorage.setItem('td_email', data.user.email || '')
          } catch(e) {}
        }
        window.location.href = '/app-shell'
      }).catch(() => {
        // Even if setSession fails, we have the token
        window.location.href = '/app-shell'
      })
      return
    }

    // No hash token - try code exchange
    const searchParams = new URLSearchParams(window.location.search)
    const code = searchParams.get('code')
    if (code) {
      const supabase = createClient()
      supabase.auth.exchangeCodeForSession(code).then(({ data }) => {
        if (data.session) {
          try {
            localStorage.setItem('td_token', data.session.access_token)
            localStorage.setItem('td_refresh_token', data.session.refresh_token || '')
            localStorage.setItem('td_email', data.user?.email || '')
          } catch(e) {}
          window.location.href = '/app-shell'
        } else {
          window.location.href = '/auth/login'
        }
      })
      return
    }

    // Nothing - go to login
    setTimeout(() => window.location.href = '/auth/login', 2000)
  }, [])

  return (
    <div style={{
      minHeight:'100vh', background:'#0A0A0F', display:'flex',
      alignItems:'center', justifyContent:'center',
      fontFamily:'-apple-system, Inter, system-ui, sans-serif', color:'#E8E0F0'
    }}>
      <div style={{textAlign:'center'}}>
        <div style={{width:'40px',height:'40px',background:'#C9A84C',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',margin:'0 auto 16px'}}>♩</div>
        <div style={{color:'#5A5570',fontSize:'13px'}}>Signing you in...</div>
      </div>
    </div>
  )
}
