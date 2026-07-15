'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)

  useEffect(() => {
    if (window.location.hash === '#signup') setIsSignUp(true)
  }, [])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    const supabase = createClient()

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })
      if (error) setError(error.message)
      else setMessage('Check your email to confirm your account!')
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else if (data.session) {
        try {
          localStorage.setItem('td_token', data.session.access_token)
          localStorage.setItem('td_email', email)
        } catch(e) {}
        window.location.href = '/app-shell'
      } else {
        // No session returned - email may not be confirmed
        setError('Could not sign in. Please confirm your email first.')
      }
    }
    setLoading(false)
  }

  async function handleGoogleLogin() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
  }

  async function handleMagicLink() {
    if (!email) { setError('Enter your email first'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
    })
    if (error) setError(error.message)
    else setMessage('Magic link sent! Check your email.')
    setLoading(false)
  }

  const s = {
    page: { minHeight:'100vh', background:'#0A0A0F', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', fontFamily:'-apple-system, Inter, system-ui, sans-serif' } as React.CSSProperties,
    wrap: { width:'100%', maxWidth:'420px' } as React.CSSProperties,
    logoWrap: { textAlign:'center' as const, marginBottom:'32px' },
    logoIcon: { width:'52px', height:'52px', background:'#C9A84C', borderRadius:'14px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px', margin:'0 auto 12px' } as React.CSSProperties,
    logoName: { fontSize:'24px', fontWeight:900, color:'#E8E0F0', letterSpacing:'-0.04em' } as React.CSSProperties,
    logosub: { fontSize:'12px', color:'#5A5570', marginTop:'4px' } as React.CSSProperties,
    card: { background:'#17171F', border:'1px solid #1F1F2E', borderRadius:'20px', padding:'32px 28px' } as React.CSSProperties,
    title: { fontSize:'18px', fontWeight:800, color:'#E8E0F0', marginBottom:'24px' } as React.CSSProperties,
    googleBtn: { width:'100%', background:'#12121A', border:'1px solid #1F1F2E', color:'#E8E0F0', borderRadius:'10px', padding:'12px', cursor:'pointer', fontFamily:'inherit', fontSize:'14px', fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', marginBottom:'20px' } as React.CSSProperties,
    divider: { display:'flex', alignItems:'center', gap:'12px', marginBottom:'20px' } as React.CSSProperties,
    dividerLine: { flex:1, height:'1px', background:'#1F1F2E' } as React.CSSProperties,
    dividerText: { fontSize:'12px', color:'#5A5570' } as React.CSSProperties,
    input: { width:'100%', background:'#12121A', border:'1px solid #1F1F2E', color:'#E8E0F0', borderRadius:'10px', padding:'12px 14px', fontFamily:'inherit', fontSize:'14px', outline:'none', boxSizing:'border-box' as const, marginBottom:'12px' },
    error: { background:'rgba(232,69,60,.1)', border:'1px solid rgba(232,69,60,.3)', color:'#E8453C', borderRadius:'8px', padding:'10px 12px', fontSize:'13px', marginBottom:'12px' } as React.CSSProperties,
    success: { background:'rgba(93,201,160,.1)', border:'1px solid rgba(93,201,160,.3)', color:'#5DC9A0', borderRadius:'8px', padding:'10px 12px', fontSize:'13px', marginBottom:'12px' } as React.CSSProperties,
    primaryBtn: { width:'100%', background:'#C9A84C', border:'none', color:'#0A0A0F', borderRadius:'10px', padding:'13px', cursor:'pointer', fontFamily:'inherit', fontSize:'14px', fontWeight:900, marginBottom:'10px' } as React.CSSProperties,
    secondaryBtn: { width:'100%', background:'none', border:'1px solid #1F1F2E', color:'#5A5570', borderRadius:'10px', padding:'11px', cursor:'pointer', fontFamily:'inherit', fontSize:'13px', marginBottom:'20px' } as React.CSSProperties,
    switchWrap: { textAlign:'center' as const, fontSize:'13px', color:'#5A5570' },
    switchBtn: { background:'none', border:'none', color:'#C9A84C', cursor:'pointer', fontFamily:'inherit', fontSize:'13px', fontWeight:700, textDecoration:'underline' } as React.CSSProperties,
    footer: { textAlign:'center' as const, marginTop:'20px', fontSize:'11px', color:'#5A5570' },
  }

  return (
    <div style={s.page}>
      <div style={s.wrap}>
        <div style={s.logoWrap}>
          <div style={s.logoIcon}>♩</div>
          <div style={s.logoName}>Tour<span style={{color:'#C9A84C'}}>Desk</span></div>
          <div style={s.logosub}>ARTIST AGENDA</div>
        </div>
        <div style={s.card}>
          <div style={s.title}>{isSignUp ? 'Create your account' : 'Welcome back'}</div>
          <button onClick={handleGoogleLogin} style={s.googleBtn}>
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.17z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/>
              <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z"/>
              <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.3z"/>
            </svg>
            Continue with Google
          </button>
          <div style={s.divider}>
            <div style={s.dividerLine}/>
            <span style={s.dividerText}>or</span>
            <div style={s.dividerLine}/>
          </div>
          <form onSubmit={handleEmailAuth}>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" required style={s.input}/>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password (min 8 characters)" required minLength={8} style={{...s.input, marginBottom:'16px'}}/>
            {error && <div style={s.error}>{error}</div>}
            {message && <div style={s.success}>{message}</div>}
            <button type="submit" disabled={loading} style={s.primaryBtn}>
              {loading ? '...' : isSignUp ? 'Create account' : 'Sign in'}
            </button>
          </form>
          <button onClick={handleMagicLink} disabled={loading} style={s.secondaryBtn}>
            ✉ Send magic link to my email
          </button>
          <div style={s.switchWrap}>
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <button onClick={()=>setIsSignUp(!isSignUp)} style={s.switchBtn}>
              {isSignUp ? 'Sign in' : 'Sign up free'}
            </button>
          </div>
        </div>
        <div style={s.footer}>Your data is encrypted and stored securely in Europe 🇪🇺</div>
      </div>
    </div>
  )
}
