import { type Prisma, type Ruleset } from "@prisma/client";
import { type CreatureData, buildCreatureKey, findCreatureByKey } from "@/lib/bestiaryData";
import { prisma } from "@/lib/prisma";
import { findMainClassLevel } from "@/rules/hit-dice";
import {
  type WildshapeContext,
  type WildshapeEligibility,
  type WildshapeLimits,
  describeWildshapeLimits,
  findDruidStanding,
  findKnownFormsLimit,
  findWildshapeEligibility,
  findWildshapeLimits,
  parseCreatureHitPoints,
} from "@/rules/wildshape";

/// Прикріплена форма з розвʼязаним статблоком. `creature: null` означає, що істота більше не в
/// каталозі — рядок цілий, форма недоступна. Це навмисно не помилка: див. Р25.
export type AttachedForm = {
  wildshapeId: number;
  key: string;
  ruleset: Ruleset;
  sortOrder: number;
  notes: string;
  creature: CreatureData | null;
  eligibility: WildshapeEligibility | null;
};

/// `limitNotes` малює картка на листі — щоб пороги рівнів лишалися в правилах, а не в UI.
/// `knownFormsLimit` — `null` у 2014, де такого обмеження немає взагалі.
export type WildshapeStanding = WildshapeContext & {
  limits: WildshapeLimits | null;
  limitNotes: string[];
  knownFormsLimit: number | null;
};

export async function findAttachedForms(persId: number): Promise<AttachedForm[]> {
  const [rows, standing] = await Promise.all([
    prisma.persWildshape.findMany({
      where: { persId: persId },
      orderBy: [{ sortOrder: "asc" }, { persWildshapeId: "asc" }],
    }),
    findWildshapeStanding(persId),
  ]);

  return rows.map((row) => resolveForm(row, standing));
}

export async function attachForm(input: {
  persId: number;
  creature: Pick<CreatureData, "nameEng">;
  ruleset: Ruleset;
  sortOrder?: number;
  notes?: string;
}): Promise<AttachedForm> {
  const key = buildCreatureKey(input.creature);
  const where = { persId_creatureKey_ruleset: { persId: input.persId, creatureKey: key, ruleset: input.ruleset } };

  const row = await prisma.persWildshape.upsert({
    where,
    update: { sortOrder: input.sortOrder ?? 0 },
    create: {
      persId: input.persId,
      creatureKey: key,
      ruleset: input.ruleset,
      sortOrder: input.sortOrder ?? 0,
      notes: input.notes ?? "",
    },
  });

  const standing = await findWildshapeStanding(input.persId);
  return resolveForm(row, standing);
}

export async function detachForm(wildshapeId: number): Promise<void> {
  await prisma.persWildshape.delete({ where: { persWildshapeId: wildshapeId } });
}

/// Скільки форм персонаж уже тримає — для порівняння з межею відомих форм 2024. Рахуємо
/// запитом, а не довжиною `findAttachedForms`: там кожен рядок ще й розвʼязується в статблок.
export async function countAttachedForms(persId: number): Promise<number> {
  return prisma.persWildshape.count({ where: { persId: persId } });
}

/// Тимчасові ХП 2024 — справжній стан персонажа, а не намальоване число: гравець витрачає їх у
/// звичайному блоці хітів, як будь-які інші. Не додаються до наявних, а беруть більше — так
/// само, як тимчасові хіти не складаються за правилами.
export async function grantTemporaryHitPoints(persId: number, amount: number): Promise<void> {
  const pers = await prisma.pers.findUnique({ where: { persId }, select: { tempHp: true } });
  if (!pers || amount <= pers.tempHp) return;

  await prisma.pers.update({ where: { persId }, data: { tempHp: amount } });
}

/// Персонаж, чию Дику форму бестіарій бере в контекст. `limits` тут ніколи не `null`: список
/// віддає лише тих, у кого фіча справді є.
export type WildshapeCharacter = WildshapeStanding & { persId: number; name: string };

/// Усе, від чого залежить рівень друїда: основний клас, підклас і мультикласи.
const STANDING_SELECT = {
  level: true,
  ruleset: true,
  class: { select: { name: true } },
  subclass: { select: { name: true } },
  multiclasses: {
    select: { classLevel: true, class: { select: { name: true } }, subclass: { select: { name: true } } },
  },
} satisfies Prisma.PersSelect;

type PersStandingRow = Prisma.PersGetPayload<{ select: typeof STANDING_SELECT }>;

/// Рівень друїда й коло — з бази; таблиця обмежень — з чистих правил.
export async function findWildshapeStanding(persId: number): Promise<WildshapeStanding> {
  const pers = await prisma.pers.findUnique({ where: { persId }, select: STANDING_SELECT });
  if (!pers) return buildStanding({ druidLevel: 0, isMoonCircle: false, ruleset: "RULES_2014" });

  return findStandingOfPers(pers);
}

