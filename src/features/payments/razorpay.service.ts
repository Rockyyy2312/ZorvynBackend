import { env } from '@/lib/env'
import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { PaymentStatus, UserPlan } from '@prisma/client'
import { BusinessRuleError, NotFoundError } from '@/shared/errors'
import { auditLog } from '@/lib/audit'
import Razorpay from 'razorpay'
import crypto from 'crypto'

export class RazorpayService {
  private razorpay: Razorpay | null = null

  constructor() {
    if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
      this.razorpay = new Razorpay({
        key_id: env.RAZORPAY_KEY_ID,
        key_secret: env.RAZORPAY_KEY_SECRET,
      })
    }
  }

  private getPlanAmount(plan: UserPlan): number {
    if (plan === 'PREMIUM') return 499 // ₹499
    if (plan === 'FAMILY') return 999 // ₹999
    if (plan === 'BUSINESS') return 2499 // ₹2499
    throw new BusinessRuleError('INVALID_PLAN', 'Plan does not support paid checkout orders.')
  }

  async createOrder(userId: string, plan: UserPlan) {
    const amountVal = this.getPlanAmount(plan)
    const amountPaise = amountVal * 100 // Razorpay expects paise

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundError('User', userId)

    let razorpayOrderId = `mock_order_${crypto.randomBytes(8).toString('hex')}`

    if (this.razorpay) {
      try {
        const order = await this.razorpay.orders.create({
          amount: amountPaise,
          currency: 'INR',
          receipt: `receipt_${userId.substring(0, 8)}`,
          notes: { userId, plan },
        })
        razorpayOrderId = order.id
      } catch (err) {
        console.warn('Razorpay order creation failed, falling back to mock order', err)
      }
    } else {
      console.info('Razorpay not configured. Generating mock order for user.')
    }

    // Save pending premium subscription order
    const subscription = await prisma.premiumSubscription.create({
      data: {
        userId,
        razorpayOrderId,
        amount: new Decimal(amountVal),
        plan,
        status: PaymentStatus.PENDING,
        billingCycle: 'MONTHLY',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    })

    return {
      subscriptionId: subscription.id,
      orderId: razorpayOrderId,
      amount: amountPaise,
      currency: 'INR',
      keyId: env.RAZORPAY_KEY_ID || 'rzp_test_mock_key',
    }
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const secret = env.RAZORPAY_WEBHOOK_SECRET || 'mock_webhook_secret'
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
    return expected === signature
  }

  async handleWebhookPayload(payload: any) {
    const event = payload.event
    const payment = payload.payload?.payment?.entity

    if (event === 'payment.captured' || event === 'order.paid') {
      const orderId = payment?.order_id
      if (!orderId) return

      // Find pending subscription order
      const sub = await prisma.premiumSubscription.findFirst({
        where: { razorpayOrderId: orderId, status: PaymentStatus.PENDING },
      })
      if (!sub) return

      // Update user plan & expires date in database
      await prisma.$transaction([
        prisma.premiumSubscription.update({
          where: { id: sub.id },
          data: {
            status: PaymentStatus.COMPLETED,
            razorpayPaymentId: payment?.id || null,
          },
        }),
        prisma.user.update({
          where: { id: sub.userId },
          data: {
            plan: sub.plan,
            planExpiresAt: sub.endDate,
          },
        }),
      ])

      await auditLog({
        userId: sub.userId,
        action: 'PLAN_CHANGE',
        resource: 'premium_subscription',
        resourceId: sub.id,
        newValue: { plan: sub.plan, expiresAt: sub.endDate?.toISOString() },
      })
    }
  }

  // Developer testing utility to force plan upgrade in dev/test environment
  async forceUpgrade(userId: string, plan: UserPlan): Promise<void> {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          plan,
          planExpiresAt: expiresAt,
        },
      }),
      prisma.premiumSubscription.create({
        data: {
          userId,
          amount: new Decimal(this.getPlanAmount(plan)),
          plan,
          status: PaymentStatus.COMPLETED,
          billingCycle: 'MONTHLY',
          startDate: new Date(),
          endDate: expiresAt,
        },
      }),
    ])
  }
}

export const razorpayService = new RazorpayService()
