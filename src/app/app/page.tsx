'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function AppPage() {
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        window.location.href = '/auth/login'
      } else {
        window.location.href = '/tourdesk-app.html'
      }
    })
  }, [])

  return (
    <div style={{
      minHeight:'100vh', background:'#0A0A0F', display:'flex',
      alignItems:'center', justifyContent:'center',
      fontFamily:'-apple-system, Inter, system-ui, sans-serif'
    }}>
      <div style={{textAlign:'center'}}>
        <div style={{
          width:'40px', height:'40px', background:'#C9A84C', borderRadius:'10px',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:'20px', margin:'0 auto 16px'
        }}>♩</div>
        <div style={{color:'#5A5570', fontSize:'13px'}}>Loading...</div>
      </div>
    </div>
  )
}
