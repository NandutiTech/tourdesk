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

    // Inject token AND save it to localStorage so it persists
    const injection = `<script>
(function(){
  var token = ${JSON.stringify(session.access_token)};
  var email = ${JSON.stringify(user.email)};
  var uid = ${JSON.stringify(user.id)};
  window._supabaseToken = token;
  window._supabaseUser = {email: email, id: uid};
  // Save to sessionStorage AND localStorage for persistence
  try { sessionStorage.setItem('td_token', token); } catch(e) {}
  try { sessionStorage.setItem('td_email', email); } catch(e) {}
  try { localStorage.setItem('td_token', token); } catch(e) {}
  try { localStorage.setItem('td_email', email); } catch(e) {}
})();
</script>`

    html = html.replace('</head>', injection + '</head>')

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })
  } catch (err) {
    console.error('App shell error:', err)
    return NextResponse.redirect('https://tourdesk-lilac.vercel.app/auth/login')
  }
}
