import jwt from 'jsonwebtoken'
import { env } from './env'

export interface JWTPayload {
  sub: string
  email: string
  name: string
  plan: string
  isAdmin: boolean
  sessionId: string
}

export function signJWT(payload: JWTPayload, expiresInSeconds: number): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: expiresInSeconds,
  })
}

export function verifyJWT(token: string): JWTPayload {
  return jwt.verify(token, env.JWT_SECRET, {
    algorithms: ['HS256'],
  }) as JWTPayload
}
