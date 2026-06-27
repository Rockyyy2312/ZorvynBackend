import { NextResponse } from 'next/server'

export class ApiResponse {
  static success<T>(data: T, meta?: any) {
    return NextResponse.json(
      {
        success: true,
        data,
        ...(meta ? { meta } : {}),
      },
      { status: 200 }
    )
  }

  static created<T>(data: T) {
    return NextResponse.json(
      {
        success: true,
        data,
      },
      { status: 201 }
    )
  }

  static noContent() {
    return new NextResponse(null, { status: 204 })
  }

  static error(code: string, message: string, status = 500, details?: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code,
          message,
          ...(details ? { details } : {}),
        },
      },
      { status }
    )
  }
}
