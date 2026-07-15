'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const supabase = createClient()

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
      })
      if (error) setError(error.message)
      else setMessage('Check your email to confirm your account!')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else window.location.href = '/app'
    }
    setLoading(false)
  }

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
  }

  async function handleMagicLink() {
    if (!email) { setError('Enter your email first'); return }
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
    })
    if (error) setError(error.message)
    else setMessage('Magic link sent! Check your email.')
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0A0A0F', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '20px',
      fontFamily: '-apple-system, Inter, system-ui, sans-serif'
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '52px', height: '52px', background: '#C9A84C', borderRadius: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', margin: '0 auto 12px'
          }}>♩</div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#E8E0F0', letterSpacing: '-0.04em' }}>
            Tour<span style={{ color: '#C9A84C' }}>Desk</span>
          </div>
          <div style={{ fontSize: '12px', color: '#5A5570', marginTop: '4px' }}>
            ARTIST AGENDA
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: '#17171F', border: '1px solid #1F1F2E', borderRadius: '20px',
          padding: '32px 28px'
        }}>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#E8E0F0', marginBottom: '24px' }}>
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </div>

          {/* Google */}
          <button onClick={handleGoogleLogin} style={{
            width: '100%', background: '#12121A', border: '1px solid #1F1F2E',
            color: '#E8E0F0', borderRadius: '10px', padding: '12px',
            cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            marginBottom: '20px'
          }}>
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.17z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/>
              <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z"/>
              <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.3z"/>
            </svg>
            Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ flex: 1, height: '1px', background: '#1F1F2E' }}/>
            <span style={{ fontSize: '12px', color: '#5A5570' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: '#1F1F2E' }}/>
          </div>

          {/* Email form */}
          <form onSubmit={handleEmailAuth}>
            <div style={{ marginBottom: '12px' }}>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Email" required
                style={{
                  width: '100%', background: '#12121A', border: '1px solid #1F1F2E',
                  color: '#E8E0F0', borderRadius: '10px', padding: '12px 14px',
                  fontFamily: 'inherit', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Password" required={!isSignUp || isSignUp}
                minLength={8}
                style={{
                  width: '100%', background: '#12121A', border: '1px solid #1F1F2E',
                  color: '#E8E0F0', borderRadius: '10px', padding: '12px 14px',
                  fontFamily: 'inherit', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>

            {error && (
              <div style={{ background: 'rgba(232,69,60,.1)', border: '1px solid rgba(232,69,60,.3)',
                color: '#E8453C', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', marginBottom: '12px' }}>
                {error}
              </div>
            )}
            {message && (
              <div style={{ background: 'rgba(93,201,160,.1)', border: '1px solid rgba(93,201,160,.3)',
                color: '#5DC9A0', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', marginBottom: '12px' }}>
                {message}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', background: '#C9A84C', border: 'none', color: '#0A0A0F',
              borderRadius: '10px', padding: '13px', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: '14px', fontWeight: 900, marginBottom: '10px'
            }}>
              {loading ? '...' : isSignUp ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <button onClick={handleMagicLink} disabled={loading} style={{
            width: '100%', background: 'none', border: '1px solid #1F1F2E', color: '#5A5570',
            borderRadius: '10px', padding: '11px', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: '13px', marginBottom: '20px'
          }}>
            ✉ Send magic link to {email || 'your email'}
          </button>

          <div style={{ textAlign: 'center', fontSize: '13px', color: '#5A5570' }}>
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <button onClick={() => setIsSignUp(!isSignUp)} style={{
              background: 'none', border: 'none', color: '#C9A84C', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: '13px', fontWeight: 700, textDecoration: 'underline'
            }}>
              {isSignUp ? 'Sign in' : 'Sign up free'}
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '11px', color: '#5A5570' }}>
          Your data is encrypted and stored securely in Europe 🇪🇺
        </div>
      </div>
    </div>
  )
}
