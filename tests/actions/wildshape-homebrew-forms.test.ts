import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Ruleset } from "@prisma/client";
import { getAllCreatures } from "@/lib/bestiaryData";
import { buildHomebrewCreatureKey } from "@/lib/logic/homebrew-catalog";
import { prisma } from "@/lib/prisma";
import { attachWildshapeForm, enterWildshapeForm, loadWildshapeForms } from "@/server/db/wildshape-actions";
import { saveHomebrewCreature } from "@/lib/actions/homebrew-actions";
import { buildPrintableCreatureCardHtml } from "@/server/pdf/creaturesPdf";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";

/// O47: пікер форм — це бестіарій, а в ньому є й хоумбрю-істоти з ключем `homebrew-<id>`.
/// Сервер мусить розвʼязувати такий ключ із бази, а не шукати його в статичному каталозі.

beforeEach(resetUserData);
afterAll(disconnectDatabase);

const catalogWolf = () => getAllCreatures("RULES_2014").find((creature) => creature.nameEng === "Wolf")!;

async function createDruid(email: string) {
  const [druidClass, race, background] = await Promise.all([classByName("DRUID_2014"), raceByName("HUMAN_2014"), backgroundByName("ACOLYTE")]);
  const user = await prisma.user.create({ data: { email, name: "Тестовий гравець" } });
  const pers = await prisma.pers.create({
    data: {
      userId: user.id,
      name: "Друїд із хоумбрю",
      ruleset: "RULES_2014",
      classId: druidClass.classId,
      raceId: race.raceId,
      backgroundId: background.backgroundId,
      level: 4,
      currentHp: 20,
      maxHp: 20,
      str: 10,
      dex: 14,
      con: 14,
      int: 12,
      wis: 16,
      cha: 8,
    },
  });
  vi.mocked(auth).mockResolvedValue({ user: { email } } as never);
  return { user, pers };
}

async function createHomebrewBeast(authorUserId: number, input: { name: string; hp: string; ruleset?: Ruleset | null }) {
  const wolf = catalogWolf();
  const entry = await prisma.homebrewEntry.create({
    data: { kind: "CREATURE", authorUserId, ruleset: input.ruleset === undefined ? "RULES_2014" : input.ruleset, name: input.name },
  });
  await prisma.homebrewCreature.create({
    data: {
      homebrewEntryId: entry.homebrewEntryId,
      engName: wolf.nameEng,
      size: wolf.size,
      type: wolf.type,
      challenge: wolf.challenge,
      statBlock: { ...wolf, name: input.name, hp: input.hp },
    },
  });
  return entry;
}

