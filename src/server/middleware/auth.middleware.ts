import { auth } from '@/lib/auth'
import { UnauthorizedError } from '@/shared/errors'

export interface AuthenticatedRequest extends Request {
  user: {
    id: string
    email: string
    name: string
    plan: 'FREE' | 'PREMIUM' | 'FAMILY' | 'BUSINESS'
    isAdmin: boolean
  }
}

export function withAuth(
  handler: (req: AuthenticatedRequest, ...args: any[]) => Promise<Response>
) {
  return async (req: Request, ...args: any[]): Promise<Response> => {
    // NextAuth auth() reads cookies/headers from the context
    const session = await auth()
    if (!session || !session.user || !session.user.id) {
      throw new UnauthorizedError('Authentication required')
    }

    const authenticatedReq = req as AuthenticatedRequest
    authenticatedReq.user = {
      id: session.user.id,
      email: session.user.email ?? '',
      name: session.user.name ?? '',
      plan: (session.user.plan as any) ?? 'FREE',
      isAdmin: !!session.user.isAdmin,
    }

    return handler(authenticatedReq, ...args)
  }
}
