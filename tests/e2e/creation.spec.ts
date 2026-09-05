import { expect, test, type Page } from "@playwright/test";
import {
  resolveCreationSteps,
  type CreationStepConditions,
} from "@/lib/components/characterCreator/creation-step-resolver";

const noOptionalSteps: CreationStepConditions = {
  hasSubraces: false,
  hasRaceVariants: false,
  hasRaceChoiceOptions: false,
  hasSubclasses: false,
  hasLevelOneSubclassChoices: false,
  hasLevelOneChoices: false,
  hasLevelOneOptionalFeatures: false,
  hasFeatChoice: false,
  hasFeatChoices: false,
  hasBackgroundFeatChoice: false,
  hasBackgroundFeatChoices: false,
  hasExpertiseChoice: false,
  hasLanguageChoice: false,
};

async function expectCreationSteps(page: Page, conditions: Partial<CreationStepConditions>) {
  const expected = resolveCreationSteps({ ...noOptionalSteps, ...conditions }).map((step) => step.id);
  const steps = page.locator("[data-step-id]");

  await expect(steps).toHaveCount(expected.length);
  await expect(
    steps.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-step-id")))
  ).resolves.toEqual(expected);
}

async function selectHumanVariantPath(page: Page) {
  await page.getByTestId("race-HUMAN_2014").click();
  await page.getByRole("button", { name: "Далі →" }).click();
  await page.getByTestId("race-variant-standard").click();
  await page.getByRole("button", { name: "Далі →" }).click();
}

test.describe("Адреса конструктора 2014", () => {
  test("старий /char постійно веде на /char/create і зберігає запит", async ({ page }) => {
    const response = await page.request.get("/char?ruleset=RULES_2014", { maxRedirects: 0 });

    expect(response.status()).toBe(308);
    expect(response.headers()["location"]).toBe("/char/create?ruleset=RULES_2014");
  });

  test("/no-ai/char лишається в режимі без ШІ", async ({ page }) => {
    const response = await page.request.get("/no-ai/char", { maxRedirects: 0 });

    expect(response.status()).toBe(308);
    expect(response.headers()["location"]).toBe("/no-ai/char/create");
  });

  test("/char/create відкриває конструктор без редіректу", async ({ page }) => {
    const response = await page.goto("/char/create");

    expect(response?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe("/char/create");
    await expect(page.locator("[data-step-id]").first()).toBeVisible();
  });
});

test.describe("KR4.5 — constructor step oracle", () => {
  test("core constructor має exact normal order із KR4.2", async ({ page }) => {
    await page.goto("/char/create");

    await expectCreationSteps(page, {});
  });

  test("core constructor блокує forward, доки расу не обрано", async ({ page }) => {
    await page.goto("/char/create");

    await expect(page.getByRole("button", { name: "Далі →" })).toBeDisabled();
  });

  test("Dwarf одразу додає підрасу в ordered oracle", async ({ page }) => {
    await page.goto("/char/create");
    await page.getByTestId("race-DWARF_2014").click();

    await expectCreationSteps(page, { hasSubraces: true });
  });

  test("Dwarf вибір вмикає forward лише після selection", async ({ page }) => {
    await page.goto("/char/create");
    await page.getByTestId("race-DWARF_2014").click();

    await expect(page.getByRole("button", { name: "Далі →" })).toBeEnabled();
  });

  test("Dwarf path переходить на disabled subrace step", async ({ page }) => {
    await page.goto("/char/create");
    await page.getByTestId("race-DWARF_2014").click();
    await page.getByRole("button", { name: "Далі →" }).click();

    await expectCreationSteps(page, { hasSubraces: true });
    await expect(page.getByTestId("creation-step-raceDetails")).toHaveAttribute("data-active", "true");
    await expect(page.getByRole("button", { name: "Далі →" })).toBeDisabled();
  });

  test("Human одразу додає variant branch в ordered oracle", async ({ page }) => {
    await page.goto("/char/create");
    await page.getByTestId("race-HUMAN_2014").click();

    await expectCreationSteps(page, { hasRaceVariants: true });
  });

  test("Human standard variant веде до class step без race-choice branch", async ({ page }) => {
    await page.goto("/char/create");
    await selectHumanVariantPath(page);

    await expectCreationSteps(page, { hasRaceVariants: true });
    await expect(page.getByTestId("creation-step-class")).toHaveAttribute("data-active", "true");
    await expect(page.getByTestId("creation-step-raceChoices")).toHaveCount(0);
  });

  test("Human → Ranger додає level-one class-choice branch в ordered oracle", async ({ page }) => {
    await page.goto("/char/create");
    await selectHumanVariantPath(page);
    await page.getByTestId("class-RANGER_2014").click();

    await expectCreationSteps(page, {
      hasRaceVariants: true,
      hasLevelOneChoices: true,
      hasLanguageChoice: true,
    });
    await expect(page.getByTestId("creation-step-classChoices")).toBeVisible();
  });
});
