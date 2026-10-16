// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { RaceVariant } from "@prisma/client";

import SkillsForm from "@/lib/components/characterCreator/SkillsForm";
import { findSubclassSkillGroup, findSubclassSkillPicks, settleSubclassPicks } from "@/lib/components/characterCreator/subclass-skill-picks";
import { NextStepHintProvider } from "@/lib/components/wizard/next-step-hint";
import type { Skill } from "@/lib/types/enums";
import { findCharacterCreationOptions } from "@/lib/content/creator-content";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import type { BackgroundI, ClassI, RaceI } from "@/lib/types/model-types";

/// BUG-O49-SUBCLASS-SKILL-CHOICE-CREATION: ручний конструктор 2014 не мав групи навички підкласу,
/// і клірики доменів миру, порядку й природи виходили без навички, яку дає риса 1-го рівня.

afterEach(cleanup);

vi.hoisted(() => {
  class NoopResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(globalThis, "ResizeObserver", { configurable: true, writable: true, value: NoopResizeObserver });

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

const CLERIC_2014 = findCharacterCreationOptions("RULES_2014").classes.find((cls) => cls.name === "CLERIC_2014") as unknown as ClassI;
const CLERIC_2024 = findCharacterCreationOptions("RULES_2024").classes.find((cls) => cls.name === "CLERIC_2024") as unknown as ClassI;
const HUMAN = { raceId: 4, name: "HUMAN_2014", ruleset: "RULES_2014", skillProficiencies: null, raceChoiceOptions: [] } as unknown as RaceI;
const CRIMINAL = { backgroundId: 1, name: "CRIMINAL", ruleset: "RULES_2014", skillProficiencies: ["DECEPTION", "STEALTH"] } as unknown as BackgroundI;
const NOBLE = { ...CRIMINAL, name: "NOBLE", skillProficiencies: ["HISTORY", "PERSUASION"] } as unknown as BackgroundI;
const CLASS_PICKS = ["HISTORY", "MEDICINE"];
const SUBCLASS_GROUP = "Навички за підклас";

function findSubclassId(cls: ClassI, name: string): number {
  const subclass = cls.subclasses.find((entry) => entry.name === name);
  if (!subclass) throw new Error(`${cls.name} has no ${name}`);
  return subclass.subclassId;
}

type StepSetup = {
  cls?: ClassI; subclass: string; subclassPicks?: string[]; classPicks?: string[]; isTasha?: boolean; tashaChoices?: string[];
  race?: RaceI; raceVariant?: RaceVariant; background?: BackgroundI;
};

function renderSkillsStep({ cls = CLERIC_2014, subclass, subclassPicks, classPicks = CLASS_PICKS, isTasha = false, tashaChoices, race = HUMAN, raceVariant, background = CRIMINAL }: StepSetup) {
  const onNextDisabledChange = vi.fn();
  const onHintChange = vi.fn();
  usePersFormStore.setState({
    formData: {
      classId: cls.classId,
      raceId: race.raceId,
      backgroundId: background.backgroundId,
      subclassId: findSubclassId(cls, subclass),
      isTasha,
      ...(tashaChoices ? { tashaChoices } : {}),
      basicChoices: { race: [], selectedClass: classPicks, background: [], ...(subclassPicks ? { subclass: subclassPicks } : {}) },
    } as never,
    isHydrated: true,
  });
  const view = render(
    <NextStepHintProvider onHintChange={onHintChange}>
      <SkillsForm race={race} raceVariant={raceVariant} selectedClass={cls} background={background} formId="skills-form" onNextDisabledChange={onNextDisabledChange} />
    </NextStepHintProvider>,
  );
  return {
    view,
    isNextBlocked: () => onNextDisabledChange.mock.calls.at(-1)?.[0] as boolean,
    findHint: () => onHintChange.mock.calls.at(-1)?.[1] as string | null,
  };
}

function findGroup(title: string): HTMLElement {
  return screen.getByText(title).closest<HTMLElement>(".rounded-lg")!;
}

function listGroupOptions(title: string): string[] {
  return within(findGroup(title)).getAllByRole("button").map((button) => (button.textContent ?? "").replace("(вже обрано)", "").trim());
}

function pickInGroup(title: string, skill: string) {
  fireEvent.click(within(findGroup(title)).getByRole("button", { name: new RegExp(skill) }));
}

describe("2014 manual builder: the skill a first-level domain lets the cleric choose", () => {
  it.each([
    ["PEACE_DOMAIN", ["Аналіз поведінки", "Виступ", "Переконання"]],
    ["ORDER_DOMAIN", ["Залякування", "Переконання"]],
    ["NATURE_DOMAIN", ["Поводження з тваринами", "Природа", "Виживання"]],
  ])("%s offers its own options and one pick", (subclass, options) => {
    renderSkillsStep({ subclass });
    expect(listGroupOptions(SUBCLASS_GROUP)).toEqual(options);
    expect(within(findGroup(SUBCLASS_GROUP)).getByText(/Залишок/).textContent).toBe("Залишок: 1");
  });

  it("keeps «Далі» blocked until the domain skill is picked", () => {
    const { isNextBlocked, findHint } = renderSkillsStep({ subclass: "PEACE_DOMAIN" });
    expect(isNextBlocked()).toBe(true);
    expect(findHint()).toBe("Оберіть ще 1 навичку підкласу.");
    pickInGroup(SUBCLASS_GROUP, "Переконання");
    expect(isNextBlocked()).toBe(false);
  });

  it("stays blocked and says where to free a skill when other groups took every domain option", () => {
    const { isNextBlocked, findHint } = renderSkillsStep({ subclass: "ORDER_DOMAIN", classPicks: ["HISTORY", "PERSUASION"], raceVariant: { name: "HUMAN_VARIANT" } as RaceVariant });
    pickInGroup("Навички за расу", "Залякування");
    expect(isNextBlocked()).toBe(true);
    expect(findHint()).toBe("Оберіть ще 1 навичку підкласу. Підходящі навички вже обрано в інших групах: зніміть одну з них там.");
  });

  it("saves an already owned domain skill when race and background already give every option", async () => {
    const halfOrc = { ...HUMAN, name: "HALF_ORC", skillProficiencies: ["INTIMIDATION"] } as unknown as RaceI;
    const { view, isNextBlocked } = renderSkillsStep({ subclass: "ORDER_DOMAIN", classPicks: ["INSIGHT", "MEDICINE"], race: halfOrc, background: NOBLE });
    expect(isNextBlocked()).toBe(false);
    fireEvent.submit(view.container.querySelector("form")!);
    await waitFor(() => expect(usePersFormStore.getState().formData.skillsSchema?.basicChoices.subclass).toEqual(["INTIMIDATION"]));
  });

  it("saves the pick as the subclass choice and in the flat skill list", async () => {
    const { view } = renderSkillsStep({ subclass: "PEACE_DOMAIN" });
    pickInGroup(SUBCLASS_GROUP, "Переконання");
    fireEvent.submit(view.container.querySelector("form")!);
    await waitFor(() => expect(usePersFormStore.getState().formData.skillsSchema?.basicChoices.subclass).toEqual(["PERSUASION"]));
    expect(usePersFormStore.getState().formData.skills).toEqual(expect.arrayContaining(["PERSUASION", "HISTORY", "MEDICINE", "DECEPTION", "STEALTH"]));
  });

  it("drops a pick left from another domain and asks again", async () => {
    const { view, isNextBlocked } = renderSkillsStep({ subclass: "PEACE_DOMAIN", subclassPicks: ["INTIMIDATION"] });
    expect(within(findGroup(SUBCLASS_GROUP)).getByText(/Залишок/).textContent).toBe("Залишок: 1");
    expect(isNextBlocked()).toBe(true);
    pickInGroup(SUBCLASS_GROUP, "Виступ");
    fireEvent.submit(view.container.querySelector("form")!);
    await waitFor(() => expect(usePersFormStore.getState().formData.skillsSchema?.basicChoices.subclass).toEqual(["PERFORMANCE"]));
    expect(usePersFormStore.getState().formData.skills).not.toContain("INTIMIDATION");
  });

  it("locks a domain skill picked in another group", () => {
    renderSkillsStep({ subclass: "PEACE_DOMAIN", raceVariant: { name: "HUMAN_VARIANT" } as RaceVariant });
    pickInGroup("Навички за расу", "Переконання");
    expect(within(findGroup(SUBCLASS_GROUP)).getByRole("button", { name: /Переконання/ })).toHaveProperty("disabled", true);
  });

  it("shows Arcana Domain's Arcana as owned and never pickable again", async () => {
    const { view } = renderSkillsStep({ subclass: "ARCANA_DOMAIN", raceVariant: { name: "HUMAN_VARIANT" } as RaceVariant });
    expect(screen.queryByText(SUBCLASS_GROUP)).toBeNull();
    expect(within(findGroup("Фіксовані навички")).getByText("Магія")).toBeTruthy();
    expect(within(findGroup("Навички за расу")).getByRole("button", { name: /Магія/ })).toHaveProperty("disabled", true);
    pickInGroup("Навички за расу", "Природа");
    fireEvent.submit(view.container.querySelector("form")!);
    await waitFor(() => expect(usePersFormStore.getState().formData.skills).toEqual(expect.arrayContaining(["ARCANA", "NATURE"])));
    expect(usePersFormStore.getState().formData.skillsSchema?.basicChoices.subclass).toEqual([]);
  });

  it("adds no group for Knowledge Domain, whose skills come with Expertise options", () => {
    const { isNextBlocked } = renderSkillsStep({ subclass: "KNOWLEDGE_DOMAIN" });
    expect(screen.queryByText(SUBCLASS_GROUP)).toBeNull();
    expect(isNextBlocked()).toBe(false);
  });

  it("adds no group for a domain without a skill feature", () => {
    renderSkillsStep({ subclass: "LIFE_DOMAIN" });
    expect(screen.queryByText(SUBCLASS_GROUP)).toBeNull();
  });

  it("keeps the group under Tasha rules and locks the pick in the free pool", () => {
    renderSkillsStep({ subclass: "PEACE_DOMAIN", isTasha: true });
    pickInGroup(SUBCLASS_GROUP, "Переконання");
    const poolButton = screen.getAllByRole("button", { name: /Переконання/ }).find((button) => !findGroup(SUBCLASS_GROUP).contains(button));
    expect(poolButton).toHaveProperty("disabled", true);
  });

  it("under Tasha rules asks for the domain skill as well as the free pool", () => {
    const { findHint } = renderSkillsStep({ subclass: "PEACE_DOMAIN", isTasha: true });
    expect(findHint()).toContain("Оберіть ще 1 навичку підкласу.");
    pickInGroup(SUBCLASS_GROUP, "Переконання");
    expect(findHint() ?? "").not.toContain("підкласу");
  });

  it("under Tasha rules locks a domain skill taken in the free pool, not one the background would have given", () => {
    renderSkillsStep({ subclass: "PEACE_DOMAIN", isTasha: true, background: NOBLE, tashaChoices: ["INSIGHT"] });
    const group = within(findGroup(SUBCLASS_GROUP));
    expect(group.getByRole("button", { name: /Аналіз поведінки/ })).toHaveProperty("disabled", true);
    expect(group.getByRole("button", { name: /Переконання/ })).toHaveProperty("disabled", false);
  });

  it("ignores a skill feature that comes at a later subclass level, like the server", () => {
    const peaceId = findSubclassId(CLERIC_2014, "PEACE_DOMAIN");
    const atLevelSix = (entry: ClassI["subclasses"][number]) => ({ ...entry, features: entry.features.map((feature) => ({ ...feature, levelGranted: 6 })) });
    const laterPeace = { ...CLERIC_2014, subclasses: CLERIC_2014.subclasses.map((entry) => (entry.subclassId === peaceId ? atLevelSix(entry) : entry)) } as ClassI;
    expect(findSubclassSkillPicks(CLERIC_2014, peaceId).count).toBe(1);
    expect(findSubclassSkillPicks(laterPeace, peaceId)).toEqual({ count: 0, options: [], fixed: [] });
  });
});

describe("subclass skill picks kept for saving", () => {
  const peace = { count: 1, options: ["INSIGHT", "PERFORMANCE", "PERSUASION"] as Skill[], fixed: [] };

  it("drops a pick that another source now grants and asks for an open one", () => {
    expect(findSubclassSkillGroup(peace, ["PERSUASION"], ["PERSUASION"])).toEqual({ options: peace.options, chosen: [], required: 1 });
  });

  it("keeps one copy of a repeated pick and no more than the feature gives", () => {
    expect(findSubclassSkillGroup({ ...peace, count: 2 }, ["INSIGHT", "INSIGHT", "PERFORMANCE", "PERSUASION"], []).chosen).toEqual(["INSIGHT", "PERFORMANCE"]);
  });

  it("saves nothing for a subclass without a skill choice", () => {
    expect(settleSubclassPicks({ count: 0, options: [], fixed: ["ARCANA"] }, ["PERSUASION"], [])).toEqual([]);
  });
});

describe("2024 builder: subclass skills wait for level 3", () => {
  it("shows no subclass group for a 2024 cleric", () => {
    renderSkillsStep({ cls: CLERIC_2024, subclass: "PEACE_DOMAIN" });
    expect(screen.queryByText(SUBCLASS_GROUP)).toBeNull();
  });

  it("ignores even a first-level skill feature when the class is 2024", () => {
    renderSkillsStep({ cls: { ...CLERIC_2014, ruleset: "RULES_2024" } as ClassI, subclass: "PEACE_DOMAIN" });
    expect(screen.queryByText(SUBCLASS_GROUP)).toBeNull();
  });
});
