export function renderEmailTemplate(
  template: 'verify-email' | 'reset-password',
  variables: Record<string, string>
): string {
  const { name, link } = variables

  if (template === 'verify-email') {
    return `
      <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e9e9e9; border-radius: 8px;">
        <h2 style="color: #3b82f6;">Welcome to FinanceFlow!</h2>
        <p>Hi ${name || 'User'},</p>
        <p>Thank you for signing up. Please verify your email address to active your account and start tracking your finances.</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${link}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email Address</a>
        </div>
        <p style="color: #666; font-size: 14px;">Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all; font-size: 14px; color: #3b82f6;">${link}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">This link will expire in 24 hours.</p>
      </div>
    `
  }

  if (template === 'reset-password') {
    return `
      <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e9e9e9; border-radius: 8px;">
        <h2 style="color: #ef4444;">Reset Your Password</h2>
        <p>Hi ${name || 'User'},</p>
        <p>We received a request to reset your password for your FinanceFlow account. Click the button below to set a new password.</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${link}" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p style="color: #666; font-size: 14px;">Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all; font-size: 14px; color: #ef4444;">${link}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">This link will expire in 1 hour.</p>
      </div>
    `
  }

  return ''
}
