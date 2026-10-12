import { stripRuleTermAnchors } from "@/lib/term-link";
import { expect, it } from "vitest";
import { collectRareReferenceAliases } from "@/lib/optimization/rare-reference-aliases";
import { collectEntityReferences } from "@/lib/optimization/entity-hydration";
import { collectSupplementalReferences } from "@/lib/optimization/supplemental-hydration";
import { collectCreatureAbilityReferences, collectCreatureReferences } from "@/lib/optimization/creature-hydration";
import { hydrateArticleRevision } from "@/lib/optimization/content-hydration";
import { fixtureCorpus } from "@/lib/optimization/fixtures.test-helper";
import { getCreatureByIdOrSlug } from "@/lib/bestiaryData";
import { readFileSync } from "node:fs";
import { buildTermCard } from "@/lib/term-card";
import { collectTermSources } from "@/lib/term-sources";
import { findRuleTermHref } from "@/lib/term-link";

const references = [...collectEntityReferences("RULES_2014"), ...collectSupplementalReferences("RULES_2014", []),
  ...collectCreatureAbilityReferences("RULES_2014"), ...collectCreatureReferences("RULES_2014")];

it.each([
  ["False Identity", "Charlatan", "підробити документи"],
  ["Bad Reputation", "Pirate", "дрібні злочини"],
  ["Position of Privilege", "Noble", "аудієнцію"],
  ["Shadowy Defense", "Shadowfell Brand Tattoo", "до наступного заходу сонця"],
  ["Long Arms", "Long-Limbed", "під час свого ходу"],
  ["Elven Weapon Training", "Elf Weapon Training", "довгим луком"],
  ["Fortune of the Many", "Fortune from the Many", "максимум бонус +3"],
  ["Gift of the Forge", "Blessing of the Forge", "доки ви не помрете"],
  ["Infernal Wound", "Tail", "ушкодження від рани зростають"],
  ["Haunt", "Haunt Creature", "доки дух не використає цю дію знову"],
  ["Enhanced Spell", "Heightened Spell", "ряткидок"],
  ["Shroud of Shadow", "Shrouded in Shadow", "Невидимість"],
  ["Signature Spell", "Signature Spells", "3"],
  ["Far Traveller", "Far Traveler", "доступу до людей та місць"],
  ["Warpriest", "War Priest", "бонус"],
])("routes %s to the complete existing 2014 %s rules", (original, canonical, requiredBody) => {
  const target = references.find((entry) => entry.engName === canonical
    && (canonical !== "Tail" || entry.href.includes("creature=horned-devil"))
    && (canonical !== "War Priest" || entry.href.startsWith("/classes?")))!;
  expect(target, canonical).toBeDefined();
  const aliases = collectRareReferenceAliases([target]);
  const alias = aliases.find((entry) => entry.engName === original)!;
  expect(alias.href).toBe(target.href);
  expect(target.description).toContain(requiredBody);
  const revision = fixtureCorpus().translations[0];
  revision.sections[0].blocks = [{ type: "paragraph", blockId: "rare-reference", content: [{ type: "text", text: `{{Назва|${original}}}` }] }];
  const hydrated = hydrateArticleRevision(revision, aliases);
  expect(hydrated.sections[0].blocks[0]).toMatchObject({ content: [{ type: "link", text: "Назва", href: target.href }] });
});

it("does not substitute another creature's tail, uncertain labels or 2024 rules", () => {
  expect(collectRareReferenceAliases([
    { name: "Tail", engName: "Tail", href: "/bestiary?creature=bone-devil&feature=tail" },
    { name: "Charlatan", engName: "Charlatan", href: "/2024/backgrounds/charlatan" },
    { name: "War Priest", engName: "War Priest", href: "/bestiary/war-priest", kind: "creature" },
  ])).toEqual([]);
  expect(collectRareReferenceAliases(references).map((entry) => entry.engName)).not.toContain("Death Attack");
  expect(collectRareReferenceAliases(references).map((entry) => entry.engName)).not.toContain("From Dust");
});

it.each([
  ["Dragon Chess", "Gaming Set", "Спіймати гравця на шахрайстві"],
  ["Dragonchess Set", "Gaming Set", "певну гру"],
  ["Water Vehicles", "Vehicles (Land and Water)", "Керування транспортом"],
  ["Vehicles (Water)", "Vehicles (Land and Water)", "КБ і рятівних кидків"],
  ["Vehicles (Land)", "Vehicles (Land and Water)", "крутий поворот"],
  ["Total Cover", "Cover", "не може бути ціллю атаки чи заклинання безпосередньо"],
  ["Damage Resistance", "Resistance", "рахуються як один"],
  ["Resistance to Damage", "Resistance", "зменшується для них удвічі"],
  ["Opportunity Attacks", "Opportunity Attack", "вибух відкидає"],
  ["Unarmed Strikes", "Unarmed Strike", "Сили"],
  ["Critical Hits", "Critical Hit", "двічі"],
])("opens the full native rule card for %s", (original, canonical, requiredBody) => {
  const card = buildTermCard({ original: canonical, ruleset: "RULES_2014" }, collectTermSources());
  expect(card.article?.subsection?.content).toContain(requiredBody);
  const href = findRuleTermHref(canonical, "RULES_2014")!;
  const alias = collectRareReferenceAliases([{ name: card.article!.subsection!.title, engName: canonical, href }])
    .find((entry) => entry.engName === original)!;
  expect(alias.href).toBe(href);
});

