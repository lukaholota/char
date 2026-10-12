import { findCharacterCreationOptions, findCharacterCreatorOptions } from "../../src/lib/content/creator-content";
import { extractFlexibleGroups } from "../../src/rules/abilities";
import { listRacialChoiceGroups, readRacialChoiceGroup } from "../../src/rules/racial-ability-choices";
import { SkillsEnum } from "../../src/lib/types/enums";
import { normalizeSkillProficiencies } from "../../src/rules/proficiency";
import { readExpertiseGrant } from "../../src/rules/expertise-selections";
import { findSpellKnowledge2014 } from "../../src/rules/spell-knowledge-2014";
import { findFeatSpellRule2014 } from "../../src/rules/feat-spells-2014";
import { getAllClasses } from "../../src/lib/classesData";
import { buildEquipmentLines } from "../../src/lib/components/characterCreator/equipment-choices";
import type { CreatorContent } from "../../src/server/db/creator-content-query";

const content = findCharacterCreationOptions("RULES_2014");
const fullContent = findCharacterCreatorOptions("RULES_2014");
const KINDS = ["search", "class", "subclass", "levels", "race", "background", "feat"] as const;
type Kind = (typeof KINDS)[number];

function main(): void {
  const [kind, query] = process.argv.slice(2);
  if (!KINDS.includes(kind as Kind) || !query) {
    console.error("bun scripts/rpgbot/show-catalog.ts search <частина ключа> | class|levels|race|background|feat <KEY> | subclass <CLASS>/<SUBCLASS>");
    process.exit(2);
  }
  const lines = { search: findKeys, class: describeClass, subclass: describeSubclass, levels: describeClassLevels, race: describeRace, background: describeBackground, feat: describeFeat }[kind as Kind](query);
  console.log(lines.join("\n"));
}

function findKeys(query: string): string[] {
  const needle = query.toUpperCase();
  const groups = {
    classes: content.classes.map((entry) => entry.name),
    subclasses: getAllClasses("RULES_2014").flatMap((entry) => entry.subclasses.map((subclass) => `${entry.key}/${subclass.key}`)),
    races: content.races.flatMap((entry) => [entry.name, ...entry.subraces.map((subrace) => `${entry.name}/${subrace.name}`), ...entry.raceVariants.map((variant) => `${entry.name}/${variant.name}`)]),
    backgrounds: content.backgrounds.map((entry) => entry.name),
    feats: content.feats.map((entry) => entry.name),
    infusions: fullContent.infusions.map((entry) => entry.engName),
    weapons: content.weapons.map((entry) => entry.name),
  };
  return Object.entries(groups).map(([label, keys]) => `${label}: ${keys.filter((key) => key.toUpperCase().includes(needle)).join(", ") || "-"}`);
}

function describeClass(key: string): string[] {
  const characterClass = findOrFail(content.classes, key);
  const subclasses = getAllClasses("RULES_2014").find((entry) => entry.key === key)?.subclasses.map((subclass) => subclass.key) ?? [];
  return [
    `${key}: підклас з ${characterClass.subclassLevel}-го рівня; кістка ХП d${characterClass.hitDie}; заклинання ${characterClass.spellcastingType}; навичок на вибір ${JSON.stringify(characterClass.skillProficiencies)}`,
    `підкласи: ${subclasses.join(", ")}`,
    `класові вибори 1-го рівня (classOptions): ${characterClass.classChoiceOptions.map((entry) => `${entry.choiceOption.groupName}: ${entry.choiceOption.optionNameEng}`).join("; ") || "немає"}`,
    ...describeEquipmentGroups(characterClass),
  ];
}

function describeSubclass(key: string): string[] {
  const [className, subclassKey] = key.split("/");
  const characterClass = fullContent.classes.find((entry) => entry.name === className);
  const subclass = characterClass?.subclasses.find((entry) => entry.name === subclassKey);
  if (!characterClass || !subclass) {
    console.error(`Формат: subclass <CLASS>/<SUBCLASS>, напр. FIGHTER_2014/CHAMPION. Підкласи класу: ${characterClass?.subclasses.map((entry) => entry.name).join(", ") ?? "клас не знайдено"}`);
    process.exit(1);
  }
  return [
    `${key}: обирається на ${characterClass.subclassLevel}-му рівні класу${subclass.spellcastingType && subclass.spellcastingType !== "NONE" ? `; заклинання ${subclass.spellcastingType}` : ""}`,
    ...describeOptionsByLevel("вибори підкласу (subclassOptions)", subclass.subclassChoiceOptions),
    ...describeSkillChoices(subclass.features),
    ...describeFeaturesByLevel(subclass.features),
  ];
}

