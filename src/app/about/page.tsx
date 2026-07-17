'use client'
import Link from 'next/link'

const LOLA_ARTISTS = [
  'Pierre de Maere', 'Vincent Dedienne', 'Lucie Antunes', 'Julia Jean-Baptiste',
  'Moodoid', 'Feu! Chatterton', 'Sarah Maison', 'Ko Shin Moon',
  'HUNJIYA', 'Chino Corvalan and Victor Alvarez', 'Polycool', 'Nili Hadida'
]

export default function AboutPage() {
  return (
    <div style={{ background: '#0A0A0F', color: '#E8E0F0', fontFamily: '-apple-system, Inter, system-ui, sans-serif', minHeight: '100vh' }}>

      {/* Nav */}
      <nav style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1F1F2E' }}>
        <Link href="/landing" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: '#E8E0F0' }}>
          <div style={{ width: '36px', height: '36px', background: '#C9A84C', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>♩</div>
          <span style={{ fontWeight: 900, fontSize: '18px', letterSpacing: '-0.03em' }}>TourDesk</span>
        </Link>
        <Link href="/auth/login" style={{ background: '#C9A84C', color: '#0A0A0F', borderRadius: '8px', padding: '8px 16px', fontSize: '14px', fontWeight: 900, textDecoration: 'none' }}>Get started</Link>
      </nav>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '48px 24px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: '12px' }}>The story behind TourDesk</div>
          <h1 style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.2, margin: '0 0 16px' }}>Built by artists,<br />for artists</h1>
          <p style={{ fontSize: '15px', color: '#5A5570', lineHeight: 1.7 }}>
            TourDesk was born from a real frustration — managing a busy performance schedule across multiple employers, tracking hours for intermittent status, and keeping everything organized without losing your mind.
          </p>
        </div>

        {/* Lola */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', marginBottom: '24px' }}>
            <img src="/images/lola.jpeg" alt="Lola Warin" style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', flexShrink: 0, border: '3px solid #C9A84C' }} />
            <div>
              <div style={{ fontWeight: 900, fontSize: '20px', marginBottom: '2px' }}>Lola Warin</div>
              <div style={{ fontSize: '13px', color: '#C9A84C', fontWeight: 700, marginBottom: '4px' }}>Artist Advisor · Drummer & Percussionist</div>
              <div style={{ fontSize: '12px', color: '#5A5570' }}>Paris, France</div>
            </div>
          </div>

          <p style={{ fontSize: '14px', color: '#5A5570', lineHeight: 1.8, marginBottom: '16px' }}>
            I'm a drummer and percussionist based in Paris. I've had the privilege of collaborating with a wide range of artists and I believe music has no limits — one of its purposes is to break boundaries. Why put yourself in a box at all?
          </p>

          <p style={{ fontSize: '14px', color: '#5A5570', lineHeight: 1.8, marginBottom: '20px' }}>
            I started writing my own music after my second trip to Paraguay, deeply inspired by the adventures, encounters, and collaborations I experienced there. Wanting to translate those emotions through both sound and image, I decided to record a live session in the place where it all began — building a fully Paraguayan team around the project.
          </p>

          <div style={{ background: '#12121A', border: '1px solid #1F1F2E', borderRadius: '14px', padding: '18px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '12px' }}>Artists she's worked with</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {LOLA_ARTISTS.map((a, i) => (
                <div key={i} style={{ background: '#1F1F2E', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', color: '#E8E0F0' }}>{a}</div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ height: '1px', background: '#1F1F2E', marginBottom: '48px' }} />

        {/* Sannie */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', marginBottom: '24px' }}>
            <img src="/images/sannie.jpg" alt="Sannie Patron" style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', flexShrink: 0, border: '3px solid #5DC9A0' }} />
            <div>
              <div style={{ fontWeight: 900, fontSize: '20px', marginBottom: '2px' }}>Sannie Patron</div>
              <div style={{ fontSize: '13px', color: '#5DC9A0', fontWeight: 700, marginBottom: '4px' }}>Founder & Developer</div>
              <div style={{ fontSize: '12px', color: '#5A5570' }}>Paris, France · Founder of Ñandutí Tech</div>
            </div>
          </div>

          <p style={{ fontSize: '14px', color: '#5A5570', lineHeight: 1.8, marginBottom: '16px' }}>
            With +9 years of experience in the data world, I have a deep interest in analyzing data, databases and everything related to their exploitation for better decision-making. My training and professional experiences made me want to go further in acquiring knowledge and building tools that actually solve real problems.
          </p>

          <p style={{ fontSize: '14px', color: '#5A5570', lineHeight: 1.8 }}>
            Fast learner, autonomous, and very curious — I'm always looking for constant improvement and growth, always learning new things with the main objective to connect to the world and offer it knowledge and good service through data.
          </p>
        </div>

        {/* Why TourDesk */}
        <div style={{ background: 'rgba(201,168,76,.08)', border: '1px solid rgba(201,168,76,.15)', borderRadius: '16px', padding: '24px', marginBottom: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', marginBottom: '12px' }}>🎭 + 💻</div>
          <div style={{ fontWeight: 900, fontSize: '18px', marginBottom: '10px' }}>Why TourDesk?</div>
          <p style={{ fontSize: '14px', color: '#5A5570', lineHeight: 1.7, margin: 0 }}>
            Lola brought the artist's perspective — the real pain of managing multiple employers, tracking hours toward the 507h threshold, and coordinating availability. Sannie brought the technical expertise to build it. Together, TourDesk was born.
          </p>
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center' }}>
          <Link href="/auth/login#signup" style={{ display: 'inline-block', background: '#C9A84C', color: '#0A0A0F', borderRadius: '12px', padding: '14px 32px', fontWeight: 900, fontSize: '16px', textDecoration: 'none', marginBottom: '12px' }}>
            Start free →
          </Link>
          <div style={{ fontSize: '12px', color: '#5A5570', marginTop: '8px' }}>
            <Link href="/landing" style={{ color: '#5A5570', textDecoration: 'none' }}>← Back to home</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
