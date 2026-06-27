import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const SYSTEM_CATEGORIES = [
  // Expense Categories
  { name: 'Food & Dining', type: 'EXPENSE', icon: '🍔', color: '#FF6B6B' },
  { name: 'Groceries', type: 'EXPENSE', icon: '🛒', color: '#4DABF7' },
  { name: 'Shopping', type: 'EXPENSE', icon: '🛍️', color: '#FCC419' },
  { name: 'Housing & Rent', type: 'EXPENSE', icon: '🏠', color: '#51CF66' },
  { name: 'Utilities & Bills', type: 'EXPENSE', icon: '⚡', color: '#FF922B' },
  { name: 'Transportation & Auto', type: 'EXPENSE', icon: '🚗', color: '#20C997' },
  { name: 'Entertainment & Leisure', type: 'EXPENSE', icon: '🎬', color: '#AE3EC9' },
  { name: 'Health & Fitness', type: 'EXPENSE', icon: '🏥', color: '#E64980' },
  { name: 'Investments', type: 'EXPENSE', icon: '📈', color: '#099268' },
  { name: 'Insurance', type: 'EXPENSE', icon: '🛡️', color: '#4C6EF5' },
  { name: 'Education', type: 'EXPENSE', icon: '🎓', color: '#15AABF' },
  { name: 'Gifts & Donations', type: 'EXPENSE', icon: '🎁', color: '#F783AC' },
  { name: 'Taxes', type: 'EXPENSE', icon: '💸', color: '#868E96' },
  { name: 'Miscellaneous', type: 'EXPENSE', icon: '🏷️', color: '#ADB5BD' },

  // Income Categories
  { name: 'Salary', type: 'INCOME', icon: '💼', color: '#2B8A3E' },
  { name: 'Freelance & Business', type: 'INCOME', icon: '💻', color: '#1098AD' },
  { name: 'Investments Return', type: 'INCOME', icon: '📈', color: '#0CA678' },
  { name: 'Gifts & Grants', type: 'INCOME', icon: '🎁', color: '#D6336C' },
  { name: 'Rental Income', type: 'INCOME', icon: '🏠', color: '#37B24D' },
  { name: 'Refunds', type: 'INCOME', icon: '🔄', color: '#495057' },
  { name: 'Other Income', type: 'INCOME', icon: '💵', color: '#748FFC' },
]

async function main() {
  console.log('🌱 Starting system categories seed...')

  for (const cat of SYSTEM_CATEGORIES) {
    const existing = await prisma.category.findFirst({
      where: {
        name: cat.name,
        type: cat.type as any,
        isSystem: true,
      },
    })

    if (!existing) {
      await prisma.category.create({
        data: {
          name: cat.name,
          type: cat.type as any,
          icon: cat.icon,
          color: cat.color,
          isSystem: true,
          sortOrder: 0,
        },
      })
      console.log(`  ✔ Created system category: ${cat.name} (${cat.type})`)
    } else {
      console.log(`  ➖ System category already exists: ${cat.name}`)
    }
  }

  console.log('✅ Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
