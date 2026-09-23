import { expect, test } from "@playwright/test";

// Холодна збірка маршруту в `next dev --turbopack` займає секунди — каталог бестіарію це
// 959 записів. Тридцяти секунд за замовчуванням не вистачає саме на першу навігацію.
test.describe.configure({ timeout: 120_000 });

// KR22.4. Списки каталогів перестали чекати на `searchParams` і стали статичними, тобто сервер
// більше не бачить запиту й малює нефільтрований список. Фільтри з адреси накладає
// `useCatalogUrlSync` після монтування. Ці тести стережуть саме той стик: посилання з фільтром,
// відкрите холодним завантаженням, має спрацювати.

test("посилання з пошуковим запитом фільтрує статичний каталог рас", async ({ page }) => {
  await page.goto("/races?q=ельф");

  const search = page.getByRole("textbox").first();
  await expect(search).toHaveValue("ельф");
});

test("посилання з фільтром переживає перезавантаження сторінки", async ({ page }) => {
  await page.goto("/feats?q=майстер");
  await page.reload();

  const search = page.getByRole("textbox").first();
  await expect(search).toHaveValue("майстер");
});

test("каталог без запиту відкривається порожнім фільтром", async ({ page }) => {
  const response = await page.goto("/bestiary");
  expect(response?.status()).toBe(200);

  const search = page.getByRole("textbox").first();
  await expect(search).toHaveValue("");
});

test("посилання на клас одразу відкриває його модалку на телефоні", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/classes?class=fighter");

  const dialog = page.getByRole("dialog", { name: "Воїн" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("tooltip")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Закрити" }).click();
  await expect(dialog).toBeHidden();
});

test("посилання на істоту відкриває її модалку на телефоні", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/bestiary?creature=goblin");

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Goblin");
  await dialog.getByRole("button", { name: "Закрити" }).click();
  await expect(dialog).toBeHidden();
});
