import { expect, test, type Page } from '@playwright/test'

async function begin(page: Page, level: number, symptom: string) {
  await page.goto(`./#/fehlersuche?stufe=${level}`)
  await page
    .locator('.diagnostic-case')
    .filter({ hasText: symptom })
    .getByRole('button', { name: 'Fall untersuchen' })
    .click()
  await expect(page.locator('.diagnostic-session')).toBeVisible()
}
async function measure(page: Page, red: string, black: string) {
  const log = page.getByRole('list', { name: 'Messprotokoll' })
  const before = await log.locator('li').count()
  await page.getByLabel('Rot (+)', { exact: true }).selectOption(red)
  await page.getByLabel('Schwarz (−)', { exact: true }).selectOption(black)
  await page.getByRole('button', { name: 'Spannung ablesen' }).click()
  await expect(log.locator('li')).toHaveCount(before + 1)
}
async function identify(page: Page, location: string, mechanism: string) {
  await page.getByLabel('Fehlerort', { exact: true }).selectOption(location)
  await expect(page.getByLabel('Fehlerort', { exact: true })).toHaveValue(location)
  await page.getByLabel('Wirkungsweise', { exact: true }).selectOption(mechanism)
  await expect(page.getByLabel('Wirkungsweise', { exact: true })).toHaveValue(mechanism)
}
async function fits(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true)
}

for (const level of [1, 2, 3])
  test(`complete offline diagnosis at level ${level} preserves investigation and submitted feedback`, async ({
    page,
    context,
  }, info) => {
    await page.goto('./')
    await expect(page.getByText('Offline bereit', { exact: true })).toBeVisible({ timeout: 20000 })
    await page.reload()
    await context.setOffline(true)
    await begin(
      page,
      level,
      level === 1
        ? 'Weder Vor noch Rück'
        : level === 2
          ? 'Vor zieht beim Drücken'
          : 'Vor startet nicht.',
    )
    await expect(page.locator('.revealed-fault')).toHaveCount(0)
    await measure(page, 'g1.a', 'g1.b')
    if (level > 1) {
      await page.getByRole('button', { name: 'Vor drücken', exact: true }).focus()
      await page.keyboard.press('Space')
      if (level === 2) {
        await expect(page.locator('[data-component-id="k1-coil"]')).toHaveAttribute(
          'data-state',
          'on',
        )
        await measure(page, 'k1-coil.a', 'k1-coil.b')
        await page.getByRole('button', { name: 'Vor loslassen', exact: true }).click()
        await measure(page, 'k1-coil.a', 'k1-coil.b')
      } else {
        await measure(page, 's1.a', 's1.b')
        await page.getByLabel('Bauteil untersuchen', { exact: true }).selectOption('s1')
        await page.getByRole('button', { name: 'Beobachtung protokollieren' }).click()
        await expect(
          page.getByText('Protokollierte Bauteilzustände (1)', { exact: true }),
        ).toBeVisible()
      }
    }
    await identify(
      page,
      level === 1 ? 'g1' : level === 2 ? 'k1-hold' : 's1',
      level === 1 ? 'no-supply' : level === 2 ? 'holding-path' : 'start-path',
    )
    const count = await page.getByRole('list', { name: 'Messprotokoll' }).locator('li').count()
    await page.goto('./#/schaltplaene?circuit=control-reversing-v1')
    await page.goto('./#/ueben')
    await page.reload()
    await expect(page.getByRole('list', { name: 'Messprotokoll' }).locator('li')).toHaveCount(count)
    await expect(page.getByLabel('Fehlerort', { exact: true })).toHaveValue(
      level === 1 ? 'g1' : level === 2 ? 'k1-hold' : 's1',
    )
    await page.getByRole('button', { name: 'Diagnose abgeben', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Ursache vollständig belegt.' })).toBeVisible()
    await expect(page.getByText('6 / 6 Punkte', { exact: true })).toBeVisible()
    await expect(page.locator('.revealed-fault')).toHaveCount(1)
    await expect(page.getByText('Wie gut konntest du dich erinnern?')).toHaveCount(0)
    await page.reload()
    await expect(page.getByText('6 / 6 Punkte', { exact: true })).toBeVisible()
    await fits(page)
    if (level === 3) {
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.screenshot({
        path: `docs/screenshots/diagnosis-complete-${info.project.name}.png`,
        fullPage: true,
        animations: 'disabled',
      })
    }
    await page.getByRole('button', { name: 'Sitzung abschließen' }).click()
    await page.goto('./#/fortschritt')
    await expect(page.getByText(/1 von 6 Ursachen ohne Hinweis vollständig belegt/)).toBeVisible()
  })

test('missing restart permission recovers through release and remains diagnosable from recorded evidence', async ({
  page,
}) => {
  await begin(page, 3, 'Nach Rückkehr der Versorgung')
  await measure(page, 'g1.a', 'g1.b')
  await measure(page, 'b1.a', 'b1.b')
  await page.getByLabel('Bauteil untersuchen', { exact: true }).selectOption('b1')
  await page.getByRole('button', { name: 'Beobachtung protokollieren' }).click()
  await expect(page.getByText('Protokollierte Bauteilzustände (1)', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Vor loslassen', exact: true }).click()
  await expect(page.locator('[data-component-id="b1"]')).toHaveAttribute('data-state', 'closed')
  await page.getByRole('button', { name: 'Vor drücken', exact: true }).click()
  await expect(page.locator('[data-component-id="k1-coil"]')).toHaveAttribute('data-state', 'on')
  await identify(page, 'b1', 'restart-path')
  await page.getByRole('button', { name: 'Diagnose abgeben', exact: true }).click()
  await expect(page.getByText('6 / 6 Punkte', { exact: true })).toBeVisible()
})

test('incorrect evidence gets partial feedback and the full diagnostic backup restores offline in a fresh profile', async ({
  page,
  browser,
}) => {
  await begin(page, 3, 'Vor startet nicht.')
  await identify(page, 's1', 'start-path')
  await page.getByRole('button', { name: 'Diagnose abgeben', exact: true }).click()
  await expect(page.getByText('4 / 6 Punkte', { exact: true })).toBeVisible()
  await expect(page.getByText('Passende Belege: 0/2', { exact: true })).toBeVisible()
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
    await target.goto(new URL('./#/ueben', page.url()).href)
    await expect(target.getByText('4 / 6 Punkte', { exact: true })).toBeVisible()
    await expect(target.locator('.revealed-fault')).toHaveCount(1)
  } finally {
    await restored.close()
  }
})

test('reversing diagrams fit all requested phone widths in both themes and allow touch pan, pinch and keyboard selection', async ({
  page,
  context,
}, info) => {
  await page.goto('./#/schaltplaene?circuit=control-reversing-v1')
  for (const theme of ['light', 'dark']) {
    if (theme === 'dark') {
      await page.goto('./#/einstellungen')
      await page.getByRole('button', { name: 'Dunkel', exact: true }).click()
      await page.goto('./#/schaltplaene?circuit=control-reversing-v1')
    }
    for (const width of [320, 375, 390, 430]) {
      await page.setViewportSize({ width, height: 850 })
      await fits(page)
      await page.getByRole('button', { name: 'Vergrößern', exact: true }).click()
      const box = await page.getByRole('button', { name: 'Vergrößern', exact: true }).boundingBox()
      expect(box!.width).toBeGreaterThanOrEqual(44)
      expect(box!.height).toBeGreaterThanOrEqual(44)
      await page.getByRole('button', { name: 'Schaltplan einpassen' }).click()
    }
  }
  await page.getByLabel('Schaltplan verstehen', { exact: true }).check()
  await page.getByLabel('Darstellung verstehen', { exact: true }).selectOption('voltage')
  await expect(page.locator('.wire-voltage').first()).toBeVisible()
  await page.getByRole('button', { name: 'Vor drücken', exact: true }).click()
  await expect(page.locator('[data-component-id="k1-coil"]')).toHaveAttribute('data-state', 'on')
  await page.getByRole('button', { name: 'Vor loslassen', exact: true }).click()
  await page.getByRole('button', { name: 'Rück drücken', exact: true }).click()
  await expect(page.locator('[data-component-id="k2-coil"]')).toHaveAttribute('data-state', 'off')
  await page.getByLabel('Bauteil untersuchen', { exact: true }).selectOption('k1-coil')
  const component = page.locator('[data-component-id="k1-coil"]')
  await component.focus()
  await page.keyboard.press('Enter')
  await expect(component).toHaveAttribute('aria-pressed', 'true')
  if (info.project.name === 'mobile') {
    await page.locator('.circuit-svg').scrollIntoViewIfNeeded()
    const svg = page.locator('.circuit-svg'),
      box = (await svg.boundingBox())!
    const x = box.x + box.width / 2,
      y = box.y + box.height / 2
    const client = await context.newCDPSession(page)
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        { x: x - 25, y, id: 1 },
        { x: x + 25, y, id: 2 },
      ],
    })
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        { x: x - 70, y, id: 1 },
        { x: x + 70, y, id: 2 },
      ],
    })
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await expect(page.getByText('100 %', { exact: true })).toHaveCount(0)
    const before = await svg.getAttribute('viewBox')
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y, id: 1 }],
    })
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x - 40, y: y - 30, id: 1 }],
    })
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    expect(await svg.getAttribute('viewBox')).not.toBe(before)
    await client.detach()
  }
  await page.getByRole('button', { name: 'Schaltplan einpassen' }).click()
  await expect(page.getByText('100 %', { exact: true })).toBeVisible()
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({
    path: `docs/screenshots/reversing-dark-${info.project.name}.png`,
    fullPage: true,
    animations: 'disabled',
  })
})

