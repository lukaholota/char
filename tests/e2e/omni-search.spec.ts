import { expect, test } from "@playwright/test";

/// O36: вікно Cmd+K знає всі каталоги. Публічні маршрути, без входу; серверні фази (персонажі,
/// хоумбрю) на порожній тестовій базі просто мовчать.

async function openSearch(page: import("@playwright/test").Page) {
  await page.keyboard.press("Meta+k");
  return page.getByPlaceholder(/Пошук по платформі/);
}

test("KR36.2: «Покращена зброя» веде на сторінку інфузії", async ({ page }) => {
  await page.goto("/");
  const input = await openSearch(page);
  await input.fill("Покращена зброя");
  const row = page.getByRole("button", { name: /Покращена зброя/ }).first();
  await expect(row).toBeVisible();
  await row.click();
  // Перший запит до сторінки в dev компілює маршрут довше за типові 5 с.
  await expect(page).toHaveURL(/\/infusions\/enhanced-weapon$/, { timeout: 30_000 });
  const response = await page.request.get("/infusions/enhanced-weapon");
  expect(response.status()).toBe(200);
});

test("KR36.3: у 2024 є плитка бастіонів і немає інфузій, у 2014 — навпаки", async ({ page }) => {
  await page.goto("/2024");
  await openSearch(page);
  await expect(page.getByRole("button", { name: "Приміщення бастіону" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Вливання Винахідника" })).toHaveCount(0);
  await page.getByRole("button", { name: "Приміщення бастіону" }).last().click();
  await expect(page).toHaveURL(/\/2024\/bastions$/, { timeout: 30_000 });

  await page.goto("/");
  await openSearch(page);
  await expect(page.getByRole("button", { name: "Вливання Винахідника" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Приміщення бастіону" })).toHaveCount(0);
});

test("KR36.4: «магія» показує рядок «ще K у каталозі», який перемикає фільтр", async ({ page }) => {
  await page.goto("/");
  const input = await openSearch(page);
  await input.fill("магія");
  const more = page.getByRole("button", { name: /^Ще \d+ у каталозі «Заклинання»/ });
  await expect(more).toBeVisible();
  await more.click();
  await expect(page.getByRole("button", { name: /^Ще \d+ у каталозі/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Відкрити каталог" })).toBeVisible();
});

test("KR36.4: рядок квоти на телефоні вміщується в екран", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto("/");
  await page.getByRole("button", { name: "Пошук" }).first().click();
  await page.getByPlaceholder(/Пошук по платформі/).fill("магія");
  const more = page.getByRole("button", { name: /^Ще \d+ у каталозі «Заклинання»/ });
  await more.scrollIntoViewIfNeeded();
  const box = await more.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  await context.close();
});

test("результати пошуку прокручуються у зменшеній видимій області телефону", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto("/");
  await page.getByRole("button", { name: "Пошук" }).first().click();
  await page.getByPlaceholder(/Пошук по платформі/).fill("магія");
  await page.setViewportSize({ width: 390, height: 360 });

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect.poll(() => dialog.evaluate((element) => element.getBoundingClientRect().bottom))
    .toBeLessThanOrEqual(360);

  const results = dialog.locator(".overflow-y-auto").first();
  const scrollTop = await results.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    return element.scrollTop;
  });
  expect(scrollTop).toBeGreaterThan(0);
  await context.close();
});
