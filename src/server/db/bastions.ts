import type { PersBastion, PersBastionFacility, PersBastionTurn } from "@prisma/client";
import {
  ALL_BASTION_ORDER_CODES,
  type BastionFacilityData,
  type BastionOrderCode,
  type BastionSpace,
  describeHirelings,
  findAllowedOrderCodes,
  getBastionFacilityBySlug,
} from "@/lib/bastionsData";
import { prisma } from "@/lib/prisma";
import { bastionSpaceTranslations } from "@/lib/refs/translation";
import { findMainClassLevel } from "@/rules/hit-dice";
import { findHeroicInspirationHintForFacility } from "@/rules/heroic-inspiration";
import {
  type BastionAccess,
  type BastionCharacterProfile,
  type BastionFacilityMatch,
  findBastionAccess,
  findFacilityMatch,
  findSpellcastingFocuses,
  toBastionFeatureKey,
} from "@/rules/bastions";

export type BastionSpaceCode = keyof typeof bastionSpaceTranslations;
export type { BastionOrderCode };

export type BastionFacilityRecord = {
  facilityId: number;
  bastionId: number;
  facilitySlug: string;
  space: BastionSpaceCode;
  currentOrder: BastionOrderCode | null;
  defenders: number;
  hirelings: string;
  notes: string;
};

export type BastionTurnRecord = {
  turnId: number;
  bastionId: number;
  turnNumber: number;
  entry: string;
  createdAt: Date;
};

export type BastionRecord = {
  bastionId: number;
  persId: number;
  name: string;
  description: string;
  notes: string;
  facilities: BastionFacilityRecord[];
  turns: BastionTurnRecord[];
};

export type BastionStanding = {
  persId: number;
  persName: string;
  characterLevel: number;
  access: BastionAccess;
  bastion: BastionRecord | null;
};

export type BastionPicker = {
  persId: number;
  characterLevel: number;
  profile: BastionCharacterProfile;
  specialCount: number;
  facilityViews: BastionFacilityView[];
};

/// Каталог розвʼязується на сервері: сторінка персонажа не має тягнути 253 КБ
/// `generated/bastions.json` у браузер заради шести рядків (гейт KR20.6).
/// `name: null` означає, що слаґ із каталогу зник — рядок цілий, приміщення недоступне ([Р25](../../../docs/DECISIONS.md#р25)).
export type BastionFacilityView = {
  facilityId: number;
  slug: string;
  space: BastionSpaceCode;
  name: string | null;
  level: number | null;
  prerequisiteText: string;
  match: BastionFacilityMatch | null;
  currentOrder: BastionOrderCode | null;
  defenders: number;
  hirelings: string;
  notes: string;
  /// Каталог обмежує вибір лише як підказку в UI (Р26) — сервер приймає будь-який наказ.
  allowedOrderCodes: BastionOrderCode[];
  expectedHirelings: string;
  /// Приміщення дає Героїчне натхнення — підказка гравцю, а не автоматична видача (Р26).
  heroicInspirationHint: string | null;
};

const SPACE_CODES: Record<BastionSpace, BastionSpaceCode> = {
  cramped: "CRAMPED",
  roomy: "ROOMY",
  vast: "VAST",
};

export function toBastionSpaceCode(space: BastionSpace): BastionSpaceCode {
  return SPACE_CODES[space];
}

export async function createBastion(input: {
  persId: number;
  name: string;
  description?: string;
}): Promise<BastionRecord> {
  const row = await prisma.persBastion.create({
    data: {
      persId: input.persId,
      name: input.name,
      description: input.description ?? "",
    },
  });

  return { ...toBastionRecord(row), facilities: [], turns: [] };
}

export async function findBastionForPers(persId: number): Promise<BastionRecord | null> {
  const row = await prisma.persBastion.findUnique({ where: { persId } });
  if (!row) return null;

  const [facilities, turns] = await Promise.all([
    findBastionFacilities(row.persBastionId),
    findBastionTurns(row.persBastionId),
  ]);
  return { ...toBastionRecord(row), facilities, turns };
}

/// Усе, що сторінка й картка мусять знати про бастіон персонажа: сам бастіон із бази і
/// відповідь правил на «чи він цьому персонажу взагалі належить».
export async function findBastionStanding(persId: number): Promise<BastionStanding | null> {
  const pers = await prisma.pers.findUnique({
    where: { persId },
    select: { persId: true, name: true, level: true, ruleset: true },
  });
  if (!pers) return null;

  const bastion = await findBastionForPers(persId);

  return {
    persId: pers.persId,
    persName: pers.name,
    characterLevel: pers.level,
    access: findBastionAccess({
      ruleset: pers.ruleset,
      characterLevel: pers.level,
      hasBastion: bastion !== null,
    }),
    bastion,
  };
}

