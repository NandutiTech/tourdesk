'use client'
import { useState, useEffect } from 'react'

const HOW_IT_WORKS = [
  { icon: '🎤', title: 'Add your employers & artists', body: 'Start by adding the artists or productions you work with. Each gets a color — conflicts are detected automatically.' },
  { icon: '📅', title: 'Add your events', body: 'Add shows, rehearsals, residences, filming days and more. Or upload a planning PDF and the app reads the dates automatically.' },
  { icon: '⚡', title: 'Check before you say yes', body: 'A manager sends proposed dates? Upload the PDF or photo and see instantly which dates are free and which conflict.' },
  { icon: '📤', title: 'Share your calendar', body: 'Go to Share My Calendar, pick a date range, and send your availability by WhatsApp or Gmail — with or without artist names.' },
  { icon: '💶', title: 'Track earnings & hours', body: 'Set your cachet per employer once. Every event is calculated automatically. Track your hours toward your 507h goal.' },
  { icon: '🇫🇷', title: 'Déclaration mensuelle', body: 'At month end, your contracts are formatted as France Travail requires — just copy and paste.' },
  { icon: '📱', title: 'Install on your phone', body: 'Add TourDesk to your Home Screen for the best experience — full screen, no browser bar, works offline.' },
]

export function InstallPrompt() {
  const [show, setShow] = useState(false)
  const [tab, setTab] = useState<'install' | 'how'>('how')
  const [os, setOs] = useState<'ios' | 'android'>('ios')
  const [slide, setSlide] = useState(0)

  useEffect(() => {
    const dismissed = localStorage.getItem('td_onboarding_done')
    if (!dismissed) setTimeout(() => setShow(true), 1000)
    // Detect OS
    if (/android/i.test(navigator.userAgent)) setOs('android')
  }, [])

  const dismiss = (permanent: boolean) => {
    if (permanent) localStorage.setItem('td_onboarding_done', '1')
    setShow(false)
  }

  if (!show) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.75)', display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ width: '100%', background: '#17171F', borderRadius: '20px 20px 0 0', padding: '24px 20px 40px', maxHeight: '85vh', overflowY: 'auto', boxSizing: 'border-box', color: '#E8E0F0', fontFamily: '-apple-system, Inter, system-ui, sans-serif' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ width: '56px', height: '56px', background: '#C9A84C', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', margin: '0 auto 12px' }}>♩</div>
          <div style={{ fontWeight: 900, fontSize: '20px', marginBottom: '4px' }}>Welcome to TourDesk</div>
          <div style={{ fontSize: '13px', color: '#5A5570' }}>Your all-in-one agenda for artists</div>
        </div>

        {/* Tab toggle */}
        <div style={{ display: 'flex', background: '#12121A', borderRadius: '10px', padding: '3px', marginBottom: '20px' }}>
          <button onClick={() => setTab('how')} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: 700, background: tab === 'how' ? '#C9A84C' : 'transparent', color: tab === 'how' ? '#0A0A0F' : '#5A5570' }}>
            ✨ How it works
          </button>
          <button onClick={() => setTab('install')} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: 700, background: tab === 'install' ? '#C9A84C' : 'transparent', color: tab === 'install' ? '#0A0A0F' : '#5A5570' }}>
            📱 Install app
          </button>
        </div>

        {/* HOW IT WORKS */}
        {tab === 'how' && (
          <>
            {/* Progress dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '20px' }}>
              {HOW_IT_WORKS.map((_, i) => (
                <div key={i} onClick={() => setSlide(i)} style={{ width: i === slide ? '20px' : '6px', height: '6px', borderRadius: '3px', background: i === slide ? '#C9A84C' : '#1F1F2E', cursor: 'pointer', transition: 'width .2s' }} />
              ))}
            </div>

            {/* Slide */}
            <div style={{ textAlign: 'center', padding: '20px 0', minHeight: '160px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>{HOW_IT_WORKS[slide].icon}</div>
              <div style={{ fontWeight: 900, fontSize: '18px', marginBottom: '10px' }}>{HOW_IT_WORKS[slide].title}</div>
              <div style={{ fontSize: '14px', color: '#5A5570', lineHeight: 1.7 }}>{HOW_IT_WORKS[slide].body}</div>
            </div>

            {/* Nav */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              {slide > 0 && (
                <button onClick={() => setSlide(s => s - 1)} style={{ flex: 1, background: '#12121A', border: '1px solid #1F1F2E', color: '#E8E0F0', borderRadius: '12px', padding: '13px', fontFamily: 'inherit', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>← Back</button>
              )}
              {slide < HOW_IT_WORKS.length - 1 ? (
                <button onClick={() => setSlide(s => s + 1)} style={{ flex: 2, background: '#C9A84C', border: 'none', color: '#0A0A0F', borderRadius: '12px', padding: '13px', fontFamily: 'inherit', fontSize: '14px', fontWeight: 900, cursor: 'pointer' }}>Next →</button>
              ) : (
                <button onClick={() => setTab('install')} style={{ flex: 2, background: '#C9A84C', border: 'none', color: '#0A0A0F', borderRadius: '12px', padding: '13px', fontFamily: 'inherit', fontSize: '14px', fontWeight: 900, cursor: 'pointer' }}>📱 Install the app →</button>
              )}
            </div>
          </>
        )}

        {/* INSTALL */}
        {tab === 'install' && (
          <>
            <div style={{ display: 'flex', background: '#12121A', borderRadius: '10px', padding: '3px', marginBottom: '20px' }}>
              <button onClick={() => setOs('ios')} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', fontWeight: 700, background: os === 'ios' ? '#5DC9A0' : 'transparent', color: os === 'ios' ? '#0A0A0F' : '#5A5570' }}>🍎 iPhone</button>
              <button onClick={() => setOs('android')} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', fontWeight: 700, background: os === 'android' ? '#5DC9A0' : 'transparent', color: os === 'android' ? '#0A0A0F' : '#5A5570' }}>🤖 Android</button>
            </div>

            {os === 'ios' && (
              <>
                <div style={{ background: 'rgba(201,168,76,.08)', border: '1px solid rgba(201,168,76,.2)', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: '#C9A84C' }}>
                  ⚠️ Must use Safari — Chrome on iPhone doesn't support installing PWAs
                </div>
                {[
                  { icon: '🌐', step: 'Open in Safari', note: 'Go to tourdesktop.com in Safari' },
                  { icon: '□↑', step: 'Tap the Share button', note: 'At the bottom center of the screen' },
                  { icon: '➕', step: 'Tap "Add to Home Screen"', note: 'Scroll down in the share menu if needed' },
                  { icon: '✅', step: 'Tap "Add" to confirm', note: 'TourDesk appears on your home screen!' },
                ].map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <div style={{ width: '38px', height: '38px', background: '#12121A', border: '1px solid #1F1F2E', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>{s.icon}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>{s.step}</div>
                      <div style={{ fontSize: '12px', color: '#5A5570', marginTop: '2px' }}>{s.note}</div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {os === 'android' && (
              <>
                {[
                  { icon: '🌐', step: 'Open in Chrome', note: 'Go to tourdesktop.com in Chrome' },
                  { icon: '⋮', step: 'Tap the 3-dot menu', note: 'Top right corner of the browser' },
                  { icon: '➕', step: 'Tap "Add to Home Screen"', note: 'Or "Install app" if the banner appears' },
                  { icon: '✅', step: 'Tap "Add" to confirm', note: 'TourDesk appears on your home screen!' },
                ].map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <div style={{ width: '38px', height: '38px', background: '#12121A', border: '1px solid #1F1F2E', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>{s.icon}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>{s.step}</div>
                      <div style={{ fontSize: '12px', color: '#5A5570', marginTop: '2px' }}>{s.note}</div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {/* Footer actions */}
        <div style={{ marginTop: '16px' }}>
          <button onClick={() => dismiss(false)} style={{ width: '100%', background: tab === 'install' ? '#C9A84C' : '#12121A', border: tab === 'install' ? 'none' : '1px solid #1F1F2E', color: tab === 'install' ? '#0A0A0F' : '#E8E0F0', borderRadius: '12px', padding: '14px', fontFamily: 'inherit', fontSize: '15px', fontWeight: 900, cursor: 'pointer', marginBottom: '10px' }}>
            {tab === 'install' ? "Got it, let's go! 🎉" : 'Skip for now'}
          </button>
          <button onClick={() => dismiss(true)} style={{ width: '100%', background: 'transparent', border: 'none', color: '#5A5570', padding: '10px', fontFamily: 'inherit', fontSize: '13px', cursor: 'pointer' }}>
            Don't show this again
          </button>
        </div>
      </div>
    </div>
  )
}
