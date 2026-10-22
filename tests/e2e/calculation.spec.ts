import { test, expect, type Page } from '@playwright/test'

async function fitsViewport(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true)
}
async function capture(page: Page, path: string) {
  // Reset document scroll so fixed/sticky navigation stays at the top of a full-page capture.
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path, fullPage: true, animations: 'disabled' })
}

test('round codes reproduce shareable previews in both themes and keep an older unrated session', async ({
  page,
}, testInfo) => {
  // Isolate clipboard integration from the system clipboard; inspect only our own generated link.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          ;(window as Window & { copiedRoundLink?: string }).copiedRoundLink = value
        },
      },
    })
  })
  await page.goto('./#/ueben')
  await page.getByRole('button', { name: 'Rechentrainer öffnen' }).click()
  await page.getByLabel('Übungscode · sechs Ziffern').fill('000000')
  await page.getByRole('button', { name: 'Runde anzeigen' }).click()
  await expect(page).toHaveURL(/trainer=dc&code=000000/)
  const plan = page.getByRole('region', { name: 'Deine nächste Auswahl' })
  await expect(plan.locator('li')).toHaveCount(5)
  await expect(plan.locator('li').first()).toContainText('12 V / 1200 Ω')
  await page.getByRole('button', { name: 'Rundenlink kopieren' }).click()
  await expect(page.getByText('Rundenlink kopiert.')).toBeVisible()
  expect(
    await page.evaluate(() => (window as Window & { copiedRoundLink?: string }).copiedRoundLink),
  ).toBe(page.url())
  await fitsViewport(page)
  await capture(page, `docs/screenshots/calculation-round-${testInfo.project.name}.png`)
  await page.goto('./#/einstellungen')
  await page.getByRole('button', { name: 'Dunkel', exact: true }).click()
  await page.goto('./#/ueben?trainer=dc&code=000000')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(plan.locator('li').first()).toContainText('12 V / 1200 Ω')
  await capture(page, `docs/screenshots/calculation-round-dark-${testInfo.project.name}.png`)
  await page.getByRole('button', { name: 'Neue Zahlen', exact: true }).click()
  await expect(page).not.toHaveURL(/code=000000/)
  await page.goto('./#/ueben?trainer=dc&code=invalid')
  await expect(page.getByRole('button', { name: 'Rechenrunde starten' })).toBeDisabled()
  await expect(
    page.getByText('Der Übungscode muss genau sechs Ziffern enthalten.', { exact: false }),
  ).toBeVisible()
  await page.goto('./#/ueben')
  await page.getByRole('button', { name: 'Gemischt üben' }).click()
  await page.getByText('Ampere (A)', { exact: true }).click()
  await page.getByRole('button', { name: 'Antwort prüfen' }).click()
  await expect(page.getByText('Richtig. Die Verbindung stimmt.')).toBeVisible()
  await page.goto('./#/ueben?trainer=dc&code=999999')
  await expect(
    page.getByText('Deine offene Sitzung wird zuerst fortgesetzt.', { exact: false }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Strom hat eine Einheit', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Gut Sicher erinnert' })).toBeVisible()
})

