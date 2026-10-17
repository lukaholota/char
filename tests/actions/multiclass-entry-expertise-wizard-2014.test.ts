// @vitest-environment jsdom
import { createElement } from "react";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BackgroundCategory, Classes, Races, SkillProficiencyType, Skills } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createCharacter } from "@/lib/actions/character";
import { getLevelUpInfo } from "@/lib/actions/levelup";
import LevelUpWizard from "@/lib/components/levelUp/LevelUpWizard";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { engEnumSkills } from "@/lib/refs/translation";
import { minimalForm } from "../helpers/build-form";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.hoisted(() => {
  const entries = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    writable: true,
    value: {
      get length() {
        return entries.size;
      },
      key: (index: number) => [...entries.keys()][index] ?? null,
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => void entries.set(key, String(value)),
      removeItem: (key: string) => void entries.delete(key),
      clear: () => entries.clear(),
    } satisfies Storage,
  });
});

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/char/1/levelup",
  useSearchParams: () => new URLSearchParams(),
}));

import { auth } from "@/lib/auth";

vi.setConfig({ testTimeout: 120_000 });

beforeEach(resetUserData);
afterEach(cleanup);
afterAll(disconnectDatabase);

async function createSoldierFighter() {
  const owner = await prisma.user.create({ data: { email: `multiclass-expertise-wizard-${Math.random()}@holota.family`, name: "Owner" } });
  vi.mocked(auth).mockResolvedValue({ user: { email: owner.email } } as never);
  const [race, fighter, background] = await Promise.all([raceByName(Races.HUMAN_2014), classByName(Classes.FIGHTER_2014), backgroundByName(BackgroundCategory.SOLDIER)]);
  const created = await createCharacter(minimalForm({ raceId: race.raceId, classId: fighter.classId, backgroundId: background.backgroundId }));
  if ("error" in created) throw new Error(created.error);
  return created.persId;
}

async function openWizardOnMulticlass(className: Classes) {
  const persId = await createSoldierFighter();
  const info = await getLevelUpInfo(persId);
  if ("error" in info) throw new Error(info.error);
  const target = await classByName(className);
  render(createElement(LevelUpWizard, { info }));
  act(() => usePersFormStore.getState().updateFormData({ levelUpPath: "MULTICLASS", classId: target.classId }));
  return persId;
}

function listStepTitles() {
  const progress = screen.getByText("Ваш прогрес").closest("aside");
  return [...(progress?.querySelectorAll("button") ?? [])].map((step) => step.textContent?.replace(/\d+$/, ""));
}

function translateSkill(skill: string) {
  return engEnumSkills.find((entry) => entry.eng === skill)?.ukr ?? skill;
}

function clickButton(name: string) {
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${name}`) }));
}

async function readSkills(persId: number) {
  const rows = await prisma.persSkill.findMany({ where: { persId }, select: { name: true, proficiencyType: true } });
  return {
    proficient: rows.filter((row) => row.proficiencyType === SkillProficiencyType.PROFICIENT).map((row) => row.name).sort(),
    expertise: rows.filter((row) => row.proficiencyType === SkillProficiencyType.EXPERTISE).map((row) => row.name).sort(),
  };
}

describe("майстер підвищення: вхід у Пройдисвіта мультикласом 2014", () => {
  it("питає експертизу, пропонує щойно взяту навичку класу й зберігає обидві", async () => {
    const persId = await openWizardOnMulticlass(Classes.ROGUE_2014);
    const [known] = (await readSkills(persId)).proficient;

    expect(listStepTitles()).toEqual(["Початок", "Огляд", "Навички", "Експертиза", "HP", "Підтвердження"]);

    clickButton("Далі");
    clickButton("Далі");
    clickButton(translateSkill(Skills.STEALTH));
    clickButton("Далі");
    expect(screen.getByRole("heading", { name: "Експертиза" })).toBeTruthy();
    clickButton(translateSkill(known));
    clickButton(translateSkill(Skills.STEALTH));
    clickButton("Далі");
    clickButton("Середнє");
    clickButton("Далі");
    clickButton("Підвищити рівень");

    await waitFor(async () => expect((await readSkills(persId)).expertise).toEqual([known, Skills.STEALTH].sort()), { timeout: 30_000 });
  });

  it("у Слідопита й Барда кроку «Експертиза» немає", async () => {
    await openWizardOnMulticlass(Classes.RANGER_2014);
    expect(listStepTitles()).not.toContain("Експертиза");
    cleanup();

    await openWizardOnMulticlass(Classes.BARD_2014);
    expect(listStepTitles()).not.toContain("Експертиза");
  });
});