function describeClassLevels(key: string): string[] {
  const characterClass = findOrFail(fullContent.classes, key);
  const expertise = characterClass.features.filter((entry) => readExpertiseGrant(entry.feature.skillExpertises)).map((entry) => `${entry.levelGranted}-й (${entry.feature.engName})`);
  return [
    `${key}: підклас обирається на ${characterClass.subclassLevel}-му рівні класу; підвищення характеристик або риса на ${characterClass.abilityScoreUpLevels.join(", ")}-му`,
    `заклинання: ${describeSpellTable(key)}`,
    `експертиза (expertise): ${expertise.join(", ") || "немає"}`,
    ...describeOptionsByLevel("вибори класу (classOptions)", characterClass.classChoiceOptions),
    ...describeSkillChoices(characterClass.features),
    ...(key === "ARTIFICER_2014" ? ["вливання (infusions, engName): 4 на 2-му, +2 на 6, 10, 14, 18-му рівнях класу"] : []),
    ...describeFeaturesByLevel(characterClass.features),
  ];
}

function describeSpellTable(className: string): string {
  const levels = Array.from({ length: 20 }, (_unused, index) => index + 1);
  const rows = levels.flatMap((level) => {
    const now = findSpellKnowledge2014(className, level);
    const before = level > 1 ? findSpellKnowledge2014(className, level - 1) : null;
    if (!now) return [];
    const gains = [now.cantrips - (before?.cantrips ?? 0) ? `+${now.cantrips - (before?.cantrips ?? 0)} замовл.` : "", (now.known ?? 0) - (before?.known ?? 0) ? `+${(now.known ?? 0) - (before?.known ?? 0)} відомих` : "", className === "WIZARD_2014" ? `+${level === 1 ? 6 : 2} до книги` : ""].filter(Boolean);
    return gains.length ? [`${level}-й: ${gains.join(", ")}`] : [];
  });
  return rows.length ? rows.join("; ") : "обирати заклинання не потрібно (готує зі списку класу або не чаклує)";
}

function describeOptionsByLevel(label: string, options: readonly { levelsGranted: number[] | null; choiceOption: { groupName: string; optionNameEng: string } }[]): string[] {
  const groups = new Map<string, string[]>();
  for (const option of options) {
    const mapKey = `${(option.levelsGranted ?? []).join(", ")}-й рівень класу · група «${option.choiceOption.groupName}»`;
    groups.set(mapKey, [...(groups.get(mapKey) ?? []), option.choiceOption.optionNameEng]);
  }
  const lines = [...groups].map(([mapKey, names]) => `  ${mapKey}: ${names.length > 8 ? `${names.slice(0, 8).join(", ")} … (усього ${names.length})` : names.join(", ")}`);
  return lines.length ? [`${label}:`, ...lines] : [`${label}: немає`];
}

function describeSkillChoices(features: readonly { levelGranted: number; feature: { engName: string; skillProficiencies: unknown } }[]): string[] {
  return features.flatMap((entry) => {
    const choice = normalizeSkillProficiencies(entry.feature.skillProficiencies, SkillsEnum);
    return choice?.type === "choice" ? [`навички на вибір (skillProficiencies) на ${entry.levelGranted}-му рівні класу: ${choice.choiceCount} з ${choice.options.length === SkillsEnum.length ? "будь-яких" : choice.options.join(", ")} (${entry.feature.engName})`] : [];
  });
}

function describeFeaturesByLevel(features: readonly { levelGranted: number; feature: { engName: string } }[]): string[] {
  const byLevel = new Map<number, string[]>();
  for (const entry of features) byLevel.set(entry.levelGranted, [...(byLevel.get(entry.levelGranted) ?? []), entry.feature.engName]);
  return ["здібності за рівнем класу:", ...[...byLevel].sort(([left], [right]) => left - right).map(([level, names]) => `  ${level}: ${names.join(", ")}`)];
}

function describeEquipmentGroups(characterClass: CreatorContent["classes"][number]): string[] {
  const groups = [...new Set(characterClass.startingEquipmentOption.map((row) => row.choiceGroup))].sort((left, right) => left - right);
  return groups.map((group) => {
    const rows = characterClass.startingEquipmentOption.filter((row) => row.choiceGroup === group);
    const options = [...new Set(rows.map((row) => row.option))].sort().map((option) => {
      const optionRows = rows.filter((row) => row.option === option);
      const weaponCount = optionRows.find((row) => row.chooseAnyWeapon)?.weaponCount ?? 0;
      const label = buildEquipmentLines(optionRows).belongings.map((line) => line.text).join(", ");
      return `${option}: ${label}${weaponCount ? ` [потрібно зброї: ${weaponCount}]` : ""}`;
    });
    return `спорядження, група ${group}: ${options.join(" | ")}`;
  });
}

