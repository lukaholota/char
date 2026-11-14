// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { SkillsForm } from "@/lib/components/characterCreator/SkillsForm";
import { findCharacterCreationOptions } from "@/lib/content/creator-content";
import { engEnumSkills } from "@/lib/refs/translation";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import type { BackgroundI, ClassI, RaceI } from "@/lib/types/model-types";

/// Перемикач правил Таші — Radix, а він міряє себе через ResizeObserver, якого в jsdom немає.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

/// Node 25 має власний `localStorage` без `setItem`, і він перекриває jsdom-івський.
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

afterEach(cleanup);

const SKILL_LABELS = new Set(engEnumSkills.map((skill) => skill.ukr));

/// Крок мусить давати витратити кожен вибір, який сам же й вимагає: інакше «Далі» лишається
/// вимкненою, а натиснути на кроці вже нічого — гравець замкнений на середині конструктора.
function findLastGateValue(
  race: RaceI,
  selectedClass: ClassI,
  background: BackgroundI,
  extraExistingSkills: string[] = [],
  raceChoiceSelections: Record<string, number> = {},
) {
  return auditSkillsStep(race, selectedClass, background, extraExistingSkills, raceChoiceSelections).gate;
}

/// Повертає не лише стан воріт, а й скільки кнопок навичок крок узагалі показав. Без цього
/// «застряг» не відрізнити від «жодної кнопки не знайшлося»: перше — баг кроку, друге —
/// розбіжність підпису з `engEnumSkills`, і лагодяться вони в різних місцях.
function auditSkillsStep(
  race: RaceI,
  selectedClass: ClassI,
  background: BackgroundI,
  extraExistingSkills: string[] = [],
  raceChoiceSelections: Record<string, number> = {},
) {
  const onNextDisabledChange = vi.fn();
  usePersFormStore.setState({ formData: { raceChoiceSelections } as never, isHydrated: true });

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

  const skillButtons = collectGroupSkillLabels().length;
  const allButtons = screen.getAllByRole("button").length;
  spendEverySkillChoice();
  cleanup();

  return { gate: onNextDisabledChange.mock.calls.at(-1)?.[0], skillButtons, allButtons };
}

function describeStuck(name: string, audit: ReturnType<typeof auditSkillsStep>): string {
  return `${name} (ворота: ${String(audit.gate)}, кнопок навичок: ${audit.skillButtons} з ${audit.allButtons})`;
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
      if (button.querySelector(".lucide-check")) return false;
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
    const stuck = classes
      .map((cls) => ({ cls, audit: auditSkillsStep(plainRace, cls, plainBackground) }))
      .filter(({ audit }) => audit.gate !== false);
    expect(stuck.map(({ cls, audit }) => describeStuck(cls.name, audit))).toEqual([]);
  });

  it("кожна передісторія дає витратити свої вибори навичок", () => {
    const stuck = backgrounds
      .map((bg) => ({ bg, audit: auditSkillsStep(plainRace, plainClass, bg) }))
      .filter(({ audit }) => audit.gate !== false);
    expect(stuck.map(({ bg, audit }) => describeStuck(bg.name, audit))).toEqual([]);
  });

  it("кожна раса дає витратити свої вибори навичок", () => {
    const stuck = races
      .map((race) => ({ race, audit: auditSkillsStep(race, plainClass, plainBackground) }))
      .filter(({ audit }) => audit.gate !== false);
    expect(stuck.map(({ race, audit }) => describeStuck(race.name, audit))).toEqual([]);
  });
});

type RaceSetup = { label: string; race: RaceI; skills: unknown; raceChoiceSelections: Record<string, number> };

function listRaceSetupsWithSkills(races: RaceI[]): RaceSetup[] {
  return races.flatMap((race) => [
    ...(race.skillProficiencies ? [{ label: race.name, race, skills: race.skillProficiencies, raceChoiceSelections: {} }] : []),
    ...(race.raceChoiceOptions ?? [])
      .filter((option) => option.skillProficiencies)
      .map((option) => ({
        label: `${race.name} (${option.optionName})`,
        race,
        skills: option.skillProficiencies,
        raceChoiceSelections: { [option.choiceGroupName]: option.optionId },
      })),
  ]);
}

/// Крок бачить лише набір навичок джерела, тож однакові набори перевіряємо один раз — інакше обхід пар триває хвилини.
function keepOnePerSkillSet<T>(sources: T[], readSkills: (source: T) => unknown): T[] {
  return [...new Map(sources.map((source) => [JSON.stringify(readSkills(source)), source])).values()];
}

const PAIR_SWEEP_TIMEOUT_MS = 300_000;

