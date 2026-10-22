import { expect, test, type Page } from '@playwright/test'

const component = (page: Page, id: string) =>
  page.locator(`.lab-circuit [data-component-id="${id}"]`)
async function fits(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true)
}

test('all control diagrams support selection, keyboard, touch-sized view controls and both themes', async ({
  page,
}, info) => {
  await page.goto('./#/schaltplaene?circuit=control-lamp-v1')
  await page.getByRole('button', { name: 'Start drücken', exact: true }).focus()
  await page.keyboard.press('Space')
  await expect(component(page, 'h1')).toHaveAttribute('data-state', 'on')
  await page.getByRole('button', { name: 'Start loslassen', exact: true }).click()
  await expect(component(page, 'h1')).toHaveAttribute('data-state', 'off')
  for (const id of ['control-lamp-v1', 'control-hold-v1', 'control-overload-v1']) {
    await page.goto(`./#/schaltplaene?circuit=${id}`)
    await page.getByLabel('Bauteil auswählen', { exact: true }).selectOption('s1')
    await expect(component(page, 's1')).toHaveAttribute('aria-pressed', 'true')
    await page.getByLabel('Direkt zum Anschluss').selectOption('s1.a')
    expect(await page.locator('.lab-circuit .wire-selected').count()).toBeGreaterThan(0)
    await page.getByRole('button', { name: 'Vergrößern', exact: true }).click()
    const diagram = page.locator('.lab-circuit svg.circuit-svg')
    const centered = await diagram.getAttribute('viewBox')
    await page.getByRole('button', { name: 'Ausschnitt nach unten' }).click()
    expect(await diagram.getAttribute('viewBox')).not.toBe(centered)
    await page.getByRole('button', { name: 'Schaltplan einpassen' }).click()
    await expect(page.getByText('100 %', { exact: true })).toBeVisible()
    const size = await page.getByRole('button', { name: 'Vergrößern' }).boundingBox()
    expect(size!.width).toBeGreaterThanOrEqual(44)
    expect(size!.height).toBeGreaterThanOrEqual(44)
    await fits(page)
  }
  await page.getByRole('button', { name: 'Start drücken', exact: true }).click()
  await page.getByRole('button', { name: 'Start loslassen', exact: true }).click()
  await expect(component(page, 'k1-coil')).toHaveAttribute('data-state', 'on')
  await expect(component(page, 'k1-hold')).toHaveAttribute('data-state', 'closed')
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({
    path: `docs/screenshots/control-running-${info.project.name}.png`,
    fullPage: true,
    animations: 'disabled',
  })
  await page.goto('./#/einstellungen')
  await page.getByRole('button', { name: 'Dunkel', exact: true }).click()
  for (const [id, load] of [
    ['control-lamp-v1', 'h1'],
    ['control-hold-v1', 'k1-coil'],
  ]) {
    await page.goto(`./#/schaltplaene?circuit=${id}`)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await page.getByRole('button', { name: 'Start drücken', exact: true }).click()
    await expect(component(page, load!)).toHaveAttribute('data-state', 'on')
    await fits(page)
  }
  await page.goto('./#/schaltplaene?circuit=control-overload-v1')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByRole('button', { name: 'Überlast auslösen', exact: true }).click()
  await expect(component(page, 'f1-contact')).toHaveAttribute('data-state', 'open')
  await fits(page)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({
    path: `docs/screenshots/control-tripped-dark-${info.project.name}.png`,
    fullPage: true,
    animations: 'disabled',
  })
  if (info.project.name === 'mobile') {
    await page.setViewportSize({ width: 320, height: 700 })
    for (const id of ['control-lamp-v1', 'control-hold-v1', 'control-overload-v1']) {
      await page.goto(`./#/schaltplaene?circuit=${id}`)
      await fits(page)
    }
  }
})

