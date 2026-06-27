import { test, expect } from '@playwright/test'

test.describe('Authentication Flows', () => {
  test('should load the login page and show credentials inputs', async ({ page }) => {
    // Navigate to login URL
    await page.goto('/auth/login')

    // Expect appropriate title or login header to exist
    await expect(page).toHaveTitle(/Login | FinanceFlow/)

    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')
    const submitBtn = page.locator('button[type="submit"]')

    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
    await expect(submitBtn).toBeVisible()
  })

  test('should show registration details', async ({ page }) => {
    await page.goto('/auth/register')

    const nameInput = page.locator('input[name="name"]')
    const emailInput = page.locator('input[name="email"]')
    const passwordInput = page.locator('input[name="password"]')

    await expect(nameInput).toBeVisible()
    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
  })
})
