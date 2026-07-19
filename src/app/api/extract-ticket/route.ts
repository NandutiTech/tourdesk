import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { base64, mimeType, prompt } = await request.json()
    if (!base64) return NextResponse.json({})

    const defaultPrompt = 'This is a travel ticket. Extract travel information and return ONLY valid JSON: { "from": "departure city or station", "to": "arrival city or station", "date": "date as shown", "time": "HH:MM departure time", "ref": "train or flight number", "seat": "seat if visible", "type": "train|plane|bus|other" }. Use null for missing fields.'
    const textPrompt: string = prompt || defaultPrompt

    const data = base64.includes(',') ? base64.split(',')[1] : base64

    let content: any[]

    if (mimeType === 'application/pdf') {
      content = [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } },
        { type: 'text', text: textPrompt }
      ]
    } else if (mimeType.startsWith('image/')) {
      content = [
        { type: 'image', source: { type: 'base64', media_type: mimeType, data } },
        { type: 'text', text: textPrompt }
      ]
    } else {
      return NextResponse.json({})
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
        max_tokens: 1000,
        messages: [{ role: 'user', content }]
      })
    })

    if (!res.ok) {
      console.error('Claude error:', res.status, await res.text())
      return NextResponse.json({})
    }

    const result = await res.json()
    const text = (result.content?.[0]?.text || '{}').replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(text)
    return NextResponse.json(parsed)
  } catch (err) {
    console.error('Extract ticket error:', err)
    return NextResponse.json({})
  }
}