/// Кожна вісь окремо проходить, а замикає перетин: навичку з опції раси вже дала передісторія
/// (ельф 2024 з «Гострими чуттями» на Аналіз поведінки + Послушник — репорт 2026-11-13).
describe.each(["RULES_2014", "RULES_2024"] as const)("крок навичок, %s: пари джерел", (ruleset) => {
  const options = findCharacterCreationOptions(ruleset);
  const races = options.races as unknown as RaceI[];
  const classes = options.classes as unknown as ClassI[];
  const backgrounds = keepOnePerSkillSet(options.backgrounds as unknown as BackgroundI[], (bg) => bg.skillProficiencies);
  const raceSetups = keepOnePerSkillSet(listRaceSetupsWithSkills(races), (setup) => setup.skills);
  const plainRace = races.find((race) => !race.skillProficiencies) ?? races[0];

  it("жодна пара раса × передісторія не замикає крок", () => {
    const stuck = raceSetups.flatMap((setup) => backgrounds
      .filter((bg) => findLastGateValue(setup.race, classes[0], bg, [], setup.raceChoiceSelections) !== false)
      .map((bg) => `${setup.label} × ${bg.name}`));
    expect(stuck).toEqual([]);
  }, PAIR_SWEEP_TIMEOUT_MS);

  it("жодна пара раса × клас не замикає крок", () => {
    const stuck = raceSetups.flatMap((setup) => classes
      .filter((cls) => findLastGateValue(setup.race, cls, backgrounds[0], [], setup.raceChoiceSelections) !== false)
      .map((cls) => `${setup.label} × ${cls.name}`));
    expect(stuck).toEqual([]);
  }, PAIR_SWEEP_TIMEOUT_MS);

  it("жодна пара клас × передісторія не замикає крок", () => {
    const stuck = classes.flatMap((cls) => backgrounds
      .filter((bg) => findLastGateValue(plainRace, cls, bg) !== false)
      .map((bg) => `${cls.name} × ${bg.name}`));
    expect(stuck).toEqual([]);
  }, PAIR_SWEEP_TIMEOUT_MS);
});

/// Чернетка повертає вибори попереднього візиту на крок. Коли джерело відтоді змінилося, старий
/// вибір не має ні замикати крок, ні доїхати до персонажа.
describe("крок навичок: вибори з чернетки після зміни джерел", () => {
  const options = findCharacterCreationOptions("RULES_2024");
  const races = options.races as unknown as RaceI[];
  const classes = options.classes as unknown as ClassI[];
  const backgrounds = options.backgrounds as unknown as BackgroundI[];
  const elf = races.find((race) => race.name === "ELF_2024")!;
  const keenSenses = Object.fromEntries(
    (elf.raceChoiceOptions ?? []).filter((option) => option.skillProficiencies).map((option) => [option.optionName, option]),
  );
  const fighter = classes.find((cls) => cls.name === "FIGHTER_2024")!;
  const soldier = backgrounds.find((bg) => bg.name === "SOLDIER_2024")!;

  function renderStepWithDraft(draft: Record<string, unknown>) {
    usePersFormStore.setState({ formData: draft as never, isHydrated: true });
    render(<SkillsForm race={elf} selectedClass={fighter} background={soldier} formId="skills-draft" />);
    return (label: string) => screen.getAllByRole("button").find((button) => (button.textContent || "").trim().startsWith(label)) as HTMLButtonElement;
  }

  it("навички попереднього класу не лишаються обраними", () => {
    const findSkillButton = renderStepWithDraft({
      raceChoiceSelections: { [keenSenses["Виживання"].choiceGroupName]: keenSenses["Виживання"].optionId },
      basicChoices: { race: [], background: [], selectedClass: ["ARCANA", "RELIGION"] },
    });

    expect(findSkillButton("Історія").disabled).toBe(false);
  });

  it("зайві навички попереднього класу не зупиняють «Далі»", async () => {
    renderStepWithDraft({
      raceChoiceSelections: { [keenSenses["Виживання"].choiceGroupName]: keenSenses["Виживання"].optionId },
      basicChoices: { race: [], background: [], selectedClass: ["ACROBATICS", "STEALTH", "DECEPTION", "HISTORY"] },
    });

    fireEvent.submit(document.getElementById("skills-draft")!);

    await waitFor(() => {
      const saved = usePersFormStore.getState().formData.skillsSchema as { basicChoices: { selectedClass: string[] } } | undefined;
      expect(saved?.basicChoices.selectedClass).toEqual(["ACROBATICS", "HISTORY"]);
    });
  });

  it("навичка покинутої опції раси не блокує її в класі", () => {
    const findSkillButton = renderStepWithDraft({
      raceChoiceSelections: { [keenSenses["Виживання"].choiceGroupName]: keenSenses["Виживання"].optionId },
      choiceOptions: { [keenSenses["Аналіз поведінки"].optionId]: ["INSIGHT"] },
    });

    expect(findSkillButton("Аналіз поведінки").disabled).toBe(false);
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
