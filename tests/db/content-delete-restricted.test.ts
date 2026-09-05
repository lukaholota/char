import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { mergeDuplicateSpells2014 } from "../../prisma/seed/spellDuplicateMerge2014";
import { disconnectDatabase, resetUserData } from "../user-data";

/// KR22.1. До 2026-08-29 усі 15 явних звʼязків «персонаж → контент» були ON DELETE CASCADE,
/// тобто `DELETE FROM class WHERE …` зносив усіх персонажів цього класу, а видалення
/// заклинання виймало його з 24 942 списків. Через це перезасів контенту був потенційним
/// знищенням даних користувачів — і саме це робило міну 472/248 у предметах небезпечною.
///
/// Тест поведінковий, а не структурний: він створює персонажа, пробує видалити контент, на
/// який той посилається, і вимагає, щоб база відмовила. Структурна перевірка йде слідом —
/// вона ловить констрейнт, який завели пізніше й забули.

beforeEach(resetUserData);
afterAll(disconnectDatabase);

const EXPECTED_RESTRICTED = [
  "pers_background_id_fkey",
  "pers_class_id_fkey",
  "pers_race_id_fkey",
  "pers_subclass_id_fkey",
  "pers_subrace_id_fkey",
  "pers_armor_armor_id_fkey",
  "pers_feat_feat_id_fkey",
  "pers_feat_choice_choice_option_id_fkey",
  "pers_feature_feature_id_fkey",
  "pers_infusion_infusion_id_fkey",
  "pers_magic_item_magic_item_id_fkey",
  "pers_multiclass_class_id_fkey",
  "pers_multiclass_subclass_id_fkey",
  "pers_spell_spell_id_fkey",
  "pers_weapon_weapon_id_fkey",
];

/// `confdeltype`: 'c' — cascade, 'r' — restrict, 'a' — no action, 'n' — set null.
const DELETE_RULES_QUERY = `
  SELECT con.conname AS name, con.confdeltype::text AS rule
    FROM pg_constraint con
   WHERE con.contype = 'f'
     AND con.conname = ANY($1::text[])
`;

async function findDeleteRules(): Promise<Map<string, string>> {
  const rows = await prisma.$queryRawUnsafe<{ name: string; rule: string }[]>(
    DELETE_RULES_QUERY,
    EXPECTED_RESTRICTED
  );

  return new Map(rows.map((row) => [row.name, row.rule]));
}

async function createPersWithSpell() {
  const [characterClass, race, background, spell] = await Promise.all([
    prisma.class.findFirstOrThrow({ where: { ruleset: "RULES_2014" } }),
    prisma.race.findFirstOrThrow({ where: { ruleset: "RULES_2014" } }),
    prisma.background.findFirstOrThrow({ where: { ruleset: "RULES_2014" } }),
    prisma.spell.findFirstOrThrow({ where: { ruleset: "RULES_2014" } }),
  ]);

  const user = await prisma.user.create({
    data: { email: "restrict-gate@example.test", name: "Тестовий гравець" },
  });

  const pers = await prisma.pers.create({
    data: {
      userId: user.id,
      name: "Персонаж під каскадом",
      ruleset: "RULES_2014",
      classId: characterClass.classId,
      raceId: race.raceId,
      backgroundId: background.backgroundId,
      level: 3,
      currentHp: 24,
      maxHp: 24,
      str: 12,
      dex: 14,
      con: 13,
      int: 10,
      wis: 11,
      cha: 8,
    },
  });

  await prisma.persSpell.create({
    data: { persId: pers.persId, spellId: spell.spellId, learnedAtLevel: 1 },
  });

  return { pers, characterClass, race, background, spell };
}

/// Пара створюється тут, а не береться з каталогу: злиття видаляє рядок назавжди, і тест,
/// який зʼїдає справжнє заклинання, при другому прогоні міряє вже іншу базу.
async function createDuplicatePair() {
  const shared = {
    school: "Втілення",
    castingTime: "1 дія",
    range: "18 м",
    duration: "Миттєво",
    description: "Запис існує лише для тесту RESTRICT.",
    level: 1,
    ruleset: "RULES_2014" as const,
  };

  const keeper = await prisma.spell.create({
    data: { ...shared, name: "Тестова рука (лишається)", engName: "Restrict Gate Keeper" },
  });
  const doomed = await prisma.spell.create({
    data: { ...shared, name: "Тестова рука (зникає)", engName: "Restrict Gate Doomed" },
  });

  return [keeper, doomed];
}

