import pino from 'pino'
import { env } from './env'

export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  ...(env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
  base: {
    env: env.NODE_ENV,
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'body.password',
      'body.passwordHash',
      'body.refreshToken',
      'body.cardNumber',
      '*.passwordHash',
      'password',
      'passwordHash',
      'token',
      'refreshToken',
    ],
    censor: '[REDACTED]',
  },
})