/// Профіль персонажа, з яким правила звіряють передумови приміщень. Фічі беруться і з
/// матеріалізованих рядків `pers_feature`, і з класових та підкласових, зароблених за рівнем:
/// Бойовий стиль воїна й Захист без обладунків монаха ніде не матеріалізуються, а саме їх
/// питає Штабна кімната.
export async function findBastionCharacterProfile(
  persId: number
): Promise<BastionCharacterProfile | null> {
  const pers = await prisma.pers.findUnique({
    where: { persId },
    select: {
      level: true,
      class: { select: { name: true, features: CLASS_FEATURE_SELECT } },
      subclass: { select: { name: true, features: CLASS_FEATURE_SELECT } },
      multiclasses: {
        select: {
          classLevel: true,
          class: { select: { name: true, features: CLASS_FEATURE_SELECT } },
          subclass: { select: { name: true, features: CLASS_FEATURE_SELECT } },
        },
      },
      features: { select: { feature: { select: { engName: true } } } },
      skills: { select: { name: true, proficiencyType: true } },
    },
  });
  if (!pers) return null;

  const mainClassLevel = findMainClassLevel(pers.level, pers.multiclasses);
  const earnedFeatures = [
    ...pers.features.map((row) => row.feature.engName),
    ...collectEarnedFeatureNames(pers.class, pers.subclass, mainClassLevel),
    ...pers.multiclasses.flatMap((multiclass) =>
      collectEarnedFeatureNames(multiclass.class, multiclass.subclass, multiclass.classLevel)
    ),
  ];

  return {
    characterLevel: pers.level,
    spellcastingFocuses: findSpellcastingFocuses([
      { className: pers.class.name, subclassName: pers.subclass?.name ?? null },
      ...pers.multiclasses.map((multiclass) => ({
        className: multiclass.class.name,
        subclassName: multiclass.subclass?.name ?? null,
      })),
    ]),
    featureKeys: [...new Set(earnedFeatures.map(toBastionFeatureKey))],
    skillProficiencies: pers.skills
      .filter((skill) => skill.proficiencyType !== "NONE")
      .map((skill) => skill.name),
    hasAnySkillExpertise: pers.skills.some((skill) => skill.proficiencyType === "EXPERTISE"),
  };
}

/// Усе, що потрібно пікеру: профіль для звірки передумов, уже додані приміщення й лічильник
/// спеціальних. Ліміт із них виводять чисті правила, а не цей модуль.
export async function findBastionPicker(persId: number): Promise<BastionPicker | null> {
  const [profile, bastion] = await Promise.all([
    findBastionCharacterProfile(persId),
    findBastionForPers(persId),
  ]);
  if (!profile) return null;

  const facilities = bastion?.facilities ?? [];

  return {
    persId,
    characterLevel: profile.characterLevel,
    profile,
    specialCount: countSpecialFacilities(facilities),
    facilityViews: facilities.map((facility) => toFacilityView(facility, profile)),
  };
}

function toFacilityView(
  facility: BastionFacilityRecord,
  profile: BastionCharacterProfile
): BastionFacilityView {
  const catalogFacility = getBastionFacilityBySlug(facility.facilitySlug);

  return {
    facilityId: facility.facilityId,
    slug: facility.facilitySlug,
    space: facility.space,
    name: catalogFacility?.name ?? null,
    level: catalogFacility?.level ?? null,
    prerequisiteText: catalogFacility?.prerequisiteText ?? "",
    match: catalogFacility ? findFacilityMatch(catalogFacility, profile) : null,
    currentOrder: facility.currentOrder,
    defenders: facility.defenders,
    hirelings: facility.hirelings,
    notes: facility.notes,
    allowedOrderCodes: catalogFacility ? findAllowedOrderCodes(catalogFacility) : ALL_BASTION_ORDER_CODES,
    expectedHirelings: catalogFacility ? describeHirelings(catalogFacility.hirelings) : "",
    heroicInspirationHint: findHeroicInspirationHintForFacility(facility.facilitySlug),
  };
}

function countSpecialFacilities(facilities: readonly BastionFacilityRecord[]): number {
  return facilities.filter(
    (facility) => getBastionFacilityBySlug(facility.facilitySlug)?.facilityType === "special"
  ).length;
}

const CLASS_FEATURE_SELECT = {
  select: { levelGranted: true, feature: { select: { engName: true } } },
} as const;

type FeatureSource = {
  features: { levelGranted: number; feature: { engName: string } }[];
} | null;

function collectEarnedFeatureNames(
  characterClass: FeatureSource,
  subclass: FeatureSource,
  classLevel: number
): string[] {
  return [characterClass, subclass]
    .flatMap((source) => source?.features ?? [])
    .filter((row) => row.levelGranted <= classLevel)
    .map((row) => row.feature.engName);
}