describe("дика форма з хоумбрю-істоти", () => {
  it("прикріплюється за ключем бестіарію й читається на листі зі своїм статблоком", async () => {
    const { user, pers } = await createDruid("hb-wildshape-attach@example.test");
    const beast = await createHomebrewBeast(user.id, { name: "Тіньовий вовк", hp: "33 (6d8 + 6)" });

    const attached = await attachWildshapeForm({ persId: pers.persId, creatureKey: buildHomebrewCreatureKey(beast.homebrewEntryId), ruleset: "RULES_2014" });
    if (!attached.ok) throw new Error(attached.error);

    const sheet = await loadWildshapeForms(pers.persId);
    if (!sheet.ok) throw new Error(sheet.error);
    expect(sheet.forms.map((form) => [form.key, form.creature?.name, form.creature?.source])).toEqual([
      [buildHomebrewCreatureKey(beast.homebrewEntryId), "Тіньовий вовк", "HOMEBREW"],
    ]);
    expect(sheet.forms[0].eligibility?.eligible).toBe(true);
  });

  it("хоумбрю з англ. назвою каталожного вовка лишається хоумбрю, а не стає вовком", async () => {
    const { user, pers } = await createDruid("hb-wildshape-collision@example.test");
    const beast = await createHomebrewBeast(user.id, { name: "Тіньовий вовк", hp: "33 (6d8 + 6)" });

    const attached = await attachWildshapeForm({ persId: pers.persId, creatureKey: buildHomebrewCreatureKey(beast.homebrewEntryId), ruleset: "RULES_2014" });
    if (!attached.ok) throw new Error(attached.error);

    expect(attached.form.key).toBe(buildHomebrewCreatureKey(beast.homebrewEntryId));
    expect(attached.form.creature?.name).toBe("Тіньовий вовк");
  });

  it("вхід у форму бере хіти звіра з хоумбрю-статблока", async () => {
    const { user, pers } = await createDruid("hb-wildshape-enter@example.test");
    const beast = await createHomebrewBeast(user.id, { name: "Тіньовий вовк", hp: "33 (6d8 + 6)" });
    const attached = await attachWildshapeForm({ persId: pers.persId, creatureKey: buildHomebrewCreatureKey(beast.homebrewEntryId), ruleset: "RULES_2014" });
    if (!attached.ok) throw new Error(attached.error);

    const entered = await enterWildshapeForm({ persId: pers.persId, wildshapeId: attached.form.wildshapeId });
    if (!entered.ok) throw new Error(entered.error);

    expect([entered.active.beastCurrentHp, entered.active.beastMaxHp]).toEqual([33, 33]);
  });

  it("хоумбрю для обох редакцій прикріплюється до друїда 2014", async () => {
    const { user, pers } = await createDruid("hb-wildshape-both@example.test");
    const beast = await createHomebrewBeast(user.id, { name: "Спільний вовк", hp: "11 (2d8 + 2)", ruleset: null });

    const attached = await attachWildshapeForm({ persId: pers.persId, creatureKey: buildHomebrewCreatureKey(beast.homebrewEntryId), ruleset: "RULES_2014" });

    expect(attached.ok && attached.form.creature?.name).toBe("Спільний вовк");
  });

  it("видалене автором хоумбрю лишає рядок форми, але форма недоступна", async () => {
    const { user, pers } = await createDruid("hb-wildshape-deleted@example.test");
    const beast = await createHomebrewBeast(user.id, { name: "Тіньовий вовк", hp: "33 (6d8 + 6)" });
    const attached = await attachWildshapeForm({ persId: pers.persId, creatureKey: buildHomebrewCreatureKey(beast.homebrewEntryId), ruleset: "RULES_2014" });
    if (!attached.ok) throw new Error(attached.error);

    await prisma.homebrewEntry.update({ where: { homebrewEntryId: beast.homebrewEntryId }, data: { deletedAt: new Date() } });

    const sheet = await loadWildshapeForms(pers.persId);
    if (!sheet.ok) throw new Error(sheet.error);
    expect(sheet.forms.map((form) => [form.key, form.creature])).toEqual([[buildHomebrewCreatureKey(beast.homebrewEntryId), null]]);
  });

  it("хоумбрю, створене формою сайту, стає формою, і друк малює його картку", async () => {
    const { pers } = await createDruid("hb-wildshape-print@example.test");
    const form = new FormData();
    form.set("values", JSON.stringify({
      ruleset: "RULES_2014", name: "Болотний пес", engName: "", size: "Середній", type: "Звір", alignment: "",
      ac: "13", hp: "22 (4к8 + 4)", speed: "40 фт.", strength: 14, dexterity: 15, constitution: 12, intelligence: 3, wisdom: 12, charisma: 6,
      challenge: "1/2", actions: "**Укус.** +4 на влучання.",
    }));
    const saved = await saveHomebrewCreature(form);
    if (!saved.success) throw new Error(saved.error ?? JSON.stringify(saved.fieldErrors));

    const attached = await attachWildshapeForm({ persId: pers.persId, creatureKey: buildHomebrewCreatureKey(saved.entryId), ruleset: "RULES_2014" });
    if (!attached.ok) throw new Error(attached.error);
    const entered = await enterWildshapeForm({ persId: pers.persId, wildshapeId: attached.form.wildshapeId });
    if (!entered.ok) throw new Error(entered.error);
    const card = await buildPrintableCreatureCardHtml(attached.form.creature!);

    expect(entered.active.beastMaxHp).toBe(22);
    expect(card).toContain("Болотний пес");
    expect(card).toContain("22 (4к8 + 4)");
    expect(card).toContain("Укус.");
  });

  it("каталожний вовк прикріплюється як і раніше", async () => {
    const { pers } = await createDruid("hb-wildshape-catalog@example.test");

    const attached = await attachWildshapeForm({ persId: pers.persId, creatureKey: "wolf", ruleset: "RULES_2014" });

    expect(attached.ok && [attached.form.key, attached.form.creature?.nameEng]).toEqual(["wolf", "Wolf"]);
  });
});