test('a generated round retains its values, diagrams and grading offline after a reload', async ({
  page,
  context,
}, testInfo) => {
  await page.goto('./#/ueben?trainer=dc&code=000000')
  await expect(page.getByText('Offline bereit', { exact: true })).toBeVisible({ timeout: 20000 })
  await page.reload()
  await page.getByRole('button', { name: 'Rechenrunde starten' }).click()
  await context.setOffline(true)
  await page.getByLabel('Deine Antwort in A').fill('10 mA')
  await page.getByRole('button', { name: 'Antwort prüfen' }).click()
  await expect(page.getByText('Richtig. Die Verbindung stimmt.')).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Strom berechnen · 12 V / 1200 Ω', exact: true }),
  ).toBeVisible()
  await expect(page.getByText('Richtig. Die Verbindung stimmt.')).toBeVisible()
  await expect(page.getByText('Wie gut konntest du dich erinnern?')).toHaveCount(0)
  await page.getByRole('button', { name: 'Nächste Aufgabe' }).click()
  await page.getByLabel('Deine Antwort in Ω').fill('0,9 kΩ')
  await page.getByRole('button', { name: 'Antwort prüfen' }).click()
  await page.getByRole('button', { name: 'Nächste Aufgabe' }).click()
  await page.getByLabel('Deine Antwort in W').fill('90 mW')
  await page.getByRole('button', { name: 'Antwort prüfen' }).click()
  await page.getByRole('button', { name: 'Nächste Aufgabe' }).click()
  await expect(page.getByRole('img', { name: 'G1 · 48 V DC', exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: 'R1 · 330 Ω', exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: 'R2 · 150 Ω', exact: true })).toBeVisible()
  await fitsViewport(page)
  await capture(page, `docs/screenshots/calculation-series-${testInfo.project.name}.png`)
  await page.getByLabel('Deine Antwort in A').fill('0,1 V')
  await page.getByRole('button', { name: 'Antwort prüfen' }).click()
  await expect(page.getByText('Die Einheit muss zu A passen.', { exact: false })).toBeVisible()
  await page.getByLabel('Deine Antwort in A').fill('0,1 A')
  await page.getByRole('button', { name: 'Antwort prüfen' }).click()
  await page.getByRole('button', { name: 'Nächste Aufgabe' }).click()
  await expect(page.getByRole('img', { name: 'G1 · 24 V DC', exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: 'R1 · 150 Ω', exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: 'R2 · 100 Ω', exact: true })).toBeVisible()
  await page.getByLabel('Deine Antwort in A').fill('400 mA')
  await page.getByRole('button', { name: 'Antwort prüfen' }).click()
  await page.getByRole('button', { name: 'Sitzung abschließen' }).click()
  await expect(page.getByText('5 von 5 Aufgaben richtig beantwortet.')).toBeVisible()
  await page.goto('./#/fortschritt')
  await expect(page.getByRole('heading', { name: 'Dein Zeitplan wächst mit dir.' })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Strom berechnen · 12 V / 1200 Ω', exact: true }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Strom berechnen · 12 V / 1200 Ω', exact: true }).click()
  await expect(page.getByLabel('Übungscode · sechs Ziffern')).toHaveValue('000000')
  await page.goto('./')
  await expect(page.getByText('0 von 46 Aufgaben entdeckt · 5 Rechenversuche')).toBeVisible()
})

test('a fresh browser restores a generated pending answer from its JSON backup without the network', async ({
  page,
  browser,
}) => {
  await page.goto('./#/ueben?trainer=dc&code=123456')
  await page.getByRole('button', { name: 'Rechenrunde starten' }).click()
  await page.getByRole('button', { name: 'Hinweis', exact: true }).click()
  await page.getByLabel('Deine Antwort in A').fill('40 mA')
  await page.getByRole('button', { name: 'Antwort prüfen' }).click()
  await expect(page.getByText('Richtig. Die Verbindung stimmt.')).toBeVisible()
  await page.goto('./#/einstellungen')
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Sicherung exportieren' }).click()
  const file = await (await downloaded).path()
  const restored = await browser.newContext({ viewport: page.viewportSize() })
  try {
    const restoredPage = await restored.newPage()
    await restoredPage.goto(new URL('./#/einstellungen', page.url()).href)
    await expect(restoredPage.getByText('Offline bereit', { exact: true })).toBeVisible({
      timeout: 20000,
    })
    await restoredPage.reload()
    await restored.setOffline(true)
    await restoredPage.locator('input[type=file]').setInputFiles(file!)
    await restoredPage.getByRole('button', { name: 'Sicherung zusammenführen' }).click()
    await expect(
      restoredPage.getByRole('status').filter({ hasText: 'Sicherung zusammengeführt' }),
    ).toBeVisible()
    await restoredPage.goto(new URL('./#/ueben', page.url()).href)
    await expect(
      restoredPage.getByRole('heading', { name: 'Strom berechnen · 48 V / 1200 Ω', exact: true }),
    ).toBeVisible()
    await expect(restoredPage.getByText('Richtig. Die Verbindung stimmt.')).toBeVisible()
    await expect(restoredPage.getByText('Deine Antwort: 0.04 A')).toBeVisible()
    await restoredPage.getByRole('button', { name: 'Nächste Aufgabe' }).click()
    await expect(
      restoredPage.getByRole('heading', {
        name: 'Widerstand berechnen · 36 V / 40 mA',
        exact: true,
      }),
    ).toBeVisible()
  } finally {
    await restored.close()
  }
})
