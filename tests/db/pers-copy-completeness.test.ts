/**
 * KR31.7 — копія персонажа, копія теки, копія за посиланням і знімок рівня переносять увесь граф
 * персонажа. Звʼязки й поля звіряються за метаданими Prisma, тож новий стовпець дочірньої таблиці
 * або новий звʼязок `Pers` ловиться без правки тесту.
 */

import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";
import { duplicatePers, duplicatePersFolder } from "@/server/db/pers-actions";
import { copyFolderByShareToken, copyPersByToken } from "@/server/db/share-actions";
import { createPersSnapshot } from "@/server/db/snapshots";

const OWNER_EMAIL = "copy-owner@test.local";
const COPIER_EMAIL = "copy-reader@test.local";

const RELATIONS_NOT_COPIED: Record<string, string> = {
  user: "копія належить тому, хто копіює",
  folder: "тека задається шляхом копіювання",
  additionalUsers: "співвласники оригіналу не отримують доступу до копії",
  shareTokens: "посилання доступу до оригіналу не переносяться",
  pers_offline_operation: "журнал офлайн-синхронізації оригіналу",
  race: "переноситься через raceId",
  subrace: "переноситься через subraceId",
  class: "переноситься через classId",
  subclass: "переноситься через subclassId",
  background: "переноситься через backgroundId",
};

const PATH_SPECIFIC_PERS_FIELDS = [
  "userId", "name", "folderId", "isPinned", "shareToken", "parentPersId", "snapshotLevel", "isSnapshot", "isActive",
];

const GRAPH_INCLUDE = {
  skills: true,
  persSpells: true,
  homebrewSpells: true,
  features: true,
  feats: { include: { choices: true } },
  weapons: true,
  pers_weapon_mastery: true,
  armors: true,
  multiclasses: true,
  magicItems: true,
  persInfusions: { include: { weapon: true, armor: true, magicItem: true } },
  resourcePools: true,
  wildshapes: true,
  effects: true,
  bastion: { include: { facilities: true, turns: true } },
  raceVariants: true,
  raceChoiceOptions: true,
  choiceOptions: true,
  classOptionalFeatures: true,
  spells: true,
  featureDescriptions: true,
} satisfies Prisma.PersInclude;

beforeEach(resetUserData);
afterAll(disconnectDatabase);

type SchemaField = { name: string; type: string; isRelation: boolean; isId: boolean; foreignKeys: string[] };

const SCHEMA = fs.readFileSync(path.resolve(process.cwd(), "prisma/schema.prisma"), "utf-8");
const MODEL_NAMES = new Set([...SCHEMA.matchAll(/^model\s+(\w+)\s*\{/gm)].map((hit) => hit[1]));

function findModelFields(name: string): SchemaField[] {
  const body = SCHEMA.match(new RegExp(`^model ${name} \\{(.*?)^\\}`, "ms"));
  if (!body) throw new Error(`Немає моделі ${name}`);
  return body[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("@@") && !line.startsWith("//"))
    .map((line) => ({ parts: line.split(/\s+/), line }))
    .filter(({ parts }) => parts.length >= 2)
    .map(({ parts, line }) => {
      const type = parts[1].replace(/[?[\]]/g, "");
      return {
        name: parts[0],
        type,
        isRelation: MODEL_NAMES.has(type),
        isId: /\s@id(\s|$)/.test(line),
        foreignKeys: (line.match(/fields:\s*\[([^\]]*)\]/)?.[1] ?? "").split(",").map((key) => key.trim()).filter(Boolean),
      };
    });
}

function isPersOwnedModel(name: string) {
  return name.startsWith("Pers") || name.startsWith("pers_");
}

type GraphValue = string | number | boolean | null | GraphValue[] | { [key: string]: GraphValue };

function collectOwnedForeignKeys(fields: SchemaField[]): Set<string> {
  return new Set(fields.filter((field) => field.isRelation && isPersOwnedModel(field.type)).flatMap((field) => field.foreignKeys));
}

