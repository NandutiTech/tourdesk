import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function getTokenFromCookies(cookieHeader: string): string {
  for (const cookie of cookieHeader.split(';')) {
    const [name, ...rest] = cookie.trim().split('=')
    const val = rest.join('=')
    if (!name?.includes('sb-')) continue
    try {
      const decoded = decodeURIComponent(val)
      const parsed = JSON.parse(decoded)
      if (parsed?.access_token) return parsed.access_token
      if (Array.isArray(parsed) && parsed[0]?.access_token) return parsed[0].access_token
      if (parsed?.session?.access_token) return parsed.session.access_token
    } catch(e) {}
  }
  return ''
}

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || ''
    const token = getTokenFromCookies(cookieHeader)

    let user = null
    if (token) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })
      const { data } = await supabase.auth.getUser(token)
      user = data.user
    }

    const htmlPath = join(process.cwd(), 'public', 'tourdesk-app.html')
    let html = readFileSync(htmlPath, 'utf-8')

    // Inject token if we found one from cookies
    // If not, the HTML will use localStorage token saved by login page
    const injection = user && token ? `<script>
(function(){
  var token = ${JSON.stringify(token)};
  var email = ${JSON.stringify(user.email)};
  window._supabaseToken = token;
  window._supabaseUser = {email: email, id: ${JSON.stringify(user.id)}};
  try { localStorage.setItem('td_token', token); localStorage.setItem('td_email', email); } catch(e) {}
  try { sessionStorage.setItem('td_token', token); } catch(e) {}
})();
</script>` : `<script>
// No server token found - HTML will use localStorage token
window._supabaseToken = null;
</script>`

    html = html.replace('</head>', injection + '</head>')

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      }
    })
  } catch (err) {
    console.error('App shell error:', err)
    const htmlPath = join(process.cwd(), 'public', 'tourdesk-app.html')
    const html = readFileSync(htmlPath, 'utf-8')
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
    })
  }
}
