import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { base64, mimeType } = await request.json()
    if (!base64) return NextResponse.json({})

    let imageBase64 = ''
    let imageMime = mimeType

    if (mimeType === 'application/pdf') {
      // Render PDF first page to canvas using pdfjs-dist
      const pdfData = base64.includes(',') ? base64.split(',')[1] : base64
      const pdfBuffer = Buffer.from(pdfData, 'base64')

      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs' as any)
      pdfjsLib.GlobalWorkerOptions.workerSrc = ''

      const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer })
      const pdf = await loadingTask.promise
      const page = await pdf.getPage(1)
      const viewport = page.getViewport({ scale: 2.0 })

      // Use node-canvas to render
      const { createCanvas } = await import('canvas')
      const canvas = createCanvas(viewport.width, viewport.height)
      const ctx = canvas.getContext('2d')

      await page.render({
        canvasContext: ctx as any,
        viewport,
      }).promise

      imageBase64 = canvas.toBuffer('image/png').toString('base64')
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
            { type: 'text', text: 'This is a travel ticket. Extract travel information and return ONLY valid JSON: { "from": "departure city or station", "to": "arrival city or station", "date": "date as shown", "time": "HH:MM departure time", "ref": "train or flight number", "seat": "seat if visible", "type": "train|plane|bus|other" }. Use null for missing fields.' }
          ]
        }]
      })
    })

    if (!res.ok) return NextResponse.json({})
    const data = await res.json()
    const text = (data.content?.[0]?.text || '{}').replace(/```json|```/g, '').trim()
    return NextResponse.json(JSON.parse(text))
  } catch (err) {
    console.error('Extract ticket error:', err)
    return NextResponse.json({})
  }
}
