import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json()
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'TourDesk <hello@tourdesktop.com>',
        to: email,
        subject: 'Welcome to TourDesk 🎤',
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0A0A0F;font-family:-apple-system,Inter,system-ui,sans-serif;color:#E8E0F0;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    
    <!-- Logo -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;width:64px;height:64px;background:#C9A84C;border-radius:16px;line-height:64px;font-size:32px;text-align:center;">♩</div>
      <div style="font-weight:900;font-size:24px;margin-top:12px;letter-spacing:-0.03em;">TourDesk</div>
    </div>

    <!-- Welcome -->
    <div style="background:#17171F;border:1px solid #1F1F2E;border-radius:16px;padding:32px;margin-bottom:24px;">
      <h1 style="font-size:22px;font-weight:900;margin:0 0 12px;letter-spacing:-0.03em;">
        Welcome${name ? `, ${name}` : ''}! 🎉
      </h1>
      <p style="color:#5A5570;line-height:1.7;margin:0 0 20px;">
        Your TourDesk account is ready. You can now manage your entire performing career in one place.
      </p>
      <a href="https://tourdesktop.com/app2/tours" style="display:inline-block;background:#C9A84C;color:#0A0A0F;border-radius:10px;padding:13px 28px;font-weight:900;font-size:15px;text-decoration:none;">
        Open TourDesk →
      </a>
    </div>

    <!-- Features -->
    <div style="background:#17171F;border:1px solid #1F1F2E;border-radius:16px;padding:24px;margin-bottom:24px;">
      <p style="font-weight:800;font-size:14px;margin:0 0 16px;color:#C9A84C;">Here's what you can do:</p>
      ${[
        ['📅', 'Add your artists & employers', 'Each gets a color — conflicts detected automatically'],
        ['⚡', 'Check availability instantly', 'Upload a PDF with proposed dates and see conflicts'],
        ['📤', 'Share your calendar', 'Send availability by WhatsApp or Gmail'],
        ['💶', 'Track earnings & hours', 'Follow your progress toward the 507h goal'],
        ['🇫🇷', 'Déclaration mensuelle', 'Ready for France Travail in one click'],
      ].map(([icon, title, desc]) => `
        <div style="display:flex;gap:12px;margin-bottom:14px;align-items:flex-start;">
          <div style="font-size:20px;flex-shrink:0;">${icon}</div>
          <div>
            <div style="font-weight:700;font-size:14px;margin-bottom:2px;">${title}</div>
            <div style="color:#5A5570;font-size:12px;">${desc}</div>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Install -->
    <div style="background:#17171F;border:1px solid #1F1F2E;border-radius:16px;padding:20px;margin-bottom:24px;text-align:center;">
      <p style="font-weight:800;margin:0 0 8px;">📱 Install on your phone</p>
      <p style="color:#5A5570;font-size:13px;margin:0 0 12px;">Add TourDesk to your home screen for the best experience</p>
      <div style="display:flex;gap:12px;justify-content:center;font-size:12px;color:#5A5570;">
        <span>🍎 Safari → Share → Add to Home Screen</span>
        <span>🤖 Chrome → ⋮ → Add to Home Screen</span>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;font-size:12px;color:#5A5570;">
      <p>Questions? Reply to this email or write to <a href="mailto:hello@tourdesktop.com" style="color:#C9A84C;">hello@tourdesktop.com</a></p>
      <p style="margin-top:8px;">TourDesk · Data stored securely in Europe 🇪🇺</p>
    </div>

  </div>
</body>
</html>
        `
      })
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Resend error:', err)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Welcome email error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
