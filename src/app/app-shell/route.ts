import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Redirect to new React app
  return NextResponse.redirect(new URL('/app2/tours', request.url))
}
