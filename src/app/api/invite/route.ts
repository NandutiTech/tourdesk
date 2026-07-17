import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  const { data: { user } } = await adminClient.auth.getUser(token)
  if (!user) return null
  const { data } = await adminClient.from('admins').select('email').eq('email', user.email).single()
  return data ? user : null
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { email, plan, months, note } = await request.json()
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const planLabel = plan === 'manager' ? 'Manager' : plan === 'pro' ? 'Pro' : 'Solo'
    const duration = months === 0 ? 'unlimited access' : `${months} month${months > 1 ? 's' : ''} of free access`
    const appUrl = 'https://tourdesktop.com'

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0A0A0F;font-family:-apple-system,Inter,system-ui,sans-serif">
  <div style="max-width:480px;margin:0 auto;padding:32px 24px">
    
    <div style="text-align:center;margin-bottom:32px">
      <div style="width:60px;height:60px;background:#C9A84C;border-radius:16px;display:inline-flex;align-items:center;justify-content:center;font-size:28px;margin-bottom:14px">♩</div>
      <div style="font-size:26px;font-weight:900;color:#E8E0F0;letter-spacing:-0.04em">Tour<span style="color:#C9A84C">Desk</span></div>
      <div style="font-size:11px;color:#5A5570;letter-spacing:0.15em;text-transform:uppercase;margin-top:4px">Artist Agenda</div>
    </div>

    <div style="background:#17171F;border:1px solid #1F1F2E;border-radius:20px;padding:32px 28px;text-align:center;margin-bottom:20px">
      <div style="font-size:22px;font-weight:900;color:#E8E0F0;margin-bottom:10px">You're invited! 🎉</div>
      <div style="font-size:14px;color:#5A5570;line-height:1.7;margin-bottom:24px">
        You've been given <strong style="color:#C9A84C">${planLabel} plan</strong> access to TourDesk — ${duration}.
        ${note ? `<br><br><em style="color:#5A5570">"${note}"</em>` : ''}
      </div>
      
      <div style="background:#0A0A0F;border:1px solid #1F1F2E;border-radius:12px;padding:16px;margin-bottom:24px;text-align:left">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#5A5570;margin-bottom:10px">What you get with ${planLabel}</div>
        ${plan === 'pro' || plan === 'manager' ? `
        <div style="font-size:13px;color:#E8E0F0;margin-bottom:6px">✓ Tour calendar & conflict alerts</div>
        <div style="font-size:13px;color:#E8E0F0;margin-bottom:6px">✓ Earnings & France Travail tools</div>
        <div style="font-size:13px;color:#E8E0F0;margin-bottom:6px">✓ Travel, Expenses & Guest list</div>
        <div style="font-size:13px;color:#E8E0F0;margin-bottom:6px">✓ PDF planning import</div>
        <div style="font-size:13px;color:#E8E0F0">✓ Share with productions</div>
        ` : `
        <div style="font-size:13px;color:#E8E0F0;margin-bottom:6px">✓ Tour calendar & conflict alerts</div>
        <div style="font-size:13px;color:#E8E0F0">✓ Earnings & France Travail tools</div>
        `}
        ${plan === 'manager' ? `
        <div style="font-size:13px;color:#C9A84C;margin-top:6px">✓ Manager tour sheets for your team</div>
        ` : ''}
      </div>

      <a href="${appUrl}" style="display:block;background:#C9A84C;color:#0A0A0F;font-weight:900;font-size:16px;padding:16px 32px;border-radius:12px;text-decoration:none;margin-bottom:12px">
        Open TourDesk →
      </a>
      <div style="font-size:12px;color:#5A5570">${appUrl}</div>
    </div>

    <div style="text-align:center;font-size:11px;color:#5A5570;line-height:1.8">
      Your data is encrypted and stored securely in Europe 🇪🇺<br>
      Questions? Reply to this email.
    </div>
  </div>
</body>
</html>`

    // Send via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'TourDesk <onboarding@resend.dev>',
        to: [email],
        subject: `You're invited to TourDesk — ${planLabel} plan 🎉`,
        html
      })
    })

    const result = await res.json()
    if (!res.ok) {
      console.error('Resend error:', result)
      return NextResponse.json({ error: result.message || 'Email failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Invite error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
