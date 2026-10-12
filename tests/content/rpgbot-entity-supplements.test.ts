import { stripRuleTermAnchors } from "@/lib/term-link";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { getAllCreatures, getCreatureByIdOrSlug } from "@/lib/bestiaryData";
import { getWeaponByIdOrSlug } from "@/lib/weaponsData";
import { collectCreatureReferences } from "@/lib/optimization/creature-hydration";
import { collectEntityAliases } from "@/lib/optimization/reference-aliases";
import { collectEntityReferences } from "@/lib/optimization/entity-hydration";
import { hydrateArticleDocument } from "@/lib/optimization/hydration-catalog";
import { parseArticleDocument } from "@/lib/optimization/document";
import { damageTypeTranslations } from "@/lib/refs/translation";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WeaponDetailCard } from "@/components/weapons/WeaponDetailCard";

const supplements = JSON.parse(readFileSync("data/2014/optimization-entity-supplements.json", "utf8"));
const deliveredSupplements = JSON.parse(readFileSync("src/lib/generated/optimization-entity-supplements-2014.json", "utf8"));

it.each(["Brontosaurus", "Stegosaurus", "Cow", "Bore Worm", "Frost Worm", "Kalaraq Quori", "Lesser Star Spawn Emissary", "Cave Bear"])("provides every original stat and action of %s in the native 2014 catalog", (name) => {
  const source = supplements.creatures.find((creature: { entry: { nameEng: string } }) => creature.entry.nameEng === name);
  const original = JSON.parse(readFileSync(source.source.file.replace("data/5etools/raw", "tests/fixtures/5etools/raw-slices"), "utf8")).monster.find((entry: { name: string }) => entry.name === name);
  expect(source.source.book).toBe(original.source);
  expect(source.source.page).toBe(original.page);
  expect(deliveredSupplements.creatures.find((entry: { nameEng: string }) => entry.nameEng === name)).toEqual(source.entry);
  const creature = getCreatureByIdOrSlug(name, "RULES_2014")!;
  expect(creature).toBeDefined();
  expect(getCreatureByIdOrSlug(String(creature.creatureId), "RULES_2014")).toBe(creature);
  expect(creature.hp).toBe(`${original.hp.average} (${original.hp.formula.replace("d", "к")})`);
  expect(creature.ac).toContain(String(typeof original.ac[0] === "number" ? original.ac[0] : original.ac[0].ac));
  expect(creature.walkSpeed).toBe(original.speed.walk);
  for (const [field, speed] of [["burrowSpeed", "burrow"], ["flySpeed", "fly"], ["swimSpeed", "swim"], ["climbSpeed", "climb"]] as const) {
    expect(creature[field] ?? null).toBe(original.speed[speed]?.number ?? original.speed[speed] ?? null);
  }
  expect(creature.challenge).toBe(original.cr);
  for (const [field, ability] of [["strength", "str"], ["dexterity", "dex"], ["constitution", "con"], ["intelligence", "int"], ["wisdom", "wis"], ["charisma", "cha"]] as const) {
    expect(creature[field]).toMatch(new RegExp(`^${original[ability]} `));
  }
  const reference = collectCreatureReferences("RULES_2014").find((entry) => entry.engName === name)!;
  for (const action of [...(original.trait ?? []), ...original.action, ...(original.legendary ?? [])]) {
    const heading = action.name.replace(/ \{@recharge\}| \(\d+\/Day\)| \(Costs \d+ Actions\)/g, "");
    expect(reference.description).toContain(`{{${heading}}}`);
    const originalText = action.entries.join(" ");
    for (const hit of originalText.matchAll(/\{@(?:hit|dc) (\d+)\}/g)) expect(reference.description).toContain(hit[1]);
    for (const damage of originalText.matchAll(/\{@damage ([^}]+)\}/g)) expect(reference.description).toContain(damage[1].replace("d", "к"));
  }
});

