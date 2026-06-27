import { UserPlan } from '@prisma/client'

export interface User {
  id: string
  email: string
  name: string
  plan: UserPlan
  planExpiresAt: Date | null
  timezone: string
  currency: string
  isAdmin: boolean
  onboardingCompleted: boolean
  createdAt: Date
  updatedAt: Date
}

export interface UserSession {
  id: string
  userId: string
  ipAddress: string | null
  userAgent: string | null
  lastSeen: Date
  isActive: boolean
  createdAt: Date
}