test('self-holding, stop, trip, manual reset and held-Start restoration show the actual states', async ({
  page,
}) => {
  await page.goto('./#/schaltplaene?circuit=control-overload-v1')
  await page.getByRole('button', { name: 'Start drücken', exact: true }).click()
  await page.getByRole('button', { name: 'Start loslassen', exact: true }).click()
  await expect(component(page, 'k1-coil')).toHaveAttribute('data-state', 'on')
  await page.getByRole('button', { name: 'Stop drücken', exact: true }).click()
  await expect(component(page, 's0')).toHaveAttribute('data-state', 'open')
  await expect(component(page, 'k1-coil')).toHaveAttribute('data-state', 'off')
  await expect(component(page, 'k1-hold')).toHaveAttribute('data-state', 'open')
  await page.getByRole('button', { name: 'Stop loslassen', exact: true }).click()
  await page.getByRole('button', { name: 'Start drücken', exact: true }).click()
  await page.getByRole('button', { name: '24 V ausschalten', exact: true }).click()
  await page.getByRole('button', { name: '24 V einschalten', exact: true }).click()
  await expect(component(page, 'k1-coil')).toHaveAttribute('data-state', 'off')
  await expect(component(page, 'b1-permit')).toHaveAttribute('data-state', 'open')
  await page.getByRole('button', { name: 'Start loslassen', exact: true }).click()
  await page.getByRole('button', { name: 'Start drücken', exact: true }).click()
  await expect(component(page, 'k1-coil')).toHaveAttribute('data-state', 'on')
  await page.getByRole('button', { name: 'Überlast auslösen', exact: true }).click()
  await expect(component(page, 'f1-contact')).toHaveAttribute('data-state', 'open')
  await expect(component(page, 'k1-coil')).toHaveAttribute('data-state', 'off')
  const reset = page.getByRole('button', { name: 'F1 manuell zurücksetzen', exact: true })
  await expect(reset).toBeDisabled()
  await page.getByRole('button', { name: 'Fehlerursache beseitigen', exact: true }).click()
  await expect(reset).toBeDisabled() // Start is still held.
  await page.getByRole('button', { name: 'Start loslassen', exact: true }).click()
  await reset.click()
  await expect(component(page, 'f1-contact')).toHaveAttribute('data-state', 'closed')
  await expect(component(page, 'k1-coil')).toHaveAttribute('data-state', 'off')
  await page.getByRole('button', { name: 'Start drücken', exact: true }).click()
  await expect(component(page, 'k1-coil')).toHaveAttribute('data-state', 'on')
  await page.getByText('Zustände & Fehlersuche', { exact: true }).click()
  for (const [scenario, id] of [
    ['trip', 'f1-contact'],
    ['restore', 'b1-permit'],
    ['stop', 's0'],
  ]) {
    await page.getByLabel('Fehlersuche', { exact: true }).selectOption(scenario!)
    await page.getByRole('button', { name: 'Szenario laden', exact: true }).click()
    await expect(component(page, id!)).toHaveAttribute('data-state', 'open')
    await expect(component(page, 'k1-coil')).toHaveAttribute('data-state', 'off')
  }
  await page.reload()
  await expect(component(page, 'k1-coil')).toHaveAttribute('data-state', 'off')
  await expect(component(page, 's0')).toHaveAttribute('data-state', 'closed')
})

test('control lessons and applied attempts work offline, resume, recommend and restore through JSON', async ({
  page,
  context,
  browser,
}) => {
  await page.goto('./#/lernen?topic=controls')
  await expect(
    page.getByRole('heading', { name: 'Vom Taster zur Selbsthaltung', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Als gelesen markieren' }).click()
  await expect(page.getByRole('button', { name: 'Lektion abgeschlossen' })).toBeDisabled()
  await expect(page.getByText('Offline bereit', { exact: true })).toBeVisible({ timeout: 20000 })
  await page.reload()
  await context.setOffline(true)
  await page.goto('./#/schaltplaene?circuit=control-hold-v1')
  await page.getByRole('button', { name: 'Start drücken', exact: true }).click()
  await expect(component(page, 'k1-coil')).toHaveAttribute('data-state', 'on')
  await page.getByRole('button', { name: '3 Aufgaben starten', exact: true }).click()
  await page.getByRole('button', { name: 'K1 · Spule · A1–A2 · aus', exact: true }).click()
  await page.getByRole('button', { name: 'Antwort prüfen' }).click()
  await expect(page.getByText('Richtig. Die Verbindung stimmt.')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Richtig. Die Verbindung stimmt.')).toBeVisible()
  await expect(page.getByText('Wie gut konntest du dich erinnern?')).toHaveCount(0)
  await page.getByRole('button', { name: 'Nächste Aufgabe' }).click()
  await page
    .getByText('Der geschlossene K1-Hilfskontakt parallel zu Start.', { exact: true })
    .click()
  await page.getByRole('button', { name: 'Antwort prüfen' }).click()
  await page.getByRole('button', { name: 'Nächste Aufgabe' }).click()
  await page.getByText('K1 bleibt durch den Hilfskontakt angezogen.', { exact: true }).click()
  await page.getByRole('button', { name: 'Antwort prüfen' }).click()
  await page.getByRole('button', { name: 'Sitzung abschließen' }).click()
  await expect(page.getByText('2 von 3 Aufgaben richtig beantwortet.')).toBeVisible()
  await page.goto('./#/fortschritt')
  await expect(
    page
      .getByRole('region', { name: 'Empfehlungen zum Vertiefen' })
      .getByRole('link', { name: /Schütz und Selbsthaltung/ }),
  ).toBeVisible()
  await page.goto('./#/einstellungen')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Sicherung exportieren' }).click()
  const file = await (await download).path()
  const restored = await browser.newContext({ viewport: page.viewportSize() })
  try {
    const target = await restored.newPage()
    await target.goto(new URL('./#/einstellungen', page.url()).href)
    await expect(target.getByText('Offline bereit', { exact: true })).toBeVisible({
      timeout: 20000,
    })
    await target.reload()
    await restored.setOffline(true)
    await target.locator('input[type=file]').setInputFiles(file!)
    await target.getByRole('button', { name: 'Sicherung zusammenführen' }).click()
    await expect(
      target.getByRole('status').filter({ hasText: 'Sicherung zusammengeführt' }),
    ).toBeVisible()
    await target.goto(new URL('./#/lernen?topic=controls', page.url()).href)
    await expect(target.getByRole('button', { name: 'Lektion abgeschlossen' })).toBeDisabled()
    await target.goto(new URL('./#/fortschritt', page.url()).href)
    await expect(
      target.getByRole('heading', { name: 'Spule und Kontakt unterscheiden', exact: true }),
    ).toBeVisible()
    await expect(
      target.getByRole('heading', { name: 'Der Haltezweig übernimmt', exact: true }),
    ).toBeVisible()
  } finally {
    await restored.close()
  }
})
