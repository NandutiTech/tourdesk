'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function AppPage() {
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        window.location.href = '/auth/login'
      } else {
        setChecking(false)
      }
    })
  }, [])

  if (checking) return (
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
        <div style={{color:'#5A5570', fontSize:'13px'}}>Loading TourDesk...</div>
      </div>
    </div>
  )

  // Redirect to the static HTML app for now
  // In the next phase we'll fully integrate
  return (
    <div style={{minHeight:'100vh', background:'#0A0A0F', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'-apple-system, Inter, system-ui, sans-serif', color:'#E8E0F0', flexDirection:'column', gap:'16px'}}>
      <div style={{width:'52px', height:'52px', background:'#C9A84C', borderRadius:'14px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px'}}>♩</div>
      <div style={{fontSize:'24px', fontWeight:900, letterSpacing:'-0.04em'}}>Tour<span style={{color:'#C9A84C'}}>Desk</span></div>
      <div style={{color:'#5A5570', fontSize:'13px', textAlign:'center', maxWidth:'300px', lineHeight:'1.6'}}>
        ✅ Login working!<br/>App integration coming next.
      </div>
      <div style={{background:'#17171F', border:'1px solid #1F1F2E', borderRadius:'12px', padding:'16px 20px', marginTop:'8px'}}>
        <div style={{fontSize:'12px', color:'#5A5570', marginBottom:'8px'}}>Logged in as:</div>
        <UserEmail />
      </div>
      <button
        onClick={async () => {
          const supabase = createClient()
          await supabase.auth.signOut()
          window.location.href = '/auth/login'
        }}
        style={{background:'none', border:'1px solid #1F1F2E', color:'#5A5570', borderRadius:'8px', padding:'8px 16px', cursor:'pointer', fontFamily:'inherit', fontSize:'12px', marginTop:'8px'}}
      >
        Sign out
      </button>
    </div>
  )
}

function UserEmail() {
  const [email, setEmail] = useState('')
  useEffect(() => {
    createClient().auth.getUser().then(({data:{user}}) => {
      if(user) setEmail(user.email || user.id)
    })
  }, [])
  return <div style={{fontSize:'13px', fontWeight:700, color:'#E8E0F0'}}>{email}</div>
}
