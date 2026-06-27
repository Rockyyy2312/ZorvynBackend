import { razorpayService } from '@/features/payments/razorpay.service'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const signature = req.headers.get('x-razorpay-signature') || ''
  const rawBody = await req.text()

  const isValid = razorpayService.verifyWebhookSignature(rawBody, signature)
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
  }

  try {
    const payload = JSON.parse(rawBody)
    await razorpayService.handleWebhookPayload(payload)
    return NextResponse.json({ status: 'ok' })
  } catch (err) {
    console.error('Webhook processing error:', err)
    return NextResponse.json({ error: 'Internal processing error' }, { status: 500 })
  }
}