it("preserves the worm's swallowing, repeated saves, immunity and fire vulnerability", () => {
  const creature = getCreatureByIdOrSlug("frost-worm", "RULES_2014")!;
  const reference = collectCreatureReferences("RULES_2014").find((entry) => entry.engName === "Frost Worm")!;
  expect(reference.details).toContainEqual({ label: "Вразливість до шкоди", value: "вогонь" });
  expect(creature.specialAbilities).toContain("автоматично провалюють цей ряткидок");
  expect(creature.specialAbilities).toContain("половиною своєї швидкості риття");
  expect(creature.actions).toContain("Велика або менша істота");
  expect(creature.actions).toContain("повне укриття");
  expect(creature.actions).toContain("30 або більше шкоди");
  expect(creature.actions).toContain("відригує всіх проковтнутих істот");
  expect(creature.actions).toContain("щоразу, коли зазнає шкоди, та наприкінці кожного свого ходу");
  expect(creature.actions).toContain("Trill усіх морозних хробаків на наступні 24 години");
});

it("preserves quori spell limits, soul imprisonment, exhaustion control and possession escape conditions", () => {
  const creature = getCreatureByIdOrSlug("kalaraq-quori", "RULES_2014")!;
  expect(creature.specialAbilities).toContain("без жодних компонентів");
  expect(creature.specialAbilities).toContain("Кожне 3 рази на день");
  for (const spell of ["Arcane eye", "Clairvoyance", "Confusion", "Dream", "Eyebite"]) expect(creature.specialAbilities).toContain(`[${spell}]`);
  expect(creature.actions).toContain("чотири атаки Arcane Blast");
  expect(creature.actions).toContain("Доки нападника не знищено");
  expect(creature.actions).toContain("кожні 24 години");
  expect(creature.actions).toContain("6 рівня виснаження, вона не помирає");
  expect(creature.actions).toContain("Лише заклинання Бажання [Wish]");
  expect(creature.actions.match(/перезаряджання 6/g)).toHaveLength(2);
  expect(creature.actions).toContain("не отримує доступу до її знань, класових рис або володінь");
  expect(stripRuleTermAnchors(creature.actions)).toContain("припинить її бонусною дією");
  expect(creature.actions).toContain("Розвіювання зла й добра [Dispel Evil and Good]");
  expect(creature.actions).toContain("саме цього нападника на 24 години");
});

it("preserves emissary death transformation, size-only shape change and legendary action costs", () => {
  const creature = getCreatureByIdOrSlug("lesser-star-spawn-emissary", "RULES_2014")!;
  expect(creature.specialAbilities).toContain("очки здоровʼя посланця зменшуються до 0");
  expect(creature.specialAbilities).toContain("Greater Star Spawn Emissary");
  expect(creature.specialAbilities).toContain("значення ініціативи меншого посланця");
  expect(creature.actions).toContain("окрім розміру");
  expect(creature.actions).toContain("Спорядження, яке він носить або тримає, не перетворюється");
  expect(creature.legendaryActions).toContain("коштує 2 дії");
  expect(creature.legendaryActions).toContain("коштує 3 дії");
  expect(creature.legendaryActions).toContain("до початку свого наступного ходу");
  expect(getCreatureByIdOrSlug("cave-bear", "RULES_2014")!.senses).toContain("Темнозір 60 футів");
});

it("keeps unique creature IDs and supplies neither supplement to the 2024 catalog", () => {
  const creatures = getAllCreatures("RULES_2014");
  expect(new Set(creatures.map((entry) => entry.creatureId)).size).toBe(creatures.length);
  expect(getAllCreatures("RULES_2024").filter((entry) => supplements.creatures.some((supplement: { entry: { nameEng: string } }) => supplement.entry.nameEng === entry.nameEng)).length).toBe(0);
});

