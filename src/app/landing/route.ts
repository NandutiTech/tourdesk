import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET() {
  const htmlPath = join(process.cwd(), 'public', 'tourdesk-app.html')
  let html = readFileSync(htmlPath, 'utf-8')
  
  // Inject script to stay on landing
  const injection = `<script>
window._landingMode = true;
</script>`
  html = html.replace('</head>', injection + '</head>')

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
  })
}
