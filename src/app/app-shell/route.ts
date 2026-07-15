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
      return NextResponse.redirect('https://tourdesk-lilac.vercel.app/auth/login')
    }

    const htmlPath = join(process.cwd(), 'public', 'tourdesk-app.html')
    let html = readFileSync(htmlPath, 'utf-8')

    const injection = `<script>
(function(){
  var token = ${JSON.stringify(session.access_token)};
  var email = ${JSON.stringify(user.email)};
  window._supabaseToken = token;
  window._supabaseUser = {email: email, id: ${JSON.stringify(user.id)}};
  try { localStorage.setItem('td_token', token); localStorage.setItem('td_email', email); } catch(e) {}
  try { sessionStorage.setItem('td_token', token); } catch(e) {}
  // Redirect refresh to app-shell so token is always fresh
  if(window.location.pathname !== '/app-shell'){
    window.history.replaceState(null,'','/app-shell');
  }
})();
</script>`

    html = html.replace('</head>', injection + '</head>')

    // Set headers to prevent caching so token is always fresh
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    })
  } catch (err) {
    console.error('App shell error:', err)
    return NextResponse.redirect('https://tourdesk-lilac.vercel.app/auth/login')
  }
}
