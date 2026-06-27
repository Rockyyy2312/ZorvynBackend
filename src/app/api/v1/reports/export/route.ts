import { reportsService } from '@/features/reports/reports.service'
import { withAuth, AuthenticatedRequest } from '@/server/middleware/auth.middleware'
import { withErrorHandler } from '@/shared/utils/with-error-handler'
import { NextResponse } from 'next/server'

export const GET = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest) => {
    const { searchParams } = new URL(req.url)
    const source = (searchParams.get('source') as any) || 'transactions'

    const csvContent = await reportsService.generateCSV(req.user.id, source)

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${source}-export.csv"`,
      },
    })
  })
)
