import { NextRequest, NextResponse } from 'next/server'

export async function proxy(request: NextRequest) {
  // We use localStorage for auth (not cookies), so middleware just passes through.
  // Auth protection is handled client-side in the layout.
  return NextResponse.next()
}

export const config = {
  matcher: ['/app/:path*', '/auth/:path*'],
}
