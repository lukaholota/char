import { expect, test } from "@playwright/test";

test.use({ hasTouch: true, isMobile: true });

test("мобільна модалка заклинання вміщується в екран", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/spells?q=звʼязок з іншим планом");

  await page.locator("div.glass-panel.group.cursor-pointer:visible")
    .filter({ hasText: "Звʼязок з іншим планом [Contact Other Plane]" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  const width = await dialog.evaluate((element) => ({
    visible: element.clientWidth,
    content: element.scrollWidth,
    page: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(width.content).toBeLessThanOrEqual(width.visible);
  expect(width.page).toBeLessThanOrEqual(width.viewport);
  const heading = dialog.locator("h2:not(.sr-only)");
  expect(await heading.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  expect(await dialog.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe("none");
});

test("мобільне меню містить заклинання", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/spells");

  await page.getByRole("button", { name: "Меню" }).click();
  await expect(page.getByRole("link", { name: "Заклинання", exact: true })).toBeVisible();
});

test("нижня навігація відкриває персонажів одним тапом без меню", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.addStyleTag({ content: "nextjs-portal { pointer-events: none !important; }" });

  const charactersLink = page.locator('nav a[aria-label="Персонажі"]:visible');
  await charactersLink.tap();
  await expect(page).toHaveURL(/\/char\/(?:home|create)(?:\?.*)?$/, { timeout: 15000 });
});

test("картка персонажів на головній відкривається одним тапом", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.addStyleTag({ content: "nextjs-portal { pointer-events: none !important; }" });

  await page.locator('main a[href$="/char/home"]:visible').first().tap();
  await expect(page).toHaveURL(/\/char\/(?:home|create)(?:\?.*)?$/, { timeout: 15000 });
});