/// Спроба видалення завжди йде в транзакції, яка гарантовано відкочується. Причина записана
/// кровʼю: перший варіант тесту видаляв напряму, і коли констрейнт **навмисно** повернули в
/// CASCADE, щоб перевірити гейт на червоному, видалення пройшло — з `spells_test` зник клас
/// Бард разом зі своїм спорядженням. Тест, який доводить небезпеку каскаду, не має бути її
/// першою жертвою.
const ROLLBACK = "навмисний відкат перевірки видалення";

type TransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function expectDeleteRefused(
  remove: (tx: TransactionClient) => Promise<unknown>
): Promise<void> {
  let refusal: Error | null = null;

  try {
    await prisma.$transaction(async (tx) => {
      await remove(tx);
      throw new Error(ROLLBACK);
    });
  } catch (error) {
    refusal = error as Error;
  }

  expect(refusal, "видалення пройшло — база не відмовила").not.toBeNull();
  expect(refusal!.message).not.toContain(ROLLBACK);
}

describe("видалення контенту не тягне за собою персонажа", () => {
  it("клас, на який посилається персонаж, видалити не можна", async () => {
    const { characterClass, pers } = await createPersWithSpell();

    await expectDeleteRefused((tx) =>
      tx.class.delete({ where: { classId: characterClass.classId } })
    );

    const survivor = await prisma.pers.findUnique({ where: { persId: pers.persId } });
    expect(survivor).not.toBeNull();
  });

  it("расу й походження теж не можна", async () => {
    const { race, background, pers } = await createPersWithSpell();

    await expectDeleteRefused((tx) => tx.race.delete({ where: { raceId: race.raceId } }));
    await expectDeleteRefused((tx) =>
      tx.background.delete({ where: { backgroundId: background.backgroundId } })
    );

    const survivor = await prisma.pers.findUnique({ where: { persId: pers.persId } });
    expect(survivor).not.toBeNull();
  });

  it("заклинання, яке лежить у списку персонажа, видалити не можна", async () => {
    const { spell, pers } = await createPersWithSpell();

    await expectDeleteRefused((tx) => tx.spell.delete({ where: { spellId: spell.spellId } }));

    const stillLearned = await prisma.persSpell.count({ where: { persId: pers.persId } });
    expect(stillLearned).toBe(1);
  });

  /// Головне заперечення проти RESTRICT: «а чи не поламає це сіди». Єдиний сід, який видаляє
  /// контентний рядок, — злиття дублікатів заклинань. Він перепризначає `pers_spell` ДО
  /// видалення, тобто на каскад не спирався ніколи. Тут це показано, а не сказано.
  it("сід злиття дублікатів працює під RESTRICT — він перепризначає списки до видалення", async () => {
    const { pers } = await createPersWithSpell();
    const [keeper, doomed] = await createDuplicatePair();

    await prisma.persSpell.create({
      data: { persId: pers.persId, spellId: doomed.spellId, learnedAtLevel: 2 },
    });

    const outcome = await mergeDuplicateSpells2014(prisma, [
      { keep: keeper.engName, drop: doomed.engName },
    ]);

    expect(outcome.merged).toHaveLength(1);
    expect(outcome.merged[0].persSpellsMoved).toBe(1);

    const doomedGone = await prisma.spell.findUnique({ where: { spellId: doomed.spellId } });
    expect(doomedGone).toBeNull();

    const moved = await prisma.persSpell.findFirst({
      where: { persId: pers.persId, spellId: keeper.spellId },
    });
    expect(moved).not.toBeNull();

    await prisma.persSpell.deleteMany({ where: { spellId: keeper.spellId } });
    await prisma.spell.delete({ where: { spellId: keeper.spellId } });
  });

  it("усі 15 звʼязків «персонаж → контент» мають правило RESTRICT", async () => {
    const rules = await findDeleteRules();

    const missing = EXPECTED_RESTRICTED.filter((name) => !rules.has(name));
    expect(missing).toEqual([]);

    const stillCascading = EXPECTED_RESTRICTED.filter((name) => rules.get(name) !== "r");
    expect(stillCascading).toEqual([]);
  });
});
