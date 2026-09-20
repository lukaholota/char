import { describe, expect, it } from "vitest";

import {
  readSeedBackgroundTexts,
  readSeedFeatureTexts,
  readSeedRaceChoiceTexts,
  splitAnchorOnlyChanges,
} from "../../scripts/rule-term-links/rule-term-anchors-2014";

/// KR34.4 — якорі 2014 їдуть у базу вузьким проходом: лише там, де формулювання в базі й у
/// сіді однакове, а різниця — самі посилання. KR25.5 доклав посилання на заклинання й короткий опис.
const seeded = 'Ви можете <a href="/rules/combat#reactions--reactions">реакцією</a> зменшити шкоду.';

describe("KR34.4 — який опис 2014 можна переносити в базу", () => {
  it("переносить опис, коли база відрізняється від сіду лише якорями", () => {
    const stored = new Map([["Uncanny Dodge", "Ви можете реакцією зменшити шкоду."]]);
    expect(splitAnchorOnlyChanges([["Uncanny Dodge", seeded]], stored)).toEqual({
      changed: [["Uncanny Dodge", seeded]],
      textMismatches: [],
    });
  });

  it("не переносить, коли в базі інше формулювання — навіть на одну літеру", () => {
    const stored = new Map([["Uncanny Dodge", "Ви можете реакцією зменшити ушкодження."]]);
    expect(splitAnchorOnlyChanges([["Uncanny Dodge", seeded]], stored)).toEqual({
      changed: [],
      textMismatches: ["Uncanny Dodge"],
    });
  });

  it("мовчить про опис, який уже збігається або якого в базі немає", () => {
    const stored = new Map([["Uncanny Dodge", seeded]]);
    expect(splitAnchorOnlyChanges([["Uncanny Dodge", seeded], ["Missing", seeded]], stored)).toEqual({
      changed: [],
      textMismatches: [],
    });
  });

  it("читає описи фіч із сідів 2014, зокрема з функцій сідування", () => {
    const texts = readSeedFeatureTexts();
    expect(texts.get("Sun Shield")?.description).toContain('<a href="/rules/combat#reactions--reactions">реакцією</a>');
    expect(texts.size).toBeGreaterThan(700);
  });
});

describe("KR25.5 — посилання на заклинання теж їдуть у базу", () => {
  it("різниця лише в посиланні на заклинання — це різниця в якорях, і стара форма /spell/<id> теж", () => {
    const withSpell = 'Ви знаєте <a href="/spells/thaumaturgy">Дивотворство [Thaumaturgy]</a>.';
    const stored = new Map([
      ["Infernal Legacy", "Ви знаєте Дивотворство [Thaumaturgy]."],
      ["Old Link", 'Ви знаєте <a href="/spell/1357">Дивотворство [Thaumaturgy]</a>.'],
    ]);
    expect(splitAnchorOnlyChanges([["Infernal Legacy", withSpell], ["Old Link", withSpell]], stored)).toEqual({
      changed: [["Infernal Legacy", withSpell], ["Old Link", withSpell]],
      textMismatches: [],
    });
  });

  it("читає й короткий опис фічі", () => {
    expect(readSeedFeatureTexts().get("Infernal Legacy")?.shortDescription).toContain('<a href="/spells/hellish-rebuke">Пекельна відсіч [Hellish Rebuke]</a>');
  });
});

describe("O34 — склеєні описи й записи поза таблицею фіч", () => {
  const bonusAction = '<a href="/rules/combat#order-of-combat--bonus-actions">';

  it("читає опис, складений через +, масивом із .join чи константою, як текст для бази", () => {
    const texts = readSeedFeatureTexts();
    expect(texts.get("Rage")?.description).toContain(`лють ${bonusAction}бонусною дією</a>`);
    expect(texts.get("Rage")?.description).toContain("\n");
    expect(texts.get("Sneak Attack")?.description).toContain("condition-incapacitated");
    expect(texts.get("Wild Shape")?.description).toContain(`форми ${bonusAction}бонусною дією</a>`);
  });

  it("читає описи вливань, передісторій і варіантів раси 2014", () => {
    expect(readSeedFeatureTexts().get("Infusion: Enhanced Arcane Focus")?.description).toContain("making-an-attack--cover");
    expect(readSeedBackgroundTexts().get("WILDSPACER")).toContain("advantage-and-disadvantage");
    expect(readSeedRaceChoiceTexts().get("Спадщина кобольдів|Непокора")).toContain("advantage-and-disadvantage");
  });
});