for (const state of ['intact-light', 'running-dark', 'fault-revealed'])
  test(`reversing visual baseline: ${state}`, async ({ page }) => {
    test.skip(
      process.platform !== 'win32',
      'Reviewed Windows baselines; other operating systems run functional checks.',
    )
    if (state === 'fault-revealed') {
      await begin(page, 3, 'Vor startet nicht.')
      await page.getByRole('button', { name: 'Vor drücken', exact: true }).click()
      await identify(page, 's1', 'start-path')
      await page.getByRole('button', { name: 'Diagnose abgeben', exact: true }).click()
      await expect(page.locator('.revealed-fault')).toHaveCount(1)
    } else {
      if (state === 'running-dark') {
        await page.goto('./#/einstellungen')
        await page.getByRole('button', { name: 'Dunkel', exact: true }).click()
      }
      await page.goto('./#/schaltplaene?circuit=control-reversing-v1')
      if (state === 'running-dark') {
        await page.getByRole('button', { name: 'Vor drücken', exact: true }).click()
        await page.getByRole('button', { name: 'Vor loslassen', exact: true }).click()
      }
    }
    await page.addStyleTag({ content: '.mobile-nav { visibility: hidden !important; }' })
    await expect(page.locator('.circuit-viewer')).toHaveScreenshot(`reversing-${state}.png`, {
      animations: 'disabled',
      maxDiffPixelRatio: 0.005,
    })
  })