it("preserves the abbreviated DMG Giant Fly statblock without inventing CR, experience or attacks", () => {
  const original = JSON.parse(readFileSync("tests/fixtures/5etools/raw-slices/bestiary/bestiary-dmg.json", "utf8")).monster.find((entry: { name: string }) => entry.name === "Giant Fly");
  expect(original.cr).toBeUndefined();
  expect(original.action).toBeUndefined();
  const creature = getCreatureByIdOrSlug("giant-fly", "RULES_2014")!;
  expect(creature.hp).toBe("19 (3к10 + 3)");
  expect(creature.ac).toBe("11");
  expect(creature.walkSpeed).toBe(original.speed.walk);
  expect(creature.flySpeed).toBe(original.speed.fly);
  expect(creature.senses).toContain("Темнозір 60 футів");
  expect(creature.strength).toBe("14 (+2)");
  expect(creature.charisma).toBe("3 (-4)");
  expect(creature.challenge).toBe("");
  expect(creature.actions).toBe("");
  expect(creature.xp).toBe("");
  expect(creature.proficiencyBonus).toBe("");
  expect(creature.description).toContain("с. 169");
  const reference = collectCreatureReferences("RULES_2014").find((entry) => entry.engName === "Giant Fly")!;
  expect(reference.details).toContainEqual({ label: "Очки здоровʼя", value: "19 (3к10 + 3)" });
  expect(reference.details.some((detail) => ["Небезпечність", "Досвід", "Бонус майстерності"].includes(detail.label))).toBe(false);
  expect(reference.description).not.toContain("**Дії**");
  expect(getCreatureByIdOrSlug("giant-fly", "RULES_2024")).toBeUndefined();
});

it("opens the complete special scimitar rule from the native weapon catalog and article", async () => {
  const original = JSON.parse(readFileSync("tests/fixtures/5etools/raw-slices/items-base.json", "utf8")).baseitem.find((entry: { name: string }) => entry.name === "Double-Bladed Scimitar");
  expect(original.dmg1).toBe("2d4");
  const weapon = getWeaponByIdOrSlug("double-bladed-scimitar", "RULES_2014")!;
  expect(weapon.damage).toBe("2к4");
  expect(weapon.properties).toEqual(["SPECIAL", "TWO_HANDED"]);
  expect(stripRuleTermAnchors(weapon.description)).toContain("бонусну дію відразу після цього");
  expect(stripRuleTermAnchors(weapon.description)).toContain("1к4 рублячої шкоди замість 2к4");
  expect(renderToStaticMarkup(createElement(WeaponDetailCard, { weapon }))).toContain("1к4 рублячої шкоди замість 2к4");
  expect(getWeaponByIdOrSlug("double-bladed-scimitar", "RULES_2024")).toBeUndefined();
  const document = parseArticleDocument(JSON.parse(readFileSync("data/rpgbot/uk/rpgbot-elf-2014.json", "utf8")));
  const hydrated = await hydrateArticleDocument(document);
  const reference = hydrated.contentReferences.find((entry) => entry.href === "/weapons/double-bladed-scimitar")!;
  expect(reference.kind).toBe("weapon");
  expect(reference.description).toBe(weapon.description);
  expect(reference.details).toContainEqual({ label: "Шкода", value: `2к4 · ${damageTypeTranslations.SLASHING}` });
  expect(reference.details).toContainEqual({ label: "Вага", value: "6 фунтів" });
  expect(reference.details).toContainEqual({ label: "Вартість", value: "100 зм" });
});

it("opens the existing complete Tasha origin rules for both RPGbot aliases", () => {
  const references = collectEntityReferences("RULES_2014");
  const native = references.find((entry) => entry.engName === "Customizing Your Origin")!;
  expect(native.href).toBe("/rules/abilities#customizing-your-origin");
  expect(native.description).toContain("володіння");
  expect(native.description).toContain("мови");
  for (const name of ["Custom Origin", "Customized Origin"]) {
    expect(collectEntityAliases([], references, references).find((entry) => entry.engName === name)?.href).toBe(native.href);
  }
});
