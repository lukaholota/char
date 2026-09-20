// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { SkillsForm } from "@/lib/components/characterCreator/SkillsForm";
import { findCharacterCreationOptions } from "@/lib/content/creator-content";
import { engEnumSkills } from "@/lib/refs/translation";
import type { BackgroundI, ClassI, RaceI } from "@/lib/types/model-types";

/// Перемикач правил Таші — Radix, а він міряє себе через ResizeObserver, якого в jsdom немає.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

afterEach(cleanup);

const SKILL_LABELS = new Set(engEnumSkills.map((skill) => skill.ukr));

/// Крок мусить давати витратити кожен вибір, який сам же й вимагає: інакше «Далі» лишається
/// вимкненою, а натиснути на кроці вже нічого — гравець замкнений на середині конструктора.
function findLastGateValue(
  race: RaceI,
  selectedClass: ClassI,
  background: BackgroundI,
  extraExistingSkills: string[] = [],
) {
  const onNextDisabledChange = vi.fn();

  render(
    <SkillsForm
      race={race}
      selectedClass={selectedClass}
      background={background}
      formId="skills-audit"
      extraExistingSkills={extraExistingSkills}
      onNextDisabledChange={onNextDisabledChange}
    />
  );

  spendEverySkillChoice();
  cleanup();

  return onNextDisabledChange.mock.calls.at(-1)?.[0];
}

function collectGroupSkillLabels() {
  return screen
    .getAllByRole("button")
    .map((button) => (button.textContent || "").trim())
    .filter((label) => SKILL_LABELS.has(label));
}

function spendEverySkillChoice() {
  const alreadyClicked = new Set<Element>();

  for (let guard = 0; guard < 40; guard += 1) {
    const next = screen.getAllByRole("button").find((button) => {
      if (alreadyClicked.has(button) || (button as HTMLButtonElement).disabled) return false;
      return SKILL_LABELS.has((button.textContent || "").trim());
    });
    if (!next) return;
    alreadyClicked.add(next);
    fireEvent.click(next);
  }
}

describe.each(["RULES_2014", "RULES_2024"] as const)("крок навичок, %s", (ruleset) => {
  const options = findCharacterCreationOptions(ruleset);
  const races = options.races as unknown as RaceI[];
  const classes = options.classes as unknown as ClassI[];
  const backgrounds = options.backgrounds as unknown as BackgroundI[];

  const plainRace = races.find((race) => !race.skillProficiencies) ?? races[0];
  const plainClass = classes[0];
  const plainBackground = backgrounds.find((bg) => Array.isArray(bg.skillProficiencies)) ?? backgrounds[0];

  it("кожен клас дає витратити свої вибори навичок", () => {
    const stuck = classes.filter(
      (cls) => findLastGateValue(plainRace, cls, plainBackground) !== false
    );
    expect(stuck.map((cls) => cls.name)).toEqual([]);
  });

  it("кожна передісторія дає витратити свої вибори навичок", () => {
    const stuck = backgrounds.filter(
      (bg) => findLastGateValue(plainRace, plainClass, bg) !== false
    );
    expect(stuck.map((bg) => bg.name)).toEqual([]);
  });

  it("кожна раса дає витратити свої вибори навичок", () => {
    const stuck = races.filter(
      (race) => findLastGateValue(race, plainClass, plainBackground) !== false
    );
    expect(stuck.map((race) => race.name)).toEqual([]);
  });
});

/// Навички класу видають не лише на цьому кроці: раса, передісторія й риса забирають їх
/// раніше, і список класу може зійти нанівець. Вимога «обери два» поверх порожнього списку —
/// замкнений крок.
describe("крок навичок не вимагає більше, ніж є що натиснути", () => {
  const options = findCharacterCreationOptions("RULES_2024");
  const barbarian = options.classes.find((cls) => cls.name === "BARBARIAN_2024") as unknown as ClassI;
  const background = options.backgrounds.find((bg) => bg.name === "NOBLE_2024") as unknown as BackgroundI;
  const race = options.races.find((r) => r.name === "HUMAN_2024") as unknown as RaceI;

  it("коли риса забрала всі навички класу, крок пускає далі", () => {
    const allBarbarianSkills = [
      "ANIMAL_HANDLING", "ATHLETICS", "INTIMIDATION", "NATURE", "PERCEPTION", "SURVIVAL",
    ];

    expect(findLastGateValue(race, barbarian, background, allBarbarianSkills)).toBe(false);
  });

  it("коли лишилася одна навичка з двох, крок чекає на неї й пускає після вибору", () => {
    const allButOne = ["ANIMAL_HANDLING", "ATHLETICS", "INTIMIDATION", "NATURE", "PERCEPTION"];

    expect(findLastGateValue(race, barbarian, background, allButOne)).toBe(false);
  });
});

/// Раса зі своїм переліком мусить при ньому лишитися: кентавр обирає одну навичку з чотирьох
/// названих, а не з усіх вісімнадцяти. Розгортати «будь-яка» можна тільки там, де контент
/// переліку не дає взагалі.
describe("крок навичок показує саме расовий перелік", () => {
  const options = findCharacterCreationOptions("RULES_2014");
  const findRace = (name: string) => options.races.find((race) => race.name === name) as unknown as RaceI;
  const plainClass = options.classes[0] as unknown as ClassI;
  const plainBackground = options.backgrounds.find(
    (bg) => Array.isArray(bg.skillProficiencies)
  ) as unknown as BackgroundI;

  const renderFor = (race: RaceI) => {
    render(
      <SkillsForm
        race={race}
        selectedClass={plainClass}
        background={plainBackground}
        formId="skills-options"
        onNextDisabledChange={vi.fn()}
      />
    );
  };

  it("людоящір дає обирати лише зі своїх шести навичок", () => {
    renderFor(findRace("LIZARDFOLK_MPMM"));

    const shown = new Set(collectGroupSkillLabels());
    expect(shown.has("Поводження з тваринами")).toBe(true);
    expect(shown.has("Магія")).toBe(false);
  });

  it("кенку, якому переліку не завели, отримує всі навички", () => {
    renderFor(findRace("KENKU_MPMM"));

    expect(new Set(collectGroupSkillLabels()).has("Магія")).toBe(true);
  });
});
