import { expect, test, type Page } from '@playwright/test'
const main = (page: Page) => page.locator('main')

test('concept recommendations explain evidence and preserve targeted practice across reloads', async ({
  page,
  context,
}, testInfo) => {
  await page.goto('./#/ueben?concept=ohm-law')
  await expect(
    page.getByRole('heading', { name: 'Ohmsches Gesetz', level: 2, exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('region', { name: 'Deine nächste Auswahl' }).locator('li'),
  ).toHaveCount(5)
  await expect(page.getByText('Offline bereit', { exact: true })).toBeVisible({ timeout: 20000 })
  await page.reload()
  await expect(page.getByText('Offline bereit', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Konzept gezielt üben' }).click()
  await page.getByLabel('Deine Antwort in A').fill('0,5 A')
  await page.getByRole('button', { name: 'Antwort prüfen' }).click()
  await expect(page.getByText('Ein guter Moment zum Verstehen.')).toBeVisible()
  await context.setOffline(true)
  await page.goto('./#/fortschritt')
  const recommendations = page.getByRole('region', { name: 'Empfehlungen zum Vertiefen' })
  await expect(recommendations.getByText(/0 von 1 Versuch ohne Hinweis richtig/)).toBeVisible()
  await expect(recommendations.getByText(/Erste Anhaltspunkte/)).toBeVisible()
  await recommendations.getByRole('link').click()
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Den Strom berechnen', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nächste Aufgabe' })).toBeVisible()
  await page.getByRole('button', { name: 'Nächste Aufgabe' }).click()
  await page.getByLabel('Deine Antwort in Ω').fill('600')
  await page.getByRole('button', { name: 'Antwort prüfen' }).click()
  await page.getByRole('button', { name: 'Nächste Aufgabe' }).click()
  await page.getByLabel('Deine Antwort in A').fill('0,2 A')
  await page.getByRole('button', { name: 'Antwort prüfen' }).click()
  await page.getByRole('button', { name: 'Nächste Aufgabe' }).click()
  await page.getByLabel('Deine Antwort in V').fill('10')
  await page.getByRole('button', { name: 'Antwort prüfen' }).click()
  await page.getByRole('button', { name: 'Nächste Aufgabe' }).click()
  await page.getByLabel('Deine Antwort in A').fill('0,5 A')
  await page.getByRole('button', { name: 'Antwort prüfen' }).click()
  await page.getByRole('button', { name: 'Sitzung abschließen' }).click()
  await expect(page.getByText('3 von 5 Aufgaben richtig beantwortet.')).toBeVisible()
  await page.goto('./#/fortschritt')
  await expect(page.getByRole('heading', { name: 'Dein Zeitplan wächst mit dir.' })).toBeVisible()
  await recommendations.getByRole('link', { name: /Ohmsches Gesetz/ }).click()
  const selection = page.getByRole('region', { name: 'Deine nächste Auswahl' })
  await expect(selection.locator('li').first()).toContainText(
    '3 von 5 Versuchen ohne Hinweis richtig',
  )
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true)
  await page.screenshot({
    path: `docs/screenshots/practice-recommendations-${testInfo.project.name}.png`,
    fullPage: true,
    animations: 'disabled',
  })
  await page.goto('./#/einstellungen')
  await page.getByRole('button', { name: 'Dunkel', exact: true }).click()
  await page.goto('./#/ueben?concept=ohm-law')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(selection.locator('li').first()).toContainText('3 von 5 Versuchen')
  await page.screenshot({
    path: `docs/screenshots/practice-recommendations-dark-${testInfo.project.name}.png`,
    fullPage: true,
    animations: 'disabled',
  })
})

test('curated short answers accept consistent unit names and symbols without guessing', async ({
  page,
}) => {
  await page.goto('./#/ueben?concept=units')
  await page.getByRole('button', { name: 'Konzept gezielt üben' }).click()
  await page.getByText('Ampere (A)', { exact: true }).click()
  await page.getByRole('button', { name: 'Antwort prüfen' }).click()
  await page.getByRole('button', { name: 'Gut Sicher erinnert' }).click()
  await page.getByLabel('Deine Antwort', { exact: true }).fill('Ｕ...')
  await page.getByRole('button', { name: 'Antwort prüfen' }).click()
  await expect(page.getByText('Richtig. Die Verbindung stimmt.')).toBeVisible()
  await page.getByRole('button', { name: 'Gut Sicher erinnert' }).click()
  await page.getByLabel('Deine Antwort in A').fill('240 mA')
  await page.getByRole('button', { name: 'Antwort prüfen' }).click()
  await page.getByRole('button', { name: 'Nächste Aufgabe' }).click()
  await page.getByLabel('Deine Antwort', { exact: true }).fill('Ohm (Ω)')
  await page.getByRole('button', { name: 'Antwort prüfen' }).click()
  await expect(page.getByText('Richtig. Die Verbindung stimmt.')).toBeVisible()
  await page.getByRole('button', { name: 'Gut Sicher erinnert' }).click()
  await page.getByLabel('Deine Antwort', { exact: true }).fill('Volt (V)')
  await page.getByRole('button', { name: 'Antwort prüfen' }).click()
  await expect(page.getByText('Richtig. Die Verbindung stimmt.')).toBeVisible()
  await page.getByRole('button', { name: 'Gut Sicher erinnert' }).click()
  await expect(page.getByText('5 von 5 Aufgaben richtig beantwortet.')).toBeVisible()
})

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
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
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
  await expect(page.getByText('Offline bereit', { exact: true })).toBeVisible()
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

