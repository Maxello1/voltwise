import { expect, test, type Page } from '@playwright/test'

const fit = async (page: Page) =>
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true)
async function setRange(page: Page, label: string, value: number) {
  await page.getByRole('slider', { name: label, exact: true }).fill(String(value))
}
async function theme(page: Page, value: 'light' | 'dark') {
  await page.goto('./#/einstellungen')
  await page
    .getByRole('button', { name: value === 'light' ? 'Hell' : 'Dunkel', exact: true })
    .click()
}
test('AC controls keep waveforms, cursor, RMS and phasors synchronized; R/L/C obey frequency', async ({
  page,
  context,
}) => {
  await page.goto('./#/labor?lab=ac')
  await expect(page.getByText('Offline bereit', { exact: true })).toBeVisible({ timeout: 20000 })
  await expect(
    page.getByRole('img', { name: 'Sinusdiagramm mit Zeitcursor', exact: true }),
  ).toBeVisible()
  await expect(page.getByText('T = 20 ms', { exact: true })).toBeVisible()
  await expect(page.locator('.lab-readings')).toContainText('100,431 V')
  const vector = page.locator('.voltage-vector path').first()
  const before = await vector.getAttribute('d')
  await setRange(page, 'Anfangswinkel φ [°]', 90)
  expect(await vector.getAttribute('d')).not.toBe(before)
  await page.getByRole('slider', { name: 'Anfangswinkel φ [°]', exact: true }).focus()
  await page.keyboard.press('ArrowLeft')
  await expect(page.getByRole('slider', { name: 'Anfangswinkel φ [°]', exact: true })).toHaveValue(
    '89',
  )
  await page.getByRole('checkbox', { name: 'Zweite Spannung vergleichen' }).check()
  await expect(
    page.getByRole('img', { name: 'Sinusdiagramm mit Zeitcursor', exact: true }),
  ).toHaveCount(2)
  await page.getByRole('button', { name: 'Spule', exact: true }).click()
  await expect(page.getByTestId('ac-results')).toContainText('31,416 Ω')
  await expect(page.getByTestId('ac-results')).toContainText('0,764 A')
  await setRange(page, 'Frequenz [Hz]', 100)
  await expect(page.getByTestId('ac-results')).toContainText('0,382 A')
  await page.getByRole('button', { name: 'Kondensator', exact: true }).click()
  await expect(page.getByTestId('ac-results')).toContainText('1,508 A')
  await expect(page.getByTestId('ac-results')).toContainText('-36,191 var')
  await page.getByRole('combobox', { name: 'Vorhersage zum Strom' }).selectOption('double')
  await page.getByRole('button', { name: 'Vorhersage prüfen', exact: true }).click()
  await expect(page.locator('.prediction-box')).toContainText('Richtig.')
  await page.getByRole('button', { name: 'Widerstand', exact: true }).click()
  await expect(page.getByTestId('ac-results')).toContainText('0,2 A')
  await expect(page.getByTestId('ac-results')).toContainText('4,8 W')
  await page.getByRole('button', { name: 'Zeigeraddition', exact: true }).click()
  await expect(page.locator('.lab-readings')).toContainText('30,414 V')
  await expect(page.locator('.lab-readings')).toContainText('25,285°')
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Den Sinus begreifen.' })).toBeVisible()
  await page.goto('./#/fortschritt')
  await expect(page.getByText('Bearbeitete Aufgaben', { exact: true }).locator('..')).toContainText(
    '0',
  )
})