export async function findBastionFacilities(bastionId: number): Promise<BastionFacilityRecord[]> {
  const rows = await prisma.persBastionFacility.findMany({
    where: { persBastionId: bastionId },
    orderBy: { persBastionFacilityId: "asc" },
  });

  return rows.map(toBastionFacilityRecord);
}

/// `updatedAt` проставляється руками: колонка заведена як `DEFAULT now()`, а не як
/// `@updatedAt`, тому Prisma сама її не чіпає.
export async function updateBastionDetails(input: {
  bastionId: number;
  name: string;
  description: string;
  notes: string;
}): Promise<void> {
  await prisma.persBastion.update({
    where: { persBastionId: input.bastionId },
    data: {
      name: input.name,
      description: input.description,
      notes: input.notes,
      updatedAt: new Date(),
    },
  });
}

/// `updatedAt` проставляється руками — та сама пастка, що в `updateBastionDetails`.
export async function updateBastionFacilityState(input: {
  facilityId: number;
  currentOrder: BastionOrderCode | null;
  defenders: number;
  hirelings: string;
  notes: string;
}): Promise<BastionFacilityRecord> {
  const row = await prisma.persBastionFacility.update({
    where: { persBastionFacilityId: input.facilityId },
    data: {
      currentOrder: input.currentOrder,
      defenders: input.defenders,
      hirelings: input.hirelings,
      notes: input.notes,
      updatedAt: new Date(),
    },
  });

  return toBastionFacilityRecord(row);
}

export async function deleteBastion(bastionId: number): Promise<void> {
  await prisma.persBastion.delete({ where: { persBastionId: bastionId } });
}

export async function addBastionFacility(input: {
  bastionId: number;
  facility: BastionFacilityData;
  space: BastionSpace;
}): Promise<BastionFacilityRecord> {
  const row = await prisma.persBastionFacility.create({
    data: {
      persBastionId: input.bastionId,
      facilitySlug: input.facility.slug,
      space: toBastionSpaceCode(input.space),
    },
  });

  return toBastionFacilityRecord(row);
}

export async function removeBastionFacility(facilityId: number): Promise<void> {
  await prisma.persBastionFacility.delete({ where: { persBastionFacilityId: facilityId } });
}

export async function findBastionTurns(bastionId: number): Promise<BastionTurnRecord[]> {
  const rows = await prisma.persBastionTurn.findMany({
    where: { persBastionId: bastionId },
    orderBy: [{ turnNumber: "asc" }, { persBastionTurnId: "asc" }],
  });

  return rows.map(toBastionTurnRecord);
}

export async function addBastionTurn(input: {
  bastionId: number;
  turnNumber: number;
  entry: string;
}): Promise<BastionTurnRecord> {
  const row = await prisma.persBastionTurn.create({
    data: {
      persBastionId: input.bastionId,
      turnNumber: input.turnNumber,
      entry: input.entry,
    },
  });

  return toBastionTurnRecord(row);
}

/// `updatedAt` проставляється явно — та сама пастка `DEFAULT now()` замість `@updatedAt`, що в
/// `updateBastionDetails`. `createdAt` при редагуванні лишається днем запису.
export async function updateBastionTurn(input: {
  turnId: number;
  turnNumber: number;
  entry: string;
}): Promise<void> {
  await prisma.persBastionTurn.update({
    where: { persBastionTurnId: input.turnId },
    data: {
      turnNumber: input.turnNumber,
      entry: input.entry,
      updatedAt: new Date(),
    },
  });
}

export async function removeBastionTurn(turnId: number): Promise<void> {
  await prisma.persBastionTurn.delete({ where: { persBastionTurnId: turnId } });
}

function toBastionTurnRecord(row: PersBastionTurn): BastionTurnRecord {
  return {
    turnId: row.persBastionTurnId,
    bastionId: row.persBastionId,
    turnNumber: row.turnNumber,
    entry: row.entry,
    createdAt: row.createdAt,
  };
}

function toBastionRecord(row: PersBastion): Omit<BastionRecord, "facilities" | "turns"> {
  return {
    bastionId: row.persBastionId,
    persId: row.persId,
    name: row.name,
    description: row.description,
    notes: row.notes,
  };
}

function toBastionFacilityRecord(row: PersBastionFacility): BastionFacilityRecord {
  return {
    facilityId: row.persBastionFacilityId,
    bastionId: row.persBastionId,
    facilitySlug: row.facilitySlug,
    space: row.space,
    currentOrder: row.currentOrder,
    defenders: row.defenders,
    hirelings: row.hirelings,
    notes: row.notes,
  };
}
