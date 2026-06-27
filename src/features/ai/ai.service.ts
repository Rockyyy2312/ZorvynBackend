import { env } from '@/lib/env'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { SYSTEM_PROMPT, CATEGORIZATION_PROMPT } from './prompts'
import { PLAN_LIMITS } from '@/shared/constants'
import { BusinessRuleError } from '@/shared/errors'
import { auditLog } from '@/lib/audit'
import OpenAI from 'openai'
import type { AIChatMessage } from './ai.types'

export class AIService {
  private openai: OpenAI | null = null

  constructor() {
    if (env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: env.OPENAI_API_KEY,
      })
    }
  }

  async checkRateLimit(userId: string, plan: string): Promise<void> {
    const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS]
    const limit = limits?.AI_MESSAGES_PER_DAY ?? 5

    const key = `ai:limit:${userId}`

    // Increment count
    const current = await redis.get(key)
    const count = current ? parseInt(current, 10) : 0

    if (count >= limit) {
      throw new BusinessRuleError(
        'AI_LIMIT_REACHED',
        `You have used all your ${limit} free AI questions for today. Upgrade to ask more!`
      )
    }

    // Set count and TTL to end of day if new key
    if (count === 0) {
      const now = new Date()
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      const secondsToTodayEnd = Math.max(1, Math.floor((endOfDay.getTime() - now.getTime()) / 1000))
      await redis.set(key, 1, 'EX', secondsToTodayEnd)
    } else {
      await redis.incr(key)
    }
  }

  async buildContext(userId: string): Promise<string> {
    const [wallets, budgets, savingsGoals] = await Promise.all([
      prisma.wallet.findMany({ where: { userId, deletedAt: null } }),
      prisma.budget.findMany({ where: { userId, deletedAt: null }, include: { category: true } }),
      prisma.savingsGoal.findMany({ where: { userId, deletedAt: null } }),
    ])

    const walletLines = wallets
      .map((w) => `- ${w.name} (${w.type}): balance ₹${w.balance.toString()}`)
      .join('\n')

    const budgetLines = budgets
      .map((b) => `- Category ${b.category?.name || 'Uncategorized'}: spent ₹${b.spentAmount.toString()} / limit ₹${b.limitAmount.toString()}`)
      .join('\n')

    const goalLines = savingsGoals
      .map((g) => `- Goal "${g.name}": saved ₹${g.currentAmount.toString()} / target ₹${g.targetAmount.toString()}`)
      .join('\n')

    return `
=== WALLETS ===
${walletLines || 'None'}

=== BUDGETS ===
${budgetLines || 'None'}

=== SAVINGS GOALS ===
${goalLines || 'None'}
`
  }

  async chat(userId: string, messages: AIChatMessage[]): Promise<string> {
    // 1. Build context
    const context = await this.buildContext(userId)

    const finalMessages = [
      { role: 'system' as const, content: SYSTEM_PROMPT + context },
      ...messages,
    ]

    // 2. Try OpenAI
    if (this.openai) {
      try {
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: finalMessages,
          temperature: 0.7,
          max_completion_tokens: 1000,
        })

        const reply = completion.choices[0]?.message?.content || 'No reply generated.'

        await auditLog({
          userId,
          action: 'CREATE',
          resource: 'ai_chat',
          newValue: { tokensUsed: completion.usage?.total_tokens },
        })

        return reply
      } catch (err) {
        console.warn('OpenAI completion failed, falling back to local model', err)
      }
    }

    // 3. Fail-open Local Canned Responder
    const lastUserMsg = messages[messages.length - 1]?.content.toLowerCase() || ''
    return this.getLocalCannedResponse(lastUserMsg)
  }

  private getLocalCannedResponse(input: string): string {
    if (input.includes('budget') || input.includes('spent')) {
      return `Here is a local analysis of your budgets:
- You have budgets set up for your categories.
- Review your active budgets using the Budgets page to make sure you do not exceed the threshold limit alerts (usually set at 80%).`
    }
    if (input.includes('saving') || input.includes('goal')) {
      return `To hit your savings goals faster, try setting up a small recurring wallet transfer or direct contribution on your savings goals ledger page.`
    }
    if (input.includes('wallet') || input.includes('balance') || input.includes('net worth')) {
      return `Your Net Worth is calculated as the sum of all your active cash, bank, and credit card wallet accounts. Keep your wallet log transactions updated for the best accuracy.`
    }

    return `Hello! I am your offline FinanceFlow assistant. (OpenAI is currently offline or unconfigured).
I can help with questions about:
- Budgets and alert limits
- Savings goals milestones
- Wallet balances and Net Worth
Please feel free to ask about these topics!`
  }

  async categorizeTransaction(
    description: string,
    merchant?: string | null,
    type?: string
  ): Promise<string> {
    const normDesc = (description || '').toLowerCase()
    const normMerc = (merchant || '').toLowerCase()

    // 1. Local rules mapping
    if (type === 'INCOME') {
      if (normDesc.includes('salary') || normDesc.includes('payroll') || normMerc.includes('employer')) {
        return 'Salary'
      }
      if (normDesc.includes('freelance') || normDesc.includes('upwork') || normDesc.includes('contract')) {
        return 'Freelance & Business'
      }
      return 'Other Income'
    }

    // Expenses local rules
    if (normDesc.includes('uber') || normDesc.includes('ola') || normDesc.includes('metro') || normDesc.includes('fuel') || normDesc.includes('petrol')) {
      return 'Transportation & Auto'
    }
    if (normDesc.includes('swiggy') || normDesc.includes('zomato') || normDesc.includes('food') || normDesc.includes('restaurant') || normDesc.includes('dine')) {
      return 'Food & Dining'
    }
    if (normDesc.includes('groceries') || normDesc.includes('bigbasket') || normDesc.includes('blinkit') || normDesc.includes('milk')) {
      return 'Groceries'
    }
    if (normDesc.includes('amazon') || normDesc.includes('flipkart') || normDesc.includes('shopping') || normDesc.includes('myntra')) {
      return 'Shopping'
    }
    if (normDesc.includes('netflix') || normDesc.includes('spotify') || normDesc.includes('movie') || normDesc.includes('theatre') || normDesc.includes('hotstar')) {
      return 'Entertainment & Leisure'
    }
    if (normDesc.includes('rent') || normDesc.includes('landlord') || normDesc.includes('maintenance')) {
      return 'Housing & Rent'
    }
    if (normDesc.includes('electricity') || normDesc.includes('bill') || normDesc.includes('water') || normDesc.includes('recharge') || normDesc.includes('wifi')) {
      return 'Utilities & Bills'
    }

    // 2. OpenAI suggestion fallback
    if (this.openai) {
      try {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: CATEGORIZATION_PROMPT },
            {
              role: 'user',
              content: `Description: "${description}", Merchant: "${merchant || 'Unknown'}", Type: "${type || 'EXPENSE'}"`,
            },
          ],
          temperature: 0.1,
          max_completion_tokens: 20,
        })

        const category = response.choices[0]?.message?.content?.trim()
        if (category) return category
      } catch (err) {
        console.warn('OpenAI auto categorization failed, returning Miscellaneous', err)
      }
    }

    return 'Miscellaneous'
  }
}

export const aiService = new AIService()
