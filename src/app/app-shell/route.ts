import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: { session } } = await supabase.auth.getSession()

    if (!user || !session) {
      return NextResponse.redirect(new URL('/auth/login', 'https://tourdesk-lilac.vercel.app'))
    }

    // Read the HTML file
    const htmlPath = join(process.cwd(), 'public', 'tourdesk-app.html')
    let html = readFileSync(htmlPath, 'utf-8')

    // Inject user data directly into the HTML
    const injection = `<script>
window._supabaseToken = ${JSON.stringify(session.access_token)};
window._supabaseUser = ${JSON.stringify({ email: user.email, id: user.id })};
window._supabaseSession = { access_token: window._supabaseToken, user: window._supabaseUser };
</script>`

    html = html.replace('</head>', injection + '</head>')

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })
  } catch (err) {
    console.error('App shell error:', err)
    return NextResponse.redirect('/auth/login')
  }
}
