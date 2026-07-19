import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { base64, mimeType } = await request.json()
    if (!base64) return NextResponse.json([])

    const data = base64.includes(',') ? base64.split(',')[1] : base64
    const prompt = 'This is a tour schedule or planning document. Extract ALL show dates listed. Return ONLY a valid JSON array, no markdown, no explanation: [{ "date": "YYYY-MM-DD", "venue": "venue or theatre name", "city": "city name" }]. If no dates found, return [].'

    let content: any[]
    if (mimeType === 'application/pdf') {
      content = [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } },
        { type: 'text', text: prompt }
      ]
    } else if (mimeType.startsWith('image/')) {
      content = [
        { type: 'image', source: { type: 'base64', media_type: mimeType, data } },
        { type: 'text', text: prompt }
      ]
    } else {
      return NextResponse.json([])
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'pdfs-2024-09-25'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [{ role: 'user', content }]
      })
    })

    if (!res.ok) {
      console.error('Claude error:', res.status, await res.text())
      return NextResponse.json([])
    }

    const result = await res.json()
    let text = (result.content?.[0]?.text || '[]').replace(/```json|```/g, '').trim()
    // Extract array if wrapped in object
    if (text.startsWith('{')) {
      const match = text.match(/\[[\s\S]*\]/)
      text = match ? match[0] : '[]'
    }
    const parsed = JSON.parse(text)
    return NextResponse.json(Array.isArray(parsed) ? parsed : [])
  } catch (err) {
    console.error('Extract shows error:', err)
    return NextResponse.json([])
  }
}