/// Персонажі гравця, у яких Дика форма справді є. Порожній список — не помилка, а стан: без
/// друїда секція фільтра бестіарію просто не показується.
export async function findWildshapeCharacters(userId: number): Promise<WildshapeCharacter[]> {
  const rows = await prisma.pers.findMany({
    where: { userId, isSnapshot: false, isActive: true },
    select: { persId: true, name: true, ...STANDING_SELECT },
    orderBy: { updatedAt: "desc" },
  });

  return rows
    .map((row) => ({ persId: row.persId, name: row.name, ...findStandingOfPers(row) }))
    .filter((character) => character.limits !== null);
}

function findStandingOfPers(pers: PersStandingRow): WildshapeStanding {
  const standing = findDruidStanding([
    {
      className: pers.class.name,
      classLevel: findMainClassLevel(pers.level, pers.multiclasses),
      subclassName: pers.subclass?.name ?? null,
    },
    ...pers.multiclasses.map((multiclass) => ({
      className: multiclass.class.name,
      classLevel: multiclass.classLevel,
      subclassName: multiclass.subclass?.name ?? null,
    })),
  ]);

  return buildStanding({ ...standing, ruleset: pers.ruleset });
}

/// Редакція — параметр правил, а не константа: обидві таблиці Звіриних форм живуть у правилах,
/// і персонаж 2024 дістає свою (KR24.6), не переходячи в іншу гілку коду.
function buildStanding(context: WildshapeContext): WildshapeStanding {
  return {
    ...context,
    limits: findWildshapeLimits(context),
    limitNotes: describeWildshapeLimits(context),
    knownFormsLimit: findKnownFormsLimit(context),
  };
}

/// Стан перевтілення: у якій формі персонаж зараз і скільки в неї лишилось хітів.
export type ActiveBeastForm = {
  wildshapeId: number;
  key: string;
  ruleset: Ruleset;
  creature: CreatureData | null;
  beastCurrentHp: number;
  beastMaxHp: number;
};

export async function findActiveForm(persId: number): Promise<ActiveBeastForm | null> {
  const row = await prisma.persWildshape.findFirst({
    where: { persId: persId, isActive: true },
  });
  if (!row) return null;

  const creature = findCreatureByKey(row.creatureKey, row.ruleset);
  const beastMaxHp = creature ? parseCreatureHitPoints(creature.hp) ?? 0 : 0;

  return {
    wildshapeId: row.persWildshapeId,
    key: row.creatureKey,
    ruleset: row.ruleset,
    creature,
    beastCurrentHp: row.currentHp ?? beastMaxHp,
    beastMaxHp,
  };
}

/// Спершу гасимо попередню форму, потім вмикаємо нову, і обидва кроки в одній транзакції:
/// частковий унікальний індекс `pers_wildshape_one_active_per_pers` не дозволить двом рядкам
/// того самого персонажа бути активними одночасно — це інваріант бази, не коду.
/// `beastCurrentHp === null` — редакція 2024: окремого стосу хітів звіра там немає, і рядок
/// форми не має вдавати, що він є.
export async function enterBeastForm(wildshapeId: number, beastCurrentHp: number | null): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const form = await tx.persWildshape.findUniqueOrThrow({
      where: { persWildshapeId: wildshapeId },
      select: { persId: true },
    });

    await tx.persWildshape.updateMany({
      where: { persId: form.persId, isActive: true },
      data: { isActive: false, currentHp: null },
    });

    await tx.persWildshape.update({
      where: { persWildshapeId: wildshapeId },
      data: { isActive: true, currentHp: beastCurrentHp },
    });
  });
}

export async function leaveBeastForm(persId: number): Promise<void> {
  await prisma.persWildshape.updateMany({
    where: { persId: persId, isActive: true },
    data: { isActive: false, currentHp: null },
  });
}

export async function setBeastHitPoints(wildshapeId: number, beastCurrentHp: number): Promise<void> {
  await prisma.persWildshape.update({
    where: { persWildshapeId: wildshapeId },
    data: { currentHp: beastCurrentHp },
  });
}

type WildshapeRow = {
  persWildshapeId: number;
  creatureKey: string;
  ruleset: Ruleset;
  sortOrder: number;
  notes: string;
};

function resolveForm(row: WildshapeRow, context: WildshapeContext): AttachedForm {
  const creature = findCreatureByKey(row.creatureKey, row.ruleset);

  return {
    wildshapeId: row.persWildshapeId,
    key: row.creatureKey,
    ruleset: row.ruleset,
    sortOrder: row.sortOrder,
    notes: row.notes,
    creature,
    eligibility: creature ? findWildshapeEligibility(creature, context) : null,
  };
}
