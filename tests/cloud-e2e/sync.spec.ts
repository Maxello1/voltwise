import { test, expect, type Page } from '@playwright/test'

async function login(page: Page) {
  // Only the browser authorization redirect and outbound GitHub identity are synthetic.
  // State, PKCE exchange, cookies, Worker, D1 and browser persistence use production paths.
  await page.route('https://github.com/login/oauth/authorize?*', async (route) => {
    const state = new URL(route.request().url()).searchParams.get('state')
    await route.fulfill({
      status: 302,
      headers: {
        location: `http://127.0.0.1:8787/api/auth/callback?code=synthetic&state=${state}`,
      },
    })
  })
  await page.goto('./#/einstellungen')
  await page.getByRole('button', { name: 'Mit GitHub anmelden' }).click()
  await expect(page.getByText(/Mit GitHub angemeldet/)).toBeVisible()
}
async function enable(page: Page) {
  const consent = page.getByRole('checkbox', { name: /Ich möchte meinen vorhandenen/ })
  await consent.focus()
  await page.keyboard.press('Space')
  await expect(consent).toBeChecked()
  await page.getByRole('button', { name: 'Synchronisierung einschalten' }).click()
  await expect(page.getByText(/Letzte Synchronisierung:/)).toBeVisible()
}
test('disables queued synchronization after an offline reopen without requiring a session response', async ({
  page,
  context,
}) => {
  await login(page)
  await enable(page)
  await page.goto('./#/ueben?trainer=dc&code=000000')
  await expect(page.getByText('Offline bereit', { exact: true })).toBeVisible({ timeout: 20000 })
  await context.setOffline(true)
  await page.getByRole('button', { name: 'Rechenrunde starten' }).click()
  await page.getByLabel('Deine Antwort in A').fill('10 mA')
  await page.getByRole('button', { name: 'Antwort prüfen' }).click()
  await expect(page.getByRole('button', { name: 'Nächste Aufgabe' })).toBeVisible()
  await page.goto('./#/einstellungen')
  await page.reload()
  await expect(
    page.getByText('Offline – Änderungen werden später übertragen', { exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Synchronisierung ausschalten' }).click()
  await expect(page.getByText('Nur lokal gespeichert', { exact: true })).toBeVisible()
  const uploads: string[] = []
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/v1/events')
      uploads.push(request.url())
  })
  await page.clock.install()
  await context.setOffline(false)
  await page.clock.runFor(2500)
  expect(uploads).toEqual([])
  await page.reload()
  await expect(page.getByText('Nur lokal gespeichert', { exact: true })).toBeVisible()
  await expect(page.getByText(/1 Änderungen ausstehend/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Synchronisierung einschalten' })).toBeDisabled()
})

test('an expired browser session offers login again and preserves local data and consent', async ({
  page,
}) => {
  await login(page)
  await enable(page)
  await page.evaluate(async () => {
    const session = (await (await fetch('/api/auth/session', { cache: 'no-store' })).json()) as {
      csrf: string
    }
    await fetch('/api/auth/logout', { method: 'POST', headers: { 'X-CSRF-Token': session.csrf } })
  })
  await page.getByRole('button', { name: 'Jetzt synchronisieren' }).click()
  await expect(page.getByRole('button', { name: 'Mit GitHub anmelden' })).toBeVisible()
  await expect(page.getByText(/Lokale Änderungen bleiben gespeichert/)).toBeVisible()
  await page.getByRole('button', { name: 'Mit GitHub anmelden' }).click()
  await expect(page.getByText(/Mit GitHub angemeldet/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Synchronisierung ausschalten' })).toBeVisible()
})

test('offline attempt uploads on reconnect and a second browser restores it without activating the other session', async ({
  page,
  context,
  browser,
}, info) => {
  await page.goto('./#/ueben?concept=units')
  await expect(page.getByText('Offline bereit', { exact: true })).toBeVisible({ timeout: 20000 })
  await context.setOffline(true)
  await page.getByRole('button', { name: 'Konzept gezielt üben' }).click()
  await page.getByText('Ampere (A)', { exact: true }).click()
  await page.getByRole('button', { name: 'Antwort prüfen' }).click()
  await expect(page.getByRole('button', { name: 'Gut Sicher erinnert' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Gut Sicher erinnert' })).toBeVisible()
  await context.setOffline(false)
  await login(page)
  await expect(page.getByRole('button', { name: 'Synchronisierung einschalten' })).toBeDisabled()
  await enable(page)
  await page.getByRole('button', { name: 'Dunkel', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  for (const width of [320, 375, 390, 430]) {
    await page.setViewportSize({ width, height: 900 })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true)
  }
  await page.screenshot({
    path: `.cache/cloud-sync-${info.project.name}-dark.png`,
    fullPage: true,
    animations: 'disabled',
  })
  await page.locator('.cloud-card').screenshot({
    path: `.cache/cloud-card-${info.project.name}-dark.png`,
    animations: 'disabled',
    style: '.topbar,.mobile-nav,.skip-link{visibility:hidden!important}',
  })
  const second = await browser.newContext({ viewport: { width: 390, height: 844 } })
  try {
    const restored = await second.newPage()
    await login(restored)
    await enable(restored)
    await restored.goto('./#/fortschritt')
    await expect(
      restored.getByRole('heading', { name: 'Du kannst mehr, als gestern.' }),
    ).toBeVisible()
    await restored.goto('./#/ueben')
    await expect(restored.getByRole('button', { name: 'Gut Sicher erinnert' })).toHaveCount(0)
    await restored.goto('./#/einstellungen')
    const download = restored.waitForEvent('download')
    await restored.getByRole('button', { name: 'Sicherung exportieren' }).click()
    await (await download).saveAs(`.cache/cloud-restored-${info.project.name}.json`)
    await restored.getByRole('button', { name: 'Geräte und Sitzungen anzeigen' }).click()
    await expect(restored.getByText(/aktive Sitzungen/).first()).toBeVisible()
    await restored.screenshot({
      path: `.cache/cloud-sync-${info.project.name}-light.png`,
      fullPage: true,
      animations: 'disabled',
    })
    await restored.getByRole('button', { name: 'Abmelden', exact: true }).click()
    await expect(restored.getByRole('button', { name: 'Mit GitHub anmelden' })).toBeVisible()
    await restored.goto('./#/fortschritt')
    await expect(
      restored.getByRole('heading', { name: 'Du kannst mehr, als gestern.' }),
    ).toBeVisible()
  } finally {
    await second.close()
  }
  await page.goto('./#/ueben')
  await expect(page.getByRole('button', { name: 'Gut Sicher erinnert' })).toBeVisible()
  await context.setOffline(true)
  await page.getByRole('button', { name: 'Gut Sicher erinnert' }).click()
  await page.goto('./#/einstellungen')
  await expect(
    page.getByText('Offline – Änderungen werden später übertragen', { exact: true }),
  ).toBeVisible()
  await expect(page.getByText(/1 Änderungen ausstehend/)).toBeVisible()
  await context.setOffline(false)
  await expect(page.getByText('0 Änderungen ausstehend', { exact: true })).toBeVisible({
    timeout: 20000,
  })
  // Authenticated API responses are neither shell fallbacks nor entries in Cache Storage.
  const cacheUrls = await page.evaluate(async () => {
    const urls: string[] = []
    for (const name of await caches.keys())
      for (const request of await (await caches.open(name)).keys()) urls.push(request.url)
    return urls
  })
  expect(cacheUrls.some((url) => new URL(url).pathname.startsWith('/api/'))).toBe(false)
  await context.setOffline(true)
  expect(
    await page.evaluate(async () => {
      try {
        await fetch('/api/auth/session')
        return false
      } catch {
        return true
      }
    }),
  ).toBe(true)
})
