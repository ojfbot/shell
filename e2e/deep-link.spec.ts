import { test, expect } from '@playwright/test'

test.describe('Deep-link via ?app= query parameter', () => {
  test('navigating with ?app=blogengine activates the BlogEngine panel', async ({ page }) => {
    await page.goto('/?app=blogengine')

    // The shell should attempt to load the blogengine remote.
    // In CI without sub-app servers, this shows either the loading state
    // or the MF remote error — both confirm the app was activated.
    // We check for any element that references blogengine by app type.
    const appFrame = page.locator('[data-mf-remote="blogengine"]')
    const loadingText = page.getByText(/loading.*blogengine/i)
    const errorText = page.getByText(/could not load blogengine/i)

    // At least one of these should be visible within 10s
    await expect(
      appFrame.or(loadingText).or(errorText),
    ).toBeVisible({ timeout: 10_000 })
  })

  test('navigating without ?app= shows the HomeScreen', async ({ page }) => {
    await page.goto('/')

    // HomeScreen renders the app grid — look for a heading or the grid
    const homeScreen = page.locator('.home-screen, [class*="home"]')
    const appCards = page.getByRole('button').filter({ hasText: /resume|blog|trip/i })

    await expect(homeScreen.or(appCards.first())).toBeVisible({ timeout: 10_000 })
  })

  test('?app= with invalid app type shows the HomeScreen', async ({ page }) => {
    await page.goto('/?app=nonexistent')

    // Invalid app type should not activate anything — HomeScreen stays
    const appFrame = page.locator('[data-mf-remote]')
    await expect(appFrame).not.toBeVisible({ timeout: 3_000 })
  })
})
