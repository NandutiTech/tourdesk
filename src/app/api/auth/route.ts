import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { token, email, refreshToken } = await request.json()
    if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

    const response = NextResponse.json({ success: true })

    // Set httpOnly cookies - not accessible by JavaScript
    response.cookies.set('td_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    if (refreshToken) {
      response.cookies.set('td_refresh', refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      })
    }

    if (email) {
      // Email is not sensitive, can be readable
      response.cookies.set('td_email', email, {
        httpOnly: false,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
      })
    }

    return response
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete('td_token')
  response.cookies.delete('td_refresh')
  response.cookies.delete('td_email')
  return response
}