it.each([
  ["Pact Boon Option: Pact of the Talisman (Addition)", "Pact of the Talisman", "годинну церемонію"],
  ["Full Moon", "Lunar Embodiment", "Повня"],
  ["Lotusden", "Lotusden Halfling", "Timberwalk"],
  ["Draconblood", "Dragonborn (Draconblood)", "Forceful Presence"],
  ["Ravenite", "Dragonborn (Ravenite)", "Vengeful Assault"],
  ["Infusion", "Infuse Item", "залишається в предметі необмежено довго"],
  ["Infusions", "Infuse Item", "жоден предмет не може містити більше одного"],
  ["Fury", "Shadow Spirit", "Terror Frenzy"],
  ["Despair", "Shadow Spirit", "Weight of Sorrow"],
  ["Ghostly", "Undead Spirit", "Incorporeal Passage"],
  ["Putrid", "Undead Spirit", "Festering Aura"],
  ["Skeletal", "Undead Spirit", "Grave Bolt"],
  ["Clay", "Construct Spirit", "Berserk Lashing"],
  ["Metal", "Construct Spirit", "Heated Body"],
  ["Stone", "Construct Spirit", "Stony Lethargy"],
  ["Stone Lethargy", "Stony Lethargy", "Мудрості"],
])("routes the named %s component to its complete native parent %s", (original, canonical, requiredBody) => {
  const reference = references.find((entry) => entry.engName === canonical)!;
  expect(reference.description).toContain(requiredBody);
  const alias = collectRareReferenceAliases([reference]).find((entry) => entry.engName === original)!;
  expect(alias.href).toBe(reference.href);
  expect(alias.href).not.toContain("/2024/");
});

it("keeps the now-present complete Kalaraq Quori Mind Seed rules including curse progression", () => {
  const mindSeed = references.find((entry) => entry.engName === "Mind Seed" && entry.href.includes("kalaraq-quori"))!;
  expect(mindSeed.description).toContain("СК 21");
  expect(mindSeed.description).toContain("кожні 24 години");
  expect(mindSeed.description).toContain("6 рівня виснаження");
  expect(mindSeed.description).toContain("Лише заклинання Бажання");
});

it("preserves every Reaper Spirit scaling formula and Haunt Creature restriction from BMT 50", () => {
  const raw = JSON.parse(readFileSync("tests/fixtures/5etools/raw-slices/bestiary/bestiary-bmt.json", "utf8")).monster
    .find((entry: { name: string }) => entry.name === "Reaper Spirit");
  const creature = getCreatureByIdOrSlug("reaper-spirit", "RULES_2014")!;
  expect(raw.summonedBySpellLevel).toBe(4);
  expect(creature.ac).toBe("11 + рівень заклинання (природна броня)");
  expect(creature.hp).toBe("40 + 10 за кожен рівень заклинання понад 4-й");
  for (const [field, original] of [["strength", "str"], ["dexterity", "dex"], ["constitution", "con"],
    ["intelligence", "int"], ["wisdom", "wis"], ["charisma", "cha"]] as const) {
    expect(raw[original]).toBe(16);
    expect(creature[field]).toBe("16 (+3)");
  }
  expect(creature.walkSpeed).toBe(raw.speed.walk);
  expect(creature.flySpeed).toBe(raw.speed.fly.number);
  expect(creature.speed).toContain("Паріння");
  expect(creature.challenge).toBe("");
  expect(creature.xp).toBe("");
  expect(creature.proficiencyBonus).toBe("дорівнює вашому бонусу Майстерності");
  expect(creature.actions).toContain("половині рівня заклинання з округленням донизу");
  expect(creature.actions).toContain("ваш модифікатор атаки заклинанням");
  expect(stripRuleTermAnchors(creature.actions)).toContain("(з перевагою), досяжність 5 футів, істота, яку переслідує Haunt Creature");
  expect(creature.actions).toContain("1к8 + 3 + рівень заклинання");
  expect(creature.specialAbilities).toContain("1к10 шкоди силовим полем за кожні 5 футів");
  expect(creature.bonusActions).toContain("на тому самому плані існування");
  expect(creature.bonusActions).toContain("починає свій хід у межах 10 футів");
  expect(creature.bonusActions).toContain("проти вашої СК ряткидка проти заклинань");
  expect(creature.bonusActions).toContain("до початку свого наступного ходу");
  expect(creature.bonusActions).toContain("доки не помре, доки дух не зникне");
  const source = JSON.parse(readFileSync("data/2014/optimization-entity-supplements.json", "utf8")).creatures
    .find((entry: { entry: { nameEng: string } }) => entry.entry.nameEng === "Reaper Spirit");
  expect(source.source).toEqual({ file: "data/5etools/raw/bestiary/bestiary-bmt.json", book: "BMT", page: 50 });
  expect(creature.actions).toBe(source.entry.actions);
  expect(creature.bonusActions).toBe(source.entry.bonusActions);
  expect(getCreatureByIdOrSlug("reaper-spirit", "RULES_2024")).toBeUndefined();
});