function describeRace(key: string): string[] {
  const race = findOrFail(content.races, key);
  const basic = JSON.stringify(readBasicAsi(race.ASI));
  const hasBasic = Boolean(race.ASI && readBasicAsi(race.ASI));
  return [
    `${key}: підвищення характеристик (basic) ${basic}; мов на вибір ${race.languagesToChooseCount}; навички ${JSON.stringify(race.skillProficiencies)}`,
    hasBasic ? "класичні підвищення (basic): racialAbilities без racialAbilityRules" : "УВАГА: лише підвищення за правилами Таші — у пресеті racialAbilityRules: \"tasha\" і racialAbilities за групами нижче",
    `підраси (subraceKey): ${race.subraces.map((entry) => `${entry.name} ${JSON.stringify(entry.additionalASI)}`).join("; ") || "немає"}`,
    `варіанти (variantKey): ${race.raceVariants.map((entry) => entry.name).join(", ") || "немає"}`,
    `расові вибори (raceOptions): ${[...new Set(race.raceChoiceOptions.map((entry) => entry.choiceGroupName))].join(", ") || "немає"}`,
    `гнучкі підвищення basic: ${JSON.stringify(extractFlexibleGroups(race.ASI, "basic"))}`,
    `групи Таші (racialAbilityRules: "tasha"; racialAbilities — плоский список по групах підряд; підраса додає свої групи): ${describeTashaGroups(race)}`,
  ];
}

function describeTashaGroups(race: CreatorContent["races"][number]): string {
  const ownGroups = listRacialChoiceGroups({ isDefaultASI: false, raceASI: race.ASI, subraceReplacesASI: false });
  const subraceGroups = race.subraces.map((subrace) => `${subrace.name}: ${describeGroups(listRacialChoiceGroups({ isDefaultASI: false, raceASI: race.ASI, subraceASI: subrace.additionalASI, subraceReplacesASI: subrace.replacesASI ?? false }))}`);
  return [`раса: ${describeGroups(ownGroups)}`, ...subraceGroups].join("; ");
}

function describeGroups(groups: unknown[]): string {
  return groups.map((group, index) => {
    const { value, choiceCount, unique } = readRacialChoiceGroup(group);
    return `${index + 1}) +${value} до ${choiceCount}${unique ? " різних" : " (повтор між групами дозволено)"}`;
  }).join(", ") || "немає";
}

function readBasicAsi(asi: unknown): unknown {
  return asi && typeof asi === "object" && "basic" in asi ? (asi as { basic: unknown }).basic : null;
}

function describeBackground(key: string): string[] {
  const background = findOrFail(content.backgrounds, key);
  return [`${key}: навички ${JSON.stringify(background.skillProficiencies)}; мов на вибір ${background.languagesToChooseCount}`];
}

function describeFeat(key: string): string[] {
  const feat = findOrFail(content.feats, key);
  const options = feat.featChoiceOptions.map((entry) => entry.choiceOption.optionNameEng);
  return [`${key}: featOptionName ${options.length ? `одна з ${options.join(" | ")}` : "null (опцій немає)"}; ASI ${JSON.stringify(feat.grantedASI)}`, describeFeatSpells(key)];
}

function describeFeatSpells(featKey: string): string {
  const rule = findFeatSpellRule2014(featKey);
  if (!rule) return "заклинання риси: пресет не записує (риса їх не дає або платформа ще не підтримує); spells.featSpellKeys не потрібні";
  const picks = rule.picks.map((pick) => `${pick.count} ${pick.spellLevel === 0 ? "замовл." : `закл. ${pick.spellLevel}-го рівня`}${pick.ritualOnly ? " (ритуальні)" : ""}${pick.schools ? ` школи ${pick.schools.join("/")}` : ""}`).join(" + ") || "вибору немає";
  const lists = rule.sharedSpellLists ? `; усі з одного списку: ${rule.sharedSpellLists.join(", ")}` : "";
  const named = rule.namedSpellEngNames.length ? `; риса сама дає: ${rule.namedSpellEngNames.join(", ")}` : "";
  return `заклинання риси (spells.featSpellKeys — slug англійської назви): ${picks}${lists}${named}`;
}

function findOrFail<T extends { name: string }>(entries: readonly T[], key: string): T {
  const entry = entries.find((candidate) => candidate.name === key);
  if (!entry) {
    console.error(`Немає ключа «${key}». Спробуйте: bun scripts/rpgbot/show-catalog.ts search ${key.split("_")[0]}`);
    process.exit(1);
  }
  return entry;
}

main();
