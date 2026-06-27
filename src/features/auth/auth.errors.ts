import { AppError } from '@/shared/errors'

export class EmailAlreadyExistsError extends AppError {
  constructor(email: string) {
    super('EMAIL_ALREADY_EXISTS', `A user with email ${email} already exists`, 409)
  }
}

export class EmailNotVerifiedError extends AppError {
  constructor() {
    super('EMAIL_NOT_VERIFIED', 'Your email address is not verified. Please check your inbox.', 403)
  }
}

export class InvalidCredentialsError extends AppError {
  constructor() {
    super('INVALID_CREDENTIALS', 'The email or password you entered is incorrect.', 401)
  }
}

export class TokenExpiredOrInvalidError extends AppError {
  constructor(message = 'The token is expired or invalid.') {
    super('TOKEN_EXPIRED_OR_INVALID', message, 400)
  }
}
