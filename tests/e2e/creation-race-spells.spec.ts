import { expect, test } from "@playwright/test";

test("changing Changeling to variant Human keeps spell choices usable", async ({ page }) => {
  await page.goto("/char/create");
  await page.getByRole("searchbox", { name: "Пошук раси" }).fill("Changeling");
  await page.getByTestId("race-CHANGELING_MPMM").click();
  await page.getByRole("button", { name: "Далі →" }).click();
  await page.getByTestId("class-BARD_2014").click();
  await page.getByRole("button", { name: "Далі →" }).click();
  await expect(page.getByTestId("creation-step-spells")).toHaveAttribute("data-active", "true");
  const choices = page.locator('button[aria-pressed]');
  await choices.nth(0).click();
  await choices.nth(1).click();
  await expect(choices.nth(2)).toBeDisabled();
  await page.getByTestId("creation-step-race").click();
  await page.getByRole("searchbox", { name: "Пошук раси" }).fill("");
  await page.getByTestId("race-HUMAN_2014").click();
  await page.getByRole("button", { name: "Далі →" }).click();
  await page.getByTestId("race-variant-HUMAN_VARIANT").click();
  await page.getByRole("button", { name: "Далі →" }).click();
  await page.getByRole("button", { name: "Далі →" }).click();
  await expect(page.getByTestId("creation-step-spells")).toHaveAttribute("data-active", "true");
  await expect(page.getByTestId("creation-step-feat")).toBeVisible();
  await expect(page.locator('button[aria-pressed="true"]')).toHaveCount(2);
  await expect(page.getByText("Усі заклинання обрано. Щоб змінити вибір, натисніть на позначене заклинання.")).toBeVisible();
  await expect(page.locator('button[aria-pressed="false"]:disabled').first()).toBeVisible();
  await page.locator('button[aria-pressed="true"]').first().click();
  await expect(page.locator('button[aria-pressed="false"]:not(:disabled)').first()).toBeVisible();
});

test("custom lineage adds a feat choice in 2014 creation", async ({ page }) => {
  await page.goto("/char/create");
  await page.getByRole("searchbox", { name: "Пошук раси" }).fill("Своя раса");
  await page.getByTestId("race-CUSTOM_LINEAGE_TCE").click();
  await expect(page.getByTestId("creation-step-feat")).toBeVisible();
});