test('motor geometry can pause, step, reverse, identify parts and compare all excitation types', async ({
  page,
}) => {
  await page.goto('./#/labor?lab=motor')
  await expect(page.getByTestId('motor-results')).toContainText('0,00192 N·m')
  await page.getByRole('button', { name: 'Neutrale Lage 90°', exact: true }).click()
  await expect(page.getByTestId('motor-results')).toContainText('neutrale Umschaltlage')
  await expect(page.locator('.force-vector')).toHaveCount(0)
  await setRange(page, 'Rotorwinkel α [°]', 180)
  await expect(page.getByTestId('motor-results')).toContainText('0,00192 N·m')
  await page.getByRole('checkbox', { name: 'Stromwender aktiv' }).uncheck()
  await expect(page.getByTestId('motor-results')).toContainText('-0,00192 N·m')
  await page.getByRole('button', { name: 'Magnetpole umkehren' }).click()
  await expect(page.getByTestId('motor-results')).toContainText('0,00192 N·m')
  await page.getByRole('button', { name: 'Stromwender / Kommutator', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.selection-note')).toContainText('Vertauscht die Verbindung')
  await page.getByRole('checkbox', { name: 'Beschriftung zum Selbsttest verbergen' }).check()
  await expect(page.getByRole('button', { name: 'Bauteil 6', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Bauteil 6', exact: true }).focus()
  await page.keyboard.press('Space')
  await expect(page.locator('.selection-note')).toContainText('Stromwender')
  for (const type of [
    'Fremderregung',
    'Nebenschluss',
    'Reihenschluss',
    'Doppelschluss',
    'Permanentmagnet',
  ]) {
    await page.getByRole('combobox', { name: 'Erregungsart', exact: true }).selectOption(type)
    await expect(page.getByRole('img', { name: `Erregung: ${type}`, exact: true })).toBeVisible()
  }
  await setRange(page, 'Gegenspannung Ui [V]', 0)
  await expect(page.locator('.formula').last()).toContainText('12 A')
  await fit(page)
})

test('SPS lessons show the complete active-low oracle and exact boundary without a lab', async ({
  page,
}) => {
  await page.goto('./#/lernen?topic=plc-generator')
  await expect(page.locator('.school-table tbody tr')).toHaveCount(16)
  await expect(page.locator('.boundary-row')).toHaveCount(2)
  for (const bits of ['1000', '0101']) {
    const row = page
      .locator('.school-table tbody tr')
      .filter({ has: page.getByRole('rowheader', { name: bits, exact: true }) })
    await expect(row.locator('td').last()).toHaveText('0')
    await expect(row).toContainText('10 · Grenze')
  }
  await expect(page.locator('.school-table tbody tr').filter({ hasText: '0110' })).toContainText(
    '9',
  )
  await expect(page.locator('.school-table tbody tr').filter({ hasText: '0100' })).toContainText(
    '12',
  )
  await page.getByRole('combobox', { name: 'Thema direkt wählen' }).selectOption('plc-fup')
  await expect(
    page.getByRole('img', { name: 'Theoriebeispiel: kombinatorischer FUP' }),
  ).toBeVisible()
  await page.getByRole('combobox', { name: 'Thema direkt wählen' }).selectOption('plc-workflow')
  await expect(page.locator('.lesson')).toContainText('V15.1')
  await expect(page.locator('.lesson')).toContainText('OB1')
  await expect(page.getByRole('button', { name: 'Als gelesen markieren' })).toBeEnabled()
  await fit(page)
})

test('a structured application saves only on submission and resumes graded feedback offline', async ({
  page,
  context,
}) => {
  await page.goto('./#/ueben?aufgabe=school-wave-build-v1')
  await page.getByRole('button', { name: 'Aufgabe starten', exact: true }).click()
  await setRange(page, 'Scheitelwert [V]', 100)
  await setRange(page, 'Frequenz [Hz]', 50)
  await setRange(page, 'Anfangswinkel [°]', 90)
  await expect(page.getByText('Offline bereit', { exact: true })).toBeVisible({ timeout: 20000 })
  await page.getByRole('button', { name: 'Antwort prüfen' }).click()
  await expect(page.getByText('Richtig. Die Verbindung stimmt.')).toBeVisible()
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByText('Richtig. Die Verbindung stimmt.')).toBeVisible()
  await expect(page.getByText('Deine Antwort:', { exact: false })).toContainText(
    '100 V; 50 Hz; 90°',
  )
  await expect(page.getByRole('button', { name: 'Gut Sicher erinnert' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Sitzung abschließen' }).click()
  await expect(page.getByText('1 von 1 Aufgaben richtig beantwortet.')).toBeVisible()
  await page.goto('./#/ueben?aufgabe=school-loop-chain-v1')
  await page.getByRole('button', { name: 'Aufgabe starten', exact: true }).click()
  await page.getByRole('textbox', { name: 'Kraft je Leiter', exact: true }).fill('48 mN')
  await page.getByRole('textbox', { name: 'Schleifendrehmoment', exact: true }).fill('1,92 mN·m')
  await page.getByRole('button', { name: 'Antwort prüfen' }).click()
  await expect(page.getByText('Richtig. Die Verbindung stimmt.')).toBeVisible()
})

test('school round links preserve codes, older active work and all ten AC exercises', async ({
  page,
}) => {
  await page.goto('./#/ueben?trainer=ac&code=123456')
  await expect(page.locator('.school-round-preview li')).toHaveCount(10)
  await page.getByRole('button', { name: '10 Aufgaben starten', exact: true }).click()
  await expect(page.getByText('AUFGABE 1 VON 10')).toBeVisible()
  await page.goto('./#/labor?lab=motor&code=654321')
  await page.getByRole('button', { name: '4 Aufgaben starten', exact: true }).click()
  await expect(page.getByText('AUFGABE 1 VON 10')).toBeVisible()
  await page.reload()
  await expect(page.getByText('AUFGABE 1 VON 10')).toBeVisible()
})

test('cursor and vector endpoints retain physical coordinates after zoom and pan', async ({
  page,
}) => {
  await page.goto('./#/labor?lab=ac')
  const waveform = page.getByRole('img', { name: 'Sinusdiagramm mit Zeitcursor', exact: true })
  await waveform.scrollIntoViewIfNeeded()
  const canvas = waveform.locator('..')
  await canvas.getByRole('button', { name: 'Vergrößern', exact: true }).click()
  const timePoint = await waveform.evaluate((element) => {
    const p = new DOMPoint(385, 145).matrixTransform((element as SVGSVGElement).getScreenCTM()!)
    return { x: p.x, y: p.y }
  })
  await page.mouse.click(timePoint.x, timePoint.y)
  await expect(page.getByRole('slider', { name: 'Zeitcursor [ms]', exact: true })).toHaveValue('20')
  await page.goto('./#/ueben?aufgabe=school-vector-place-v1')
  await page.getByRole('button', { name: 'Aufgabe starten', exact: true }).click()
  const phasor = page.getByRole('img', { name: 'Zeigerdiagramm', exact: true })
  await phasor.scrollIntoViewIfNeeded()
  await phasor.locator('..').getByRole('button', { name: 'Vergrößern', exact: true }).click()
  await phasor
    .locator('..')
    .getByRole('button', { name: 'Ansicht nach rechts', exact: true })
    .click()
  const endpoint = await phasor.evaluate((element) => {
    const p = new DOMPoint(200 + 27.5 * 3, 150 - ((15 * Math.sqrt(3)) / 2) * 3).matrixTransform(
      (element as SVGSVGElement).getScreenCTM()!,
    )
    return { x: p.x, y: p.y }
  })
  await page.mouse.click(endpoint.x, endpoint.y)
  await page.getByRole('button', { name: 'Antwort prüfen', exact: true }).click()
  await expect(page.getByText('Richtig. Die Verbindung stimmt.')).toBeVisible()
})

test('both animations progress deterministically and pause without changing the model', async ({
  page,
}) => {
  await page.clock.install()
  await page.goto('./#/labor?lab=motor')
  const rotor = page.getByRole('slider', { name: 'Rotorwinkel α [°]', exact: true })
  await page.getByRole('button', { name: 'Drehung starten', exact: true }).click()
  await page.clock.runFor(800)
  expect(Number(await rotor.inputValue())).toBeGreaterThan(20)
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  const paused = await rotor.inputValue()
  await page.clock.runFor(800)
  await expect(rotor).toHaveValue(paused)
  await page.getByRole('button', { name: 'Wechselstromlabor', exact: true }).click()
  await page.getByRole('button', { name: 'Animation starten', exact: true }).click()
  await page.clock.runFor(800)
  const cursor = page.getByRole('slider', { name: 'Zeitcursor [ms]', exact: true })
  expect(Number(await cursor.inputValue())).toBeGreaterThan(3)
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  const time = await cursor.inputValue()
  await page.clock.runFor(800)
  await expect(cursor).toHaveValue(time)
})

test('reduced motion keeps both animations stopped and preserves keyboard steps', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('./#/labor?lab=motor')
  await expect(page.getByRole('button', { name: 'Drehung starten', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Schritt +15°', exact: true }).click()
  await expect(page.getByRole('slider', { name: 'Rotorwinkel α [°]', exact: true })).toHaveValue(
    '15',
  )
  await page.getByRole('button', { name: 'Wechselstromlabor', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Animation starten', exact: true })).toBeDisabled()
  const initial = await page
    .getByRole('slider', { name: 'Zeitcursor [ms]', exact: true })
    .inputValue()
  await page.getByRole('button', { name: 'Schritt +T/80', exact: true }).click()
  expect(
    await page.getByRole('slider', { name: 'Zeitcursor [ms]', exact: true }).inputValue(),
  ).not.toBe(initial)
})

test('both laboratories and grouped theory fit 320–430 px in both themes', async ({ page }) => {
  for (const scheme of ['light', 'dark'] as const) {
    await theme(page, scheme)
    for (const width of [320, 375, 390, 430]) {
      await page.setViewportSize({ width, height: 900 })
      for (const route of [
        'labor?lab=ac',
        'labor?lab=motor',
        'lernen?topic=plc-fup',
        'ueben?trainer=ac&code=000000',
      ]) {
        await page.goto(`./#/${route}`)
        await expect(page.locator('main h1')).toBeVisible()
        await fit(page)
      }
    }
  }
})

for (const state of [
  'ac-R-light',
  'ac-L-dark',
  'ac-C-light',
  'phasors-dark',
  'motor-0-light',
  'motor-90-dark',
  'sps-theory-light',
]) {
  test(`school visual reference: ${state}`, async ({ page }, info) => {
    test.skip(
      process.platform !== 'win32',
      'Windows image references; functional checks run on every platform.',
    )
    await theme(page, state.endsWith('dark') ? 'dark' : 'light')
    if (state.startsWith('ac-')) {
      await page.goto('./#/labor?lab=ac')
      await page
        .getByRole('button', {
          name: state.includes('-R-')
            ? 'Widerstand'
            : state.includes('-L-')
              ? 'Spule'
              : 'Kondensator',
          exact: true,
        })
        .click()
    } else if (state.startsWith('motor')) {
      await page.goto('./#/labor?lab=motor')
      if (state.includes('-90-'))
        await page.getByRole('button', { name: 'Neutrale Lage 90°', exact: true }).click()
    } else if (state.startsWith('phasors')) {
      await page.goto('./#/labor?lab=ac')
      await page.getByRole('button', { name: 'Zeigeraddition', exact: true }).click()
    } else await page.goto('./#/lernen?topic=plc-fup')
    await page.addStyleTag({
      content: '.mobile-nav, .topbar, .skip-link { visibility: hidden !important; }',
    })
    const target = state.startsWith('sps')
      ? page.locator('.plc-theory')
      : page.locator('.lab-main').first()
    await expect(target).toHaveScreenshot(`${state}.png`, {
      animations: 'disabled',
      maxDiffPixelRatio: 0.005,
    })
    if (['ac-L-dark', 'motor-0-light', 'sps-theory-light'].includes(state))
      await target.screenshot({
        path: `docs/screenshots/school-${state}-${info.project.name}.png`,
        animations: 'disabled',
      })
  })
}
