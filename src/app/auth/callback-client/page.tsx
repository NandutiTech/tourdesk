'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function CallbackPage() {
  useEffect(() => {
    const supabase = createClient()
    
    // Handle the OAuth callback on the client side
    supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        try {
          localStorage.setItem('td_token', session.access_token)
          localStorage.setItem('td_email', session.user?.email || '')
        } catch(e) {}
        window.location.href = '/app-shell'
      }
    })

    // Also try to get session directly
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        try {
          localStorage.setItem('td_token', session.access_token)
          localStorage.setItem('td_email', session.user?.email || '')
        } catch(e) {}
        window.location.href = '/app-shell'
      } else {
        // Try exchanging code from URL
        const code = new URLSearchParams(window.location.search).get('code')
        if (code) {
          supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
            if (!error && data.session) {
              try {
                localStorage.setItem('td_token', data.session.access_token)
                localStorage.setItem('td_email', data.user?.email || '')
              } catch(e) {}
              window.location.href = '/app-shell'
            } else {
              window.location.href = '/auth/login'
            }
          })
        } else {
          setTimeout(() => window.location.href = '/auth/login', 3000)
        }
      }
    })
  }, [])

  return (
    <div style={{
      minHeight:'100vh', background:'#0A0A0F', display:'flex',
      alignItems:'center', justifyContent:'center',
      fontFamily:'-apple-system, Inter, system-ui, sans-serif', color:'#E8E0F0'
    }}>
      <div style={{textAlign:'center'}}>
        <div style={{
          width:'40px', height:'40px', background:'#C9A84C', borderRadius:'10px',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:'20px', margin:'0 auto 16px'
        }}>♩</div>
        <div style={{color:'#5A5570', fontSize:'13px'}}>Signing you in...</div>
      </div>
    </div>
  )
}
