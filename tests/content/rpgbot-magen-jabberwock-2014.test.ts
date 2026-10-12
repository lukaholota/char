import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { getCreatureByIdOrSlug } from "@/lib/bestiaryData";
import { stripRuleTermAnchors } from "@/lib/term-link";

const source = JSON.parse(readFileSync("data/2014/optimization-entity-supplements.json", "utf8"));
const delivered = JSON.parse(readFileSync("src/lib/generated/optimization-entity-supplements-2014.json", "utf8"));
const names = ["Demos Magen", "Galvan Magen", "Jabberwock"];
const prose = (name: string) => {
  const creature = getCreatureByIdOrSlug(name, "RULES_2014")!;
  return stripRuleTermAnchors([creature.specialAbilities, creature.actions, creature.legendaryActions].join(" "));
};

it.each(names)("delivers the complete original numeric statblock and action inventory of %s only in 2014", (name) => {
  const record = source.creatures.find((item: { entry: { nameEng: string } }) => item.entry.nameEng === name);
  expect(record).toBeDefined();
  const original = JSON.parse(readFileSync(record.source.file.replace("data/5etools/raw", "tests/fixtures/5etools/raw-slices"), "utf8")).monster.find((item: { name: string }) => item.name === name);
  expect(record.source.book).toBe(original.source);
  expect(record.source.page).toBe(original.page);
  expect(delivered.creatures.find((item: { nameEng: string }) => item.nameEng === name)).toEqual(record.entry);
  const creature = getCreatureByIdOrSlug(name, "RULES_2014")!;
  expect(creature.hp).toBe(`${original.hp.average} (${original.hp.formula.replace("d", "к")})`);
  expect(creature.ac).toMatch(new RegExp(`^${typeof original.ac[0] === "number" ? original.ac[0] : original.ac[0].ac}\\b`));
  expect(creature.challenge).toBe(original.cr);
  for (const [field, key] of [["strength", "str"], ["dexterity", "dex"], ["constitution", "con"], ["intelligence", "int"], ["wisdom", "wis"], ["charisma", "cha"]] as const) {
    expect(creature[field]).toBe(`${original[key]} (${Math.floor((original[key] - 10) / 2) >= 0 ? "+" : ""}${Math.floor((original[key] - 10) / 2)})`);
  }
  for (const [field, key] of [["walkSpeed", "walk"], ["flySpeed", "fly"], ["climbSpeed", "climb"], ["swimSpeed", "swim"], ["burrowSpeed", "burrow"]] as const) {
    expect(creature[field] ?? null).toBe(original.speed[key]?.number ?? original.speed[key] ?? null);
  }
  const body = prose(name);
  for (const action of [...original.trait, ...original.action, ...(original.legendary ?? [])]) {
    const heading = action.name.replace(/ \{@recharge \d+\}| \(\d+\/Day\)| \(\d+ Actions\)/g, "");
    expect(body).toContain(`{{${heading}}}`);
    const text = JSON.stringify(action.entries);
    for (const match of text.matchAll(/\{@(?:hit|dc) (\d+)\}/g)) expect(body).toContain(match[1]);
    for (const match of text.matchAll(/\{@damage ([^}]+)\}/g)) expect(body).toContain(match[1].replace("d", "к"));
  }
  expect(getCreatureByIdOrSlug(name, "RULES_2024")).toBeUndefined();
});

it("keeps magen death harmless, equipment intact, and the two different metal-armour modifiers", () => {
  for (const name of names.slice(0, 2)) {
    expect(prose(name)).toContain("нешкідливому спалаху");
    expect(prose(name)).toContain("залишаючи все, що він носив або тримав");
    expect(prose(name)).toContain("не потребує повітря, їжі, пиття або сну");
    expect(prose(name)).toContain("перевагу на ряткидки проти заклинань та інших магічних ефектів");
    expect(getCreatureByIdOrSlug(name, "RULES_2014")!.languages).toContain("але не може розмовляти");
  }
  expect(prose("Demos Magen")).toContain("дві ближні атаки");
  const galvan = prose("Galvan Magen");
  expect(galvan).toContain("дві атаки Shocking Touch");
  expect(galvan).toContain("перевагу на кидок атаки, якщо ціль носить металевий обладунок");
  expect(galvan).toContain("з перешкодою, якщо вона носить металевий обладунок");
  expect(galvan).toContain("завдовжки 60 футів і завширшки 5 футів");
  expect(galvan).toContain("перезаряджання 5–6");
  expect(galvan).toContain("половини цієї шкоди");
  expect(getCreatureByIdOrSlug("Galvan Magen", "RULES_2014")!.speed).toContain("Паріння");
});

it("keeps Jabberwock hearing, d4 outcomes, exact regeneration and tracking limits", () => {
  const body = prose("Jabberwock");
  for (const fragment of ["якщо не має стану Недієздатний", "починає свій хід у межах 30 футів", "може чути", "ряткидок Харизми СК 18", "реакції до початку свого наступного ходу", "кидає 1к4", "1–2: істота нічого не робить", "витрачає все своє переміщення", "у випадковому напрямку", "одну ближню атаку проти випадкової істоти", "немає видимої істоти", "3 рази на день", "відновлює 10 очок здоровʼя на початку", "зазнає рубальної шкоди", "не діє на початку його наступного ходу", "починає свій хід із 0 очок здоровʼя й не регенерує", "поранив протягом останніх 24 годин", "на тому самому плані існування"]) expect(body).toContain(fragment);
  const creature = getCreatureByIdOrSlug("Jabberwock", "RULES_2014")!;
  expect(creature.damageVulnerability).toBe("рубальна від vorpal sword");
  expect(creature.savingThrows).toBe("Сила +10, Спритність +6, Статура +10, Інтелект +2, Мудрість +3, Харизма +5");
  expect(creature.skills).toBe("Уважність +8");
  expect(creature.senses).toBe("Істинний зір 120 футів, пасивна Уважність 18");
});

it("keeps Jabberwock gaze blindness restriction and legendary timing without inventing wing flight", () => {
  const body = prose("Jabberwock");
  for (const fragment of ["дві атаки Rend", "якщо Jabberwock не має стану Засліплений", "завдовжки 120 футів і завширшки 5 футів", "половини цієї шкоди", "перезаряджання 5–6", "3 легендарні дії", "лише наприкінці ходу іншої істоти", "відновлює витрачені легендарні дії на початку свого ходу", "коштує 2 дії", "коштує 3 дії", "в межах 10 футів", "стан Повалений"]) expect(body.toLowerCase()).toContain(fragment.toLowerCase());
  expect(getCreatureByIdOrSlug("Jabberwock", "RULES_2014")!.legendaryActions).not.toContain("половини швидкості польоту");
});
