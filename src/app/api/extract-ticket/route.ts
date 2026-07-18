import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function pdfToBase64Image(pdfBase64: string): Promise<string | null> {
  try {
    const { fromBase64 } = await import('pdf2pic')
    const convert = fromBase64(pdfBase64.split(',')[1], {
      density: 150,
      format: 'png',
      width: 1200,
      height: 1600,
    })
    const result = await convert(1, { responseType: 'base64' })
    return result.base64 || null
  } catch (e) {
    console.error('PDF to image error:', e)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const { base64, mimeType } = await request.json()
    if (!base64) return NextResponse.json({})

    let imageBase64 = ''
    let imageMime = mimeType

    if (mimeType === 'application/pdf') {
      // Convert PDF first page to image
      const converted = await pdfToBase64Image(base64)
      if (!converted) return NextResponse.json({})
      imageBase64 = converted
      imageMime = 'image/png'
    } else if (mimeType.startsWith('image/')) {
      imageBase64 = base64.includes(',') ? base64.split(',')[1] : base64
    } else {
      return NextResponse.json({})
    }

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
            { type: 'image', source: { type: 'base64', media_type: imageMime, data: imageBase64 } },
            { type: 'text', text: 'This is a travel ticket. Extract the travel information and return ONLY valid JSON with no markdown: { "from": "departure city or station name", "to": "arrival city or station name", "date": "date as shown on ticket", "time": "departure time HH:MM", "ref": "train or flight number or booking reference", "seat": "seat number if visible", "type": "train or plane or bus or other" }. Use null for missing fields. Be concise with city/station names.' }
          ]
        }]
      })
    })

    if (!res.ok) {
      console.error('Claude API error:', res.status, await res.text())
      return NextResponse.json({})
    }

    const data = await res.json()
    const text = (data.content?.[0]?.text || '{}').replace(/```json|```/g, '').trim()
    return NextResponse.json(JSON.parse(text))
  } catch (err) {
    console.error('Extract ticket error:', err)
    return NextResponse.json({})
  }
}
