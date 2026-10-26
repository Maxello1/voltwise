import { expect, test } from '@playwright/test'
test('Pages keeps cloud disabled and settings accessible in both themes and narrow viewports', async ({
  page,
}) => {
  const requests: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) requests.push(request.url())
  })
  await page.goto('./#/einstellungen')
  await expect(
    page.getByRole('heading', { name: 'Cloud-Synchronisierung', exact: true }),
  ).toBeVisible()
  await expect(page.getByText(/Diese Ausgabe speichert ausschließlich lokal/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mit GitHub anmelden' })).toHaveCount(0)
  for (const theme of ['Hell', 'Dunkel']) {
    await page.getByRole('button', { name: theme, exact: true }).click()
    for (const width of [320, 375, 390, 430]) {
      await page.setViewportSize({ width, height: 900 })
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      ).toBe(true)
    }
  }
  expect(requests).toEqual([])
})