const circuitCases = [
  { id: 'parallel-24v', name: 'Parallelschaltung', component: 'R2 · 200 Ω' },
  { id: 'series-24v', name: 'Reihenschaltung', component: 'R2 · 200 Ω' },
  { id: 'divider-12v', name: 'Spannungsteiler', component: 'R2 · 2 kΩ' },
  { id: 'lamp-12v', name: 'Schalter & Lampe', component: 'S1 · geschlossen' },
  { id: 'meters-24v', name: 'Richtig messen', component: 'A1 · ideal' },
]

test('circuit selection, net highlighting and viewport controls work on all diagrams', async ({
  page,
}, testInfo) => {
  await page.goto('./#/schaltplaene')
  for (const circuit of circuitCases) {
    await page.getByRole('button', { name: circuit.name, exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`circuit=${circuit.id}`))
    await expect(page.getByRole('button', { name: circuit.component, exact: true })).toBeVisible()
    await page.getByLabel('Netz hervorheben').selectOption({ index: 1 })
    expect(await page.locator('.lab-circuit .wire-selected').count()).toBeGreaterThan(0)
    await page.getByRole('button', { name: 'Vergrößern', exact: true }).click()
    const diagram = page.locator('.lab-circuit svg.circuit-svg')
    const centered = await diagram.getAttribute('viewBox')
    await page.getByRole('button', { name: 'Ausschnitt nach rechts' }).click()
    expect(await diagram.getAttribute('viewBox')).not.toBe(centered)
    await page.getByRole('button', { name: 'Schaltplan einpassen' }).click()
    await expect(page.getByText('100 %', { exact: true })).toBeVisible()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true)
  }
  await page.reload()
  await expect(page.getByRole('button', { name: 'Richtig messen', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.screenshot({
    path: `docs/screenshots/circuit-library-${testInfo.project.name}.png`,
    fullPage: true,
  })
})

test('a metering session uses its own diagram and preserves a pending answer', async ({ page }) => {
  await page.goto('./#/schaltplaene?circuit=meters-24v')
  await page.getByRole('button', { name: '3 Aufgaben starten' }).click()
  await expect(page.getByRole('heading', { name: 'Den Laststrom messen' })).toBeVisible()
  await page.getByRole('button', { name: 'A1 · ideal', exact: true }).click()
  await page.getByRole('button', { name: 'Antwort prüfen' }).click()
  await expect(page.getByText('Richtig. Die Verbindung stimmt.')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Richtig. Die Verbindung stimmt.')).toBeVisible()
  await page.getByRole('button', { name: 'Nächste Aufgabe' }).click()
  await page.getByRole('button', { name: 'V1 · ideal', exact: true }).click()
  await page.getByRole('button', { name: 'Antwort prüfen' }).click()
  await page.getByRole('button', { name: 'Nächste Aufgabe' }).click()
  await page.getByLabel('Deine Antwort in A').fill('240 mA')
  await page.getByRole('button', { name: 'Antwort prüfen' }).click()
  await expect(page.getByText('Richtig. Die Verbindung stimmt.')).toBeVisible()
  await page.getByRole('button', { name: 'Sitzung abschließen' }).click()
  await expect(page.getByText('3 von 3 Aufgaben richtig beantwortet.')).toBeVisible()
})

test('wrong diagram selections highlight the chosen and correct components separately', async ({
  page,
}) => {
  await page.goto('./#/schaltplaene?circuit=divider-12v')
  await page.getByRole('button', { name: '2 Aufgaben starten' }).click()
  await page.getByRole('button', { name: 'R1 · 1 kΩ', exact: true }).click()
  await page.getByRole('button', { name: 'Antwort prüfen' }).click()
  await expect(page.locator('.circuit-component.selected.incorrect')).toHaveAttribute(
    'aria-label',
    'R1 · 1 kΩ',
  )
  await expect(page.locator('.circuit-component.answer-target')).toHaveAttribute(
    'aria-label',
    'R2 · 2 kΩ',
  )
  await expect(page.getByText('Deine Antwort: R1 · 1 kΩ')).toBeVisible()
})

test('new circuits and exercises are available without a network', async ({ page, context }) => {
  await page.goto('./')
  await expect(page.getByText('Offline bereit', { exact: true })).toBeVisible({ timeout: 20000 })
  await page.reload()
  await context.setOffline(true)
  await page.goto('./#/schaltplaene?circuit=lamp-12v')
  await expect(page.getByRole('button', { name: 'S1 · geschlossen', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '3 Aufgaben starten' }).click()
  await page.getByRole('button', { name: 'S1 · geschlossen', exact: true }).click()
  await page.getByRole('button', { name: 'Antwort prüfen' }).click()
  await expect(page.getByText('Richtig. Die Verbindung stimmt.')).toBeVisible()
})

for (const circuit of circuitCases)
  test(`verified SVG visual baseline: ${circuit.id}`, async ({ page }) => {
    test.skip(
      process.platform !== 'win32',
      'Windows baseline; approve a native baseline before visual comparison on another OS.',
    )
    await page.goto(`./#/schaltplaene?circuit=${circuit.id}`)
    await expect(page.getByRole('button', { name: circuit.component, exact: true })).toBeVisible()
    await expect(page.locator('.lab-circuit .circuit-viewer')).toHaveScreenshot(
      `${circuit.id}.png`,
      { animations: 'disabled', maxDiffPixelRatio: 0.01 },
    )
  })
