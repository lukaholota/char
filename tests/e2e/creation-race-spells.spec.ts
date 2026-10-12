import { expect, test, type Page } from "@playwright/test";

async function pickEveryRequiredSpell(page: Page) {
  const next = page.getByRole("button", { name: "Далі →" });
  await expect(page.locator("button[aria-pressed]").first()).toBeVisible({ timeout: 60_000 });
  for (let pick = 0; pick < 10 && (await next.isDisabled()); pick += 1) {
    await page.locator('button[aria-pressed="false"]:not(:disabled)').first().dispatchEvent("click");
  }
  await expect(next).toBeEnabled();
}

async function openSpellsStepOfBard(page: Page) {
  await page.goto("/char/create");
  await expect(page.getByTestId("class-BARD_2014")).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("class-BARD_2014").dispatchEvent("click");
  await page.evaluate(() => {
    const draft = JSON.parse(localStorage.getItem("dnd-pers-form") ?? "null");
    draft.state.currentStep = 6;
    localStorage.setItem("dnd-pers-form", JSON.stringify(draft));
  });
  await page.reload();
  await expect(page.getByTestId("creation-step-spells")).toHaveAttribute("data-active", "true");
}

test("changing Changeling to variant Human keeps spell choices usable", async ({ page }) => {
  test.setTimeout(120_000);
  await openSpellsStepOfBard(page);
  await pickEveryRequiredSpell(page);
  const pickedCount = await page.locator('button[aria-pressed="true"]').count();
  await page.getByTestId("creation-step-race").click();
  await page.getByRole("searchbox", { name: "Пошук раси" }).fill("Changeling");
  await page.getByTestId("race-CHANGELING_MPMM").click();
  await page.getByTestId("creation-step-spells").click();
  await expect(page.locator('button[aria-pressed="true"]')).toHaveCount(pickedCount);
  await page.getByTestId("creation-step-race").click();
  await page.getByRole("searchbox", { name: "Пошук раси" }).fill("");
  await page.getByTestId("race-HUMAN_2014").click();
  await page.getByRole("button", { name: "Далі →" }).click();
  await page.getByTestId("race-variant-HUMAN_VARIANT").click();
  await page.getByTestId("creation-step-spells").click();
  await expect(page.getByTestId("creation-step-spells")).toHaveAttribute("data-active", "true");
  await expect(page.getByTestId("creation-step-feat")).toBeVisible();
  await expect(page.locator('button[aria-pressed="true"]')).toHaveCount(pickedCount);
  await expect(page.getByText("Усі заклинання обрано. Щоб змінити вибір, натисніть на позначене заклинання.").first()).toBeVisible();
  await expect(page.locator('button[aria-pressed="false"]:disabled').first()).toBeVisible();
  await page.locator('button[aria-pressed="true"]').first().dispatchEvent("click");
  await expect(page.locator('button[aria-pressed="false"]:not(:disabled)').first()).toBeVisible();
});

test("custom lineage adds a feat choice in 2014 creation", async ({ page }) => {
  await page.goto("/char/create");
  await page.getByTestId("class-BARBARIAN_2014").click();
  await page.getByRole("button", { name: "Далі →" }).click();
  await page.getByRole("searchbox", { name: "Пошук раси" }).fill("Своя раса");
  await page.getByTestId("race-CUSTOM_LINEAGE_TCE").click();
  await expect(page.getByTestId("creation-step-feat")).toBeVisible();
});
