import { prisma } from './prisma'
import { AuditAction } from '@prisma/client'

export interface AuditLogParams {
  userId?: string
  action: AuditAction
  resource: string
  resourceId?: string
  oldValue?: any
  newValue?: any
  ipAddress?: string
  userAgent?: string
}

export async function auditLog(params: AuditLogParams) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId || null,
        oldValue: params.oldValue || null,
        newValue: params.newValue || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    })
  } catch (error) {
    // Audit log write failure should not crash main operations
    console.error('Audit log creation failed:', error)
  }
}
