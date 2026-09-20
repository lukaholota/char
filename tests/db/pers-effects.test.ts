/**
 * O39 — концентрація, бафи й виснаження наскрізь: серверні дії листа пишуть `pers_effect` і
 * `pers.exhaustion_level`, відпочинки їх чистять, Лють зриває концентрацію, а лист (той самий
 * шар, що на сторінці) бачить Обладунок мага в КБ.
 */

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";
import { setConcentration, setExhaustion, setSpellBuff } from "@/server/db/pers-effects";
import { setFeatureActive } from "@/server/db/feature-uses";
import { getPersById } from "@/server/db/pers-actions";
import { longRest, shortRest } from "@/server/db/rest-actions";
import { applyActiveStates } from "@/lib/logic/active-states";
import { calculateFinalAC } from "@/lib/logic/bonus-calculator";

const EMAIL = "pers-effects@test.local";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

async function createCharacter(className: Parameters<typeof classByName>[0]) {
  const [cls, race, background] = await Promise.all([classByName(className), raceByName("HUMAN_2024"), backgroundByName("ACOLYTE")]);
  const user = await prisma.user.create({ data: { email: EMAIL, name: "Тестовий гравець" } });
  vi.mocked(auth).mockResolvedValue({ user: { email: EMAIL } } as never);

  const pers = await prisma.pers.create({
    data: {
      userId: user.id,
      name: `O39 — ${className}`,
      ruleset: "RULES_2024",
      classId: cls.classId,
      raceId: race.raceId,
      backgroundId: background.backgroundId,
      level: 5,
      currentHp: 30,
      maxHp: 30,
      str: 10, dex: 16, con: 14, int: 18, wis: 12, cha: 10,
    },
  });
  const classFeatures = await prisma.classFeature.findMany({ where: { classId: cls.classId, levelGranted: { lte: 5 } }, select: { featureId: true } });
  await prisma.persFeature.createMany({ data: classFeatures.map(({ featureId }) => ({ persId: pers.persId, featureId })) });
  return pers.persId;
}

const findSpellId = async (engName: string) =>
  (await prisma.spell.findUniqueOrThrow({ where: { engName_ruleset: { engName, ruleset: "RULES_2024" } } })).spellId;

const listEffectKeys = async (persId: number) =>
  (await prisma.persEffect.findMany({ where: { persId }, orderBy: { effectKey: "asc" } })).map((row) => row.effectKey);

describe("O39 — концентрація й бафи", () => {
  it("нова концентрація зриває попередню разом із бафом, що на ній тримався; Обладунок мага лишається", async () => {
    const persId = await createCharacter("WIZARD_2024");
    const [haste, bless, mageArmor] = await Promise.all([findSpellId("Haste"), findSpellId("Bless"), findSpellId("Mage Armor")]);

    expect(await setConcentration({ persId, spellId: haste })).toEqual({ success: true });
    await setSpellBuff({ persId, effectKey: "HASTE", isActive: true, spellId: haste, endsWithConcentration: true });
    await setSpellBuff({ persId, effectKey: "MAGE_ARMOR", isActive: true, spellId: mageArmor, endsWithConcentration: false });
    expect(await listEffectKeys(persId)).toEqual(["CONCENTRATION", "HASTE", "MAGE_ARMOR"]);

    await setConcentration({ persId, spellId: bless });
    expect(await listEffectKeys(persId)).toEqual(["CONCENTRATION", "MAGE_ARMOR"]);
    expect((await prisma.persEffect.findFirstOrThrow({ where: { persId, effectKey: "CONCENTRATION" } })).spellId).toBe(bless);
  });

  it("лист бачить Обладунок мага: КБ 10 + 3 → 13 + 3", async () => {
    const persId = await createCharacter("WIZARD_2024");
    const before = calculateFinalAC(applyActiveStates((await getPersById(persId))!));

    await setSpellBuff({ persId, effectKey: "MAGE_ARMOR", isActive: true, spellId: await findSpellId("Mage Armor"), endsWithConcentration: false });
    const after = calculateFinalAC(applyActiveStates((await getPersById(persId))!));

    expect([before, after]).toEqual([13, 16]);
  });

  it("повтор операції з черги дає той самий стан, невідомий ключ відкидається", async () => {
    const persId = await createCharacter("WIZARD_2024");
    await setSpellBuff({ persId, effectKey: "LONGSTRIDER", isActive: true, spellId: null, endsWithConcentration: false });
    await setSpellBuff({ persId, effectKey: "LONGSTRIDER", isActive: true, spellId: null, endsWithConcentration: false });
    expect(await listEffectKeys(persId)).toEqual(["LONGSTRIDER"]);

    expect(await setSpellBuff({ persId, effectKey: "FIREBALL", isActive: true, spellId: null, endsWithConcentration: false })).toEqual({
      success: false,
      error: "Невідомий ефект",
    });
  });
});

describe("O39 — відпочинки й виснаження", () => {
  it("короткий відпочинок лишає Обладунок мага, довгий знімає все й один рівень виснаження", async () => {
    const persId = await createCharacter("WIZARD_2024");
    await setConcentration({ persId, spellId: await findSpellId("Haste") });
    await setSpellBuff({ persId, effectKey: "MAGE_ARMOR", isActive: true, spellId: null, endsWithConcentration: false });
    await setExhaustion({ persId, level: 3 });

    expect((await shortRest(persId, [])).success).toBe(true);
    expect(await listEffectKeys(persId)).toEqual(["MAGE_ARMOR"]);

    expect((await longRest(persId)).success).toBe(true);
    expect(await listEffectKeys(persId)).toEqual([]);
    expect((await prisma.pers.findUniqueOrThrow({ where: { persId } })).exhaustionLevel).toBe(2);
  });

  it("виснаження тримається в межах 0–6", async () => {
    const persId = await createCharacter("WIZARD_2024");
    await setExhaustion({ persId, level: 11 });
    expect((await prisma.pers.findUniqueOrThrow({ where: { persId } })).exhaustionLevel).toBe(6);
  });
});

describe("O39 — Лють зриває концентрацію", () => {
  it("варвар, що концентрувався, вмикає Лють — концентрації більше немає", async () => {
    const persId = await createCharacter("BARBARIAN_2024");
    const rage = await prisma.feature.findUniqueOrThrow({ where: { engName: "Barbarian: Rage (2024)" } });
    await setConcentration({ persId, spellId: await findSpellId("Bless") });

    expect((await setFeatureActive({ persId, featureId: rage.featureId, isActive: true })).success).toBe(true);
    expect(await listEffectKeys(persId)).toEqual([]);
  });
});
