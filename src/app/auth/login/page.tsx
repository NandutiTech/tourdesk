'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'


async function setAuthCookie(token: string, email: string, refreshToken?: string) {
  // Set httpOnly cookie via server
  await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, email, refreshToken })
  })
  // Keep localStorage as fallback for compatibility
  try {
    localStorage.setItem('td_token', token)
    localStorage.setItem('td_email', email)
    if (refreshToken) localStorage.setItem('td_refresh_token', refreshToken)
  } catch {}
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string, error: boolean } | null>(null)

  useEffect(() => {
    // If already logged in, redirect
    const token = localStorage.getItem('td_token')
    if (token) window.location.replace('/app2/tours')
  }, [])

  const showMsg = (text: string, error = false) => setMessage({ text, error })

  const handleSubmit = async () => {
    if (!email || !password) { showMsg('Enter email and password', true); return }
    if (loading) return
    setLoading(true)
    setMessage(null)
    const supabase = createClient()

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + '/auth/callback-client' } })
      setLoading(false)
      if (error) showMsg(error.message, true)
      else {
        // Send welcome email
        fetch('/api/welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        }).catch(() => {})
        showMsg('Check your email to confirm your account!')
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      setLoading(false)
      if (error) { showMsg(error.message, true); return }
      if (data.session) {
        await setAuthCookie(data.session.access_token, email, data.session.refresh_token)
        window.location.replace('/app2/tours')
      }
    }
  }

  const handleGoogle = async () => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      const redirectTo = encodeURIComponent(window.location.origin + '/auth/callback-client')
      window.location.href = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${redirectTo}&access_type=offline&prompt=consent`
    } catch(e) {
      showMsg('Google login failed. Try email instead.', true)
    }
  }

  const handleMagicLink = async () => {
    if (!email) { showMsg('Enter your email first', true); return }
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + '/auth/callback-client' } })
    if (error) showMsg(error.message, true)
    else showMsg('Magic link sent! Check your email.')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, Inter, system-ui, sans-serif', color: '#E8E0F0', padding: '20px', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '64px', height: '64px', background: '#C9A84C', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', margin: '0 auto 16px' }}>♩</div>
          <div style={{ fontWeight: 900, fontSize: '28px', letterSpacing: '-0.04em' }}>TourDesk</div>
          <div style={{ fontSize: '14px', color: '#5A5570', marginTop: '4px' }}>Artist Agenda</div>
        </div>

        {/* Toggle sign in / sign up */}
        <div style={{ display: 'flex', background: '#12121A', borderRadius: '10px', padding: '3px', marginBottom: '20px' }}>
          <button onClick={() => setIsSignUp(false)} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', fontWeight: 700, background: !isSignUp ? '#C9A84C' : 'transparent', color: !isSignUp ? '#0A0A0F' : '#5A5570' }}>Sign in</button>
          <button onClick={() => setIsSignUp(true)} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', fontWeight: 700, background: isSignUp ? '#C9A84C' : 'transparent', color: isSignUp ? '#0A0A0F' : '#5A5570' }}>Sign up</button>
        </div>

        {/* Email */}
        <input
          type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="Email" autoComplete="email"
          style={{ width: '100%', background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '10px', padding: '14px 16px', fontFamily: 'inherit', fontSize: '16px', outline: 'none', boxSizing: 'border-box', marginBottom: '10px' }}
        />

        {/* Password */}
        <input
          type="password" value={password} onChange={e => setPassword(e.target.value)}
          placeholder="Password" autoComplete={isSignUp ? 'new-password' : 'current-password'}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          style={{ width: '100%', background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '10px', padding: '14px 16px', fontFamily: 'inherit', fontSize: '16px', outline: 'none', boxSizing: 'border-box', marginBottom: '14px' }}
        />

        {/* Message */}
        {message && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', background: message.error ? 'rgba(232,69,60,.1)' : 'rgba(93,201,160,.1)', color: message.error ? '#E8453C' : '#5DC9A0', border: `1px solid ${message.error ? 'rgba(232,69,60,.2)' : 'rgba(93,201,160,.2)'}` }}>
            {message.text}
          </div>
        )}

        {/* Submit */}
        <button onClick={handleSubmit} disabled={loading} style={{ width: '100%', background: '#C9A84C', border: 'none', color: '#0A0A0F', borderRadius: '10px', padding: '14px', fontFamily: 'inherit', fontSize: '16px', fontWeight: 900, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1, marginBottom: '10px' }}>
          {loading ? '...' : isSignUp ? 'Create account' : 'Sign in'}
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '16px 0' }}>
          <div style={{ flex: 1, height: '1px', background: '#1F1F2E' }} />
          <span style={{ fontSize: '12px', color: '#5A5570' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: '#1F1F2E' }} />
        </div>

        {/* Google */}
        <button onClick={handleGoogle} style={{ width: '100%', background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '10px', padding: '13px', fontFamily: 'inherit', fontSize: '15px', fontWeight: 700, cursor: 'pointer', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          Continue with Google
        </button>

        {/* Magic link */}
        <button onClick={handleMagicLink} style={{ width: '100%', background: 'transparent', border: '1px solid #1F1F2E', color: '#5A5570', borderRadius: '10px', padding: '13px', fontFamily: 'inherit', fontSize: '14px', cursor: 'pointer' }}>
          ✉ Send magic link
        </button>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '12px', color: '#5A5570' }}>
          Data stored securely in Europe 🇪🇺
        </div>
      </div>
    </div>
  )
}
