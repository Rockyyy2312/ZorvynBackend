export function getIpAddress(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown'
  }
  return req.headers.get('x-real-ip') || '127.0.0.1'
}

export function getUserAgent(req: Request): string {
  return req.headers.get('user-agent') || 'unknown'
}