function normalizeRecord(modelName: string, record: Record<string, unknown>): { [key: string]: GraphValue } {
  const fields = findModelFields(modelName);
  const ownedForeignKeys = collectOwnedForeignKeys(fields);
  const normalized: { [key: string]: GraphValue } = {};

  for (const field of fields) {
    if (!(field.name in record)) continue;
    const value = record[field.name];
    if (field.isRelation) {
      normalized[field.name] = normalizeRelation(field.type, value);
      continue;
    }
    if (field.isId || ownedForeignKeys.has(field.name) || field.name === "createdAt" || field.name === "updatedAt") continue;
    normalized[field.name] = JSON.parse(JSON.stringify(value ?? null)) as GraphValue;
  }

  return normalized;
}

function normalizeRelation(modelName: string, value: unknown): GraphValue {
  if (value === null || value === undefined) return null;
  if (!isPersOwnedModel(modelName)) {
    const idField = findModelFields(modelName).find((field) => field.isId)!.name;
    const ids = (Array.isArray(value) ? value : [value]).map((row) => (row as Record<string, number>)[idField]);
    return ids.sort((a, b) => a - b);
  }
  if (!Array.isArray(value)) return normalizeRecord(modelName, value as Record<string, unknown>);
  return value
    .map((row) => normalizeRecord(modelName, row as Record<string, unknown>))
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

async function readCopyGraph(persId: number) {
  const pers = await prisma.pers.findUniqueOrThrow({ where: { persId }, include: GRAPH_INCLUDE });
  const graph = normalizeRecord("Pers", pers);
  const pathSpecific = Object.fromEntries(PATH_SPECIFIC_PERS_FIELDS.map((field) => [field, pers[field as keyof typeof pers]]));
  for (const field of PATH_SPECIFIC_PERS_FIELDS) delete graph[field];
  return { graph, pathSpecific };
}

async function createRichPers2024() {
  const [owner, copier] = await Promise.all([
    prisma.user.create({ data: { email: OWNER_EMAIL, name: "Власник" } }),
    prisma.user.create({ data: { email: COPIER_EMAIL, name: "Читач" } }),
  ]);
  const [fighter, wizard, subclass, race, raceVariant, raceChoiceOption, background, feat, choiceOption, optionalFeature, feature, spell, weapon, armor, magicItem, infusion] =
    await Promise.all([
      prisma.class.findFirstOrThrow({ where: { name: "FIGHTER_2024" } }),
      prisma.class.findFirstOrThrow({ where: { name: "WIZARD_2024" } }),
      prisma.subclass.findFirstOrThrow({ where: { class: { name: "WIZARD_2024" } } }),
      prisma.race.findFirstOrThrow({ where: { name: "HUMAN_2024" } }),
      prisma.raceVariant.findFirstOrThrow(),
      prisma.raceChoiceOption.findFirstOrThrow({ where: { ruleset: "RULES_2024" } }),
      prisma.background.findFirstOrThrow({ where: { ruleset: "RULES_2024" } }),
      prisma.feat.findFirstOrThrow({ where: { ruleset: "RULES_2024", featChoiceOptions: { some: {} } }, include: { featChoiceOptions: true } }),
      prisma.choiceOption.findFirstOrThrow({ where: { ruleset: "RULES_2024" } }),
      prisma.classOptionalFeature.findFirstOrThrow(),
      prisma.feature.findFirstOrThrow({ where: { ruleset: "RULES_2024" } }),
      prisma.spell.findFirstOrThrow({ where: { ruleset: "RULES_2024" } }),
      prisma.weapon.findFirstOrThrow({ where: { ruleset: "RULES_2024", name: "LONGSWORD" } }),
      prisma.armor.findFirstOrThrow({ where: { ruleset: "RULES_2024", name: "CHAIN_MAIL" } }),
      prisma.magicItem.findFirstOrThrow({ where: { ruleset: "RULES_2024" } }),
      prisma.infusion.findFirstOrThrow(),
    ]);
  const folder = await prisma.persFolder.create({ data: { userId: owner.id, name: "Кампанія" } });

  const pers = await prisma.pers.create({
    data: {
      userId: owner.id,
      folderId: folder.folderId,
      isPinned: true,
      shareToken: "copy-completeness-token",
      name: "Складна",
      ruleset: "RULES_2024",
      classId: fighter.classId,
      raceId: race.raceId,
      backgroundId: background.backgroundId,
      level: 7,
      currentHp: 41, maxHp: 58, tempHp: 3,
      str: 16, dex: 14, con: 14, int: 12, wis: 10, cha: 8,
      gp: "123", raceStaticAcBonus: 1, heroicInspirationCount: 3, canStackHeroicInspiration: true, notes: "нотатки",
      currentHitDice: { d10: 4 }, customProficiencies: "Своє володіння",
      raceVariants: { connect: [{ raceVariantId: raceVariant.raceVariantId }] },
      raceChoiceOptions: { connect: [{ optionId: raceChoiceOption.optionId }] },
      choiceOptions: { connect: [{ choiceOptionId: choiceOption.choiceOptionId }] },
      classOptionalFeatures: { connect: [{ optionalFeatureId: optionalFeature.optionalFeatureId }] },
      spells: { connect: [{ spellId: spell.spellId }] },
      skills: { create: [{ skillId: 12, name: "PERCEPTION", proficiencyType: "EXPERTISE", customModifier: 2 }] },
      persSpells: { create: [{ spellId: spell.spellId, learnedAtLevel: 3, isPrepared: true, badgeText: "Риса", notes: "з риси", origin: "MANUAL" }] },
      homebrewSpells: { create: [{ isPrepared: true, badgeText: "Хоумбрю", badgeColor: "#34d399", excludeFromKnownCount: true, entry: { create: { kind: "SPELL", authorUserId: owner.id, name: "Їжак", spell: { create: { level: 1, school: "Втілення", castingTime: "1 дія", range: "Дотик", components: "В", duration: "Миттєва", description: "…" } } } } }] },
      features: { create: [{ featureId: feature.featureId, usesRemaining: 2, isActive: true }] },
      feats: { create: [{ featId: feat.featId, grants: { abilityIncreases: [{ ability: "STR", amount: 1 }] }, choices: { create: [{ choiceOptionId: feat.featChoiceOptions[0].choiceOptionId }] } }] },
      featureDescriptions: { create: [{ kind: "FEATURE", refId: feature.featureId, description: "Мій опис фічі" }, { kind: "FEAT", refId: feat.featId, description: "Мій опис риси" }] },
      weapons: {
        create: [{
          weaponId: weapon.weaponId, overrideName: "Сяйво", attackBonus: 1, overrideDamage: "2d6", overrideNormalRange: 5,
          overrideLongRange: 10, overrideDamageType: "RADIANT", overrideAttackAbility: "DEX", isProficient: false,
          customAttackBonus: 2, customDamageAbility: "STR", customDamageBonus: 3, customDamageCount: 2, customDamageDice: "1d10", isMagical: true,
        }],
      },
      pers_weapon_mastery: { create: [{ weapon_id: weapon.weaponId }] },
      armors: { create: [{ armorId: armor.armorId, overrideName: "Кольчуга", overrideBaseAC: 17, miscACBonus: 1, isProficient: false, equipped: true, abilityBonuses: ["DEX"], abilityBonusType: "MAX2" }] },
      multiclasses: { create: [{ classId: wizard.classId, subclassId: subclass.subclassId, classLevel: 2 }] },
      magicItems: { create: [{ magicItemId: magicItem.magicItemId, isAttuned: true, isEquipped: true, chargesMax: 7, chargesCurrent: 4 }] },
      resourcePools: { create: [{ poolKey: "SORCERY_POINTS", usesRemaining: 3 }] },
      wildshapes: { create: [{ creatureKey: "wolf", ruleset: "RULES_2024", sortOrder: 2, notes: "вовк", currentHp: 7, isActive: true }] },
      effects: { create: [{ effectKey: "CONCENTRATION", spellId: spell.spellId }, { effectKey: "HASTE", spellId: spell.spellId, endsWithConcentration: true }] },
      exhaustionLevel: 2,
      bastion: {
        create: {
          name: "Твердиня", description: "опис", notes: "нотатки", isMaintaining: true,
          facilities: { create: [{ facilitySlug: "armory", space: "ROOMY", currentOrder: "RECRUIT", defenders: 2, hirelings: "Ян", notes: "склад" }] },
          turns: { create: [{ turnNumber: 3, entry: "хід" }] },
        },
      },
    },
    include: { weapons: true },
  });
  await prisma.persInfusion.create({
    data: { persId: pers.persId, infusionId: infusion.infusionId, persWeaponId: pers.weapons[0].persWeaponId, expiresAt: new Date("2030-01-01") },
  });

  return { owner, copier, folder, pers };
}

function signInAs(email: string) {
  vi.mocked(auth).mockResolvedValue({ user: { email } } as never);
}

async function findOnlyCopy(where: Prisma.PersWhereInput) {
  const copies = await prisma.pers.findMany({ where, select: { persId: true } });
  expect(copies).toHaveLength(1);
  return copies[0].persId;
}

describe("повнота копії персонажа", () => {
  it("звірка покриває кожен звʼязок Pers, а фікстура заповнює кожен", async () => {
    const relations = findModelFields("Pers").filter((field) => field.isRelation).map((field) => field.name);
    const uncovered = relations.filter((name) => !(name in GRAPH_INCLUDE) && !(name in RELATIONS_NOT_COPIED));
    expect(uncovered).toEqual([]);

    const { pers } = await createRichPers2024();
    const { graph } = await readCopyGraph(pers.persId);
    const empty = Object.keys(GRAPH_INCLUDE).filter((name) => {
      const value = graph[name];
      return value === null || (Array.isArray(value) && value.length === 0);
    });
    expect(empty).toEqual([]);
  });

  it("копія персонажа", async () => {
    const { owner, folder, pers } = await createRichPers2024();
    const original = await readCopyGraph(pers.persId);
    signInAs(OWNER_EMAIL);

    const result = await duplicatePers(pers.persId);
    if (!result.success) throw new Error(result.error);
    const copy = await readCopyGraph(result.pers.persId);

    expect(copy.graph).toEqual(original.graph);
    expect(copy.pathSpecific).toMatchObject({
      userId: owner.id, name: "Складна (Копія)", folderId: folder.folderId, isPinned: true,
      shareToken: null, parentPersId: null, isSnapshot: false, isActive: true,
    });
  });

  it("копія теки", async () => {
    const { owner, folder, pers } = await createRichPers2024();
    const original = await readCopyGraph(pers.persId);
    signInAs(OWNER_EMAIL);

    const result = await duplicatePersFolder(folder.folderId);
    if (!result.success) throw new Error(result.error);
    const copy = await readCopyGraph(await findOnlyCopy({ persId: { not: pers.persId } }));

    expect(copy.graph).toEqual(original.graph);
    expect(copy.pathSpecific).toMatchObject({ userId: owner.id, shareToken: null, isSnapshot: false, isActive: true });
  });

  it("копія за посиланням на персонажа", async () => {
    const { copier, pers } = await createRichPers2024();
    const original = await readCopyGraph(pers.persId);
    signInAs(COPIER_EMAIL);

    const result = await copyPersByToken("copy-completeness-token");
    if (!("success" in result) || typeof result.persId !== "number") throw new Error(JSON.stringify(result));
    const copy = await readCopyGraph(result.persId);

    expect(copy.graph).toEqual(original.graph);
    expect(copy.pathSpecific).toMatchObject({
      userId: copier.id, name: "Складна (Копія)", folderId: null, isPinned: false, shareToken: null, isSnapshot: false, isActive: true,
    });
  });

  it("копія теки за посиланням", async () => {
    const { copier, folder, pers } = await createRichPers2024();
    const original = await readCopyGraph(pers.persId);
    await prisma.persFolderShareToken.create({ data: { folderId: folder.folderId, token: "folder-copy-token", canEdit: false } });
    signInAs(COPIER_EMAIL);

    const result = await copyFolderByShareToken("folder-copy-token");
    if (!("success" in result)) throw new Error(result.error);
    const copy = await readCopyGraph(await findOnlyCopy({ userId: copier.id }));

    expect(copy.graph).toEqual(original.graph);
    expect(copy.pathSpecific).toMatchObject({ userId: copier.id, shareToken: null, isSnapshot: false, isActive: true });
  });

  it("знімок рівня", async () => {
    const { owner, pers } = await createRichPers2024();
    const original = await readCopyGraph(pers.persId);

    const snapshotId = await createPersSnapshot(pers.persId);
    if (snapshotId === null) throw new Error("знімок не створено");
    const copy = await readCopyGraph(snapshotId);

    expect(copy.graph).toEqual(original.graph);
    expect(copy.pathSpecific).toMatchObject({
      userId: owner.id, name: "Складна (Рівень 7)", folderId: null, isPinned: false, shareToken: null,
      parentPersId: pers.persId, snapshotLevel: 7, isSnapshot: true, isActive: false,
    });
  });
});
