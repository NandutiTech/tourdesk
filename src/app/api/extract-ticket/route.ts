import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { base64, mimeType } = await request.json()
    if (!base64 || !mimeType?.startsWith('image/')) return NextResponse.json({})

    const imageData = base64.includes(',') ? base64.split(',')[1] : base64

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageData } },
            { type: 'text', text: 'Extract travel information from this ticket. Return ONLY valid JSON, no markdown: { "from": "departure city or station", "to": "arrival city or station", "date": "date as shown", "time": "departure time HH:MM", "ref": "train or flight number", "seat": "seat number if visible", "type": "train|plane|bus|other" }. Use null for missing fields.' }
          ]
        }]
      })
    })

    if (!res.ok) { console.error('Claude error:', res.status); return NextResponse.json({}) }
    const data = await res.json()
    const text = (data.content?.[0]?.text || '{}').replace(/```json|```/g, '').trim()
    return NextResponse.json(JSON.parse(text))
  } catch (err) {
    console.error('Extract ticket error:', err)
    return NextResponse.json({})
  }
}
