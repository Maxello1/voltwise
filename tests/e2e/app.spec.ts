import { expect, test, type Page } from '@playwright/test'
const main = (page: Page) => page.locator('main')

test('all six sections fit the viewport and the theme persists', async ({ page }, testInfo) => {
  await page.goto('./')
  await expect(main(page).getByRole('heading', { level: 1 })).toContainText('Kleine Schritte')
  await page.screenshot({
    path: `docs/screenshots/dashboard-${testInfo.project.name}.png`,
    fullPage: true,
  })
  for (const [route, heading] of [
    ['lernen', 'Verstehen kommt'],
    ['ueben', 'Mach aus Wissen'],
    ['schaltplaene', 'Sieh die Verbindung'],
    ['fortschritt', 'Du kannst mehr'],
    ['einstellungen', 'So passt Voltwise'],
  ]) {
    await page.goto(`./#/${route}`)
    await expect(main(page).getByRole('heading', { level: 1 })).toContainText(heading!)
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
  }
  await page.getByRole('button', { name: 'Dunkel', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('lesson completion survives a reload', async ({ page }) => {
  await page.goto('./#/lernen')
  await page.getByRole('button', { name: 'Als gelesen markieren' }).click()
  await expect(page.getByRole('button', { name: 'Lektion abgeschlossen' })).toBeDisabled()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Lektion abgeschlossen' })).toBeDisabled()
})

test('graded answer and pending FSRS rating survive a reload', async ({ page }) => {
  await page.goto('./#/ueben')
  await page.getByRole('button', { name: 'Gemischt üben' }).click()
  await page.getByText('Ampere (A)', { exact: true }).click()
  await page.getByRole('button', { name: 'Antwort prüfen' }).click()
  await expect(page.getByText('Richtig. Die Verbindung stimmt.')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Richtig. Die Verbindung stimmt.')).toBeVisible()
  await page.getByRole('button', { name: 'Gut Sicher erinnert' }).click()
  await expect(page.getByRole('heading', { name: 'Spannung aus dem Gedächtnis' })).toBeVisible()
  await page.goto('./#/fortschritt')
  await expect(main(page).getByText('Strom hat eine Einheit')).toHaveCount(2)
})

test('clickable schematic challenge and German numeric input complete a session', async ({
  page,
}) => {
  await page.goto('./#/schaltplaene')
  await page.getByRole('button', { name: '2 Aufgaben starten' }).click()
  await page.getByLabel('Deine Antwort in A').fill('360 mA')
  await page.getByRole('button', { name: 'Antwort prüfen' }).click()
  await expect(page.getByText('Richtig. Die Verbindung stimmt.')).toBeVisible()
  await page.getByRole('button', { name: 'Nächste Aufgabe' }).click()
  await page.getByRole('button', { name: 'R2 · 200 Ω', exact: true }).click()
  await page.getByRole('button', { name: 'Antwort prüfen' }).click()
  await expect(page.getByText('Richtig. Die Verbindung stimmt.')).toBeVisible()
  await page.getByRole('button', { name: 'Sitzung abschließen' }).click()
  await expect(page.getByText('2 von 2 Aufgaben richtig beantwortet.')).toBeVisible()
})

test('versioned JSON download can restore without duplicating history', async ({ page }) => {
  await page.goto('./#/lernen')
  await page.getByRole('button', { name: 'Als gelesen markieren' }).click()
  await page.goto('./#/einstellungen')
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Sicherung exportieren' }).click()
  const download = await downloaded
  const file = await download.path()
  expect(file).toBeTruthy()
  await page.locator('input[type=file]').setInputFiles(file!)
  await page.getByRole('button', { name: 'Sicherung zusammenführen' }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Sicherung zusammengeführt' }),
  ).toBeVisible()
  await page.goto('./#/lernen')
  await expect(page.getByRole('button', { name: 'Lektion abgeschlossen' })).toBeDisabled()
})

test('the installed shell, lazy-loaded pages and learning work offline after caching', async ({
  page,
  context,
}) => {
  await page.goto('./')
  await expect(page.getByText('Offline bereit', { exact: true })).toBeVisible({ timeout: 20000 })
  await page.reload()
  await context.setOffline(true)
  await page.goto('./#/lernen')
  await expect(page.getByRole('heading', { name: 'Drei Größen, ein Stromkreis' })).toBeVisible()
  await page.getByRole('button', { name: 'Als gelesen markieren' }).click()
  await expect(page.getByRole('button', { name: 'Lektion abgeschlossen' })).toBeDisabled()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Lektion abgeschlossen' })).toBeDisabled()
  await page.goto('./#/ueben')
  await page.getByRole('button', { name: 'Gemischt üben' }).click()
  await page.getByText('Ampere (A)', { exact: true }).click()
  await page.getByRole('button', { name: 'Antwort prüfen' }).click()
  await expect(page.getByText('Richtig. Die Verbindung stimmt.')).toBeVisible()
})

test('verified SVG schematic visual baseline', async ({ page }) => {
  test.skip(
    process.platform !== 'win32',
    'Windows baseline; approve a native baseline before visual comparison on another OS.',
  )
  await page.goto('./#/schaltplaene')
  await expect(page.getByRole('button', { name: 'R2 · 200 Ω', exact: true })).toBeVisible()
  await expect(page.locator('.lab-circuit .circuit-viewer')).toHaveScreenshot('parallel-24v.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.01,
  })
})
