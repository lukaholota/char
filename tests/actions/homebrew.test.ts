/**
 * Хоумбрю спільноти: заклинання й істоти користувачів (KR31.16), редакція «обидві» (KR31.17).
 * Сховище картинок підмінене памʼяттю.
 */

import sharp from "sharp";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { disconnectDatabase, resetUserData } from "../user-data";
import { signInAs } from "../helpers/signed-in-users";

const stored = vi.hoisted(() => new Map<string, Uint8Array>());

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));
vi.mock("@/server/media/media-store", () => ({
  isMediaStoreConfigured: () => true,
  putMediaObject: async (key: string, bytes: Uint8Array) => void stored.set(key, bytes),
  deleteMediaObject: async (key: string) => void stored.delete(key),
}));

import { deleteHomebrewEntry, listCreatureSpellChoices, listHomebrewEntries, loadHomebrewEditValues, loadHomebrewEntry, saveHomebrewCreature, saveHomebrewItem, saveHomebrewSpell } from "@/lib/actions/homebrew-actions";
import { toggleMagicItemForPers } from "@/lib/actions/magic-item-actions";
import { prisma } from "@/lib/prisma";
import { BackgroundCategory, Classes, Races } from "@prisma/client";
import { createCharacter } from "@/lib/actions/character";
import { minimalForm } from "../helpers/build-form";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";

vi.setConfig({ testTimeout: 60_000 });

beforeEach(async () => {
  stored.clear();
  await resetUserData();
});
afterAll(disconnectDatabase);

const SPELL = {
  ruleset: "RULES_2014", name: "Вогняний їжак", engName: "Fire Hedgehog", level: 2, school: "Втілення",
  castingTime: "1 дія", range: "60 футів", components: "В, С", duration: "Миттєва",
  isRitual: false, isConcentration: false, classes: ["WIZARD_2014"], description: "Їжак вибухає.",
};

const CREATURE = {
  ruleset: "RULES_2014", name: "Болотний пес", engName: "", size: "Середній", type: "Звір", alignment: "",
  ac: "13", hp: "22 (4к8 + 4)", speed: "40 фт.", strength: 14, dexterity: 15, constitution: 12, intelligence: 3, wisdom: 12, charisma: 6,
  challenge: "1/2", actions: "**Укус.** +4 на влучання.",
};

describe("хоумбрю спільноти", () => {
  it("запис своєї редакції видно лише в ній, запис «обидві» — в обох, із класами обох редакцій", async () => {
    await signInAs("author");
    const only2014 = await saveHomebrewSpell({ values: SPELL });
    const both = await saveHomebrewSpell({ values: { ...SPELL, name: "Спільний їжак", ruleset: "ANY", classes: ["WIZARD_2014", "BARD_2024"] } });
    if (!only2014.success || !both.success) throw new Error("не збережено");

    const in2014 = await listHomebrewEntries({ kind: "SPELL", ruleset: "RULES_2014", sort: "NEW" });
    const in2024 = await listHomebrewEntries({ kind: "SPELL", ruleset: "RULES_2024", sort: "NEW" });
    expect(in2014.map((entry) => entry.name).sort()).toEqual(["Вогняний їжак", "Спільний їжак"]);
    expect(in2024.map((entry) => [entry.name, entry.edition])).toEqual([["Спільний їжак", "ANY"]]);
    expect(in2024[0]).toMatchObject({ kind: "SPELL", spell: { ruleset: "RULES_2024", spellClasses: [{ className: "Чарівник" }] } });
    expect(await loadHomebrewEditValues(both.entryId)).toMatchObject({ values: { ruleset: "ANY", classes: ["WIZARD_2014", "WIZARD_2024"] } });
  });

  it("чужий запис не редагується й не видаляється; автор видаляє — запис зникає з каталогу", async () => {
    await signInAs("author");
    const saved = await saveHomebrewSpell({ values: SPELL });
    if (!saved.success) throw new Error("не збережено");

    await signInAs("vandal");
    expect(await saveHomebrewSpell({ entryId: saved.entryId, values: { ...SPELL, name: "Злам" } })).toMatchObject({ success: false });
    expect(await deleteHomebrewEntry(saved.entryId)).toMatchObject({ success: false });

    await signInAs("author");
    expect(await deleteHomebrewEntry(saved.entryId)).toEqual({ success: true });
    expect(await listHomebrewEntries({ kind: "SPELL", ruleset: "RULES_2014", sort: "NEW" })).toEqual([]);
    expect(await loadHomebrewEntry(saved.entryId)).toBeNull();
  });

  it("істота з картинкою: WebP у сховищі, заміна прибирає стару, нечислова характеристика — помилка по полю", async () => {
    await signInAs("author");
    expect(await saveHomebrewCreature(buildCreatureForm({ ...CREATURE, strength: "сильний" }))).toMatchObject({ success: false, fieldErrors: { strength: "Ціле число" } });

    const saved = await saveHomebrewCreature(buildCreatureForm(CREATURE, await makePng()));
    if (!saved.success) throw new Error(JSON.stringify(saved));
    expect(stored.size).toBe(2);
    const creature = (await loadHomebrewEntry(saved.entryId))!;
    expect(creature).toMatchObject({ kind: "CREATURE", creature: { strength: "14 (+2)", xp: "100 XP", imageUrl: expect.stringContaining("homebrew/creatures/") } });

    await saveHomebrewCreature(buildCreatureForm(CREATURE, await makePng(), saved.entryId));
    expect(stored.size).toBe(2);
    await deleteHomebrewEntry(saved.entryId);
    expect(stored.size).toBe(0);
  });

  it("заклинання істоти беруться лише з каталогу її редакції: шкода рахується на сервері, чужий номер — помилка", async () => {
    await signInAs("author");
    const fireball = (await listCreatureSpellChoices("RULES_2014")).find((spell) => spell.searchName.includes("fireball"))!;

    const saved = await saveHomebrewCreature(buildCreatureForm({ ...CREATURE, charisma: 16, spells: [{ spellId: fireball.spellId, plan: { rolls: [] } }] }));
    if (!saved.success) throw new Error(JSON.stringify(saved));
    expect(await loadHomebrewEntry(saved.entryId)).toMatchObject({
      creature: { spellcasting: { attackBonus: 5, saveDc: 13, spells: [{ engName: "Fireball", level: 3, plan: { save: "DEX", rolls: [{ count: 8, sides: 6 }] } }] } },
    });
    expect(await loadHomebrewEditValues(saved.entryId)).toMatchObject({ values: { spells: [{ spellId: fireball.spellId, level: 3 }] } });

    expect(await saveHomebrewCreature(buildCreatureForm({ ...CREATURE, spells: [{ spellId: 999_999 }] }))).toMatchObject({ success: false, fieldErrors: { spells: expect.any(String) } });
  });
});

const ITEM = {
  ruleset: "ANY", name: "Щит болотного пса", itemType: "ARMOR", rarity: "RARE", requiresAttunement: true,
  description: "Предмет має 3 заряди.", acBonus: "+2", saveBonus: "1", weaponBonus: "3",
};

describe("хоумбрю-предмети", () => {
  it("предмет — справжній рядок каталогу: бонуси в колонках, картинка у сховищі, редагування повертає поля", async () => {
    await signInAs("author");
    expect(await saveHomebrewItem(buildCreatureForm({ ...ITEM, acBonus: "+9" }))).toMatchObject({ success: false, fieldErrors: { acBonus: "Від 1 до 5" } });

    const saved = await saveHomebrewItem(buildCreatureForm(ITEM, await makePng()));
    if (!saved.success) throw new Error(JSON.stringify(saved));
    const row = await prisma.magicItem.findUniqueOrThrow({ where: { magicItemId: 1_000_000 + saved.entryId } });
    expect(row).toMatchObject({ magicItemId: 1_000_000 + saved.entryId, bonusToAC: 2, bonusToSavingThrows: { all: 1 }, weaponBonus: null, imageKey: expect.stringContaining("homebrew/items/") });
    expect(await loadHomebrewEntry(saved.entryId, "RULES_2024")).toMatchObject({ kind: "ITEM", item: { name: ITEM.name, engName: "", ruleset: "RULES_2024" } });
    expect(await loadHomebrewEditValues(saved.entryId)).toMatchObject({ kind: "ITEM", values: { acBonus: "2", saveBonus: "1", weaponBonus: "" }, imageUrl: expect.any(String) });

    await saveHomebrewItem(buildCreatureForm({ ...ITEM, saveBonus: "" }, await makePng(), saved.entryId));
    expect(await prisma.magicItem.findUniqueOrThrow({ where: { magicItemId: 1_000_000 + saved.entryId } })).toMatchObject({ bonusToSavingThrows: null, magicItemId: row.magicItemId });
    expect(stored.size).toBe(2);
  });

  it("персонаж бере предмет своєї редакції або «обидві»; видалений запис нового власника не отримує", async () => {
    await signInAs("author");
    const persId = await createPers2014();
    const both = await saveHomebrewItem(buildCreatureForm(ITEM));
    const only2024 = await saveHomebrewItem(buildCreatureForm({ ...ITEM, ruleset: "RULES_2024" }));
    if (!both.success || !only2024.success) throw new Error("не збережено");
    const [bothId, only2024Id] = [1_000_000 + both.entryId, 1_000_000 + only2024.entryId];

    expect(await toggleMagicItemForPers({ persId, magicItemId: bothId })).toEqual({ success: true, added: true });
    expect(await toggleMagicItemForPers({ persId, magicItemId: only2024Id })).toMatchObject({ success: false });

    await deleteHomebrewEntry(both.entryId);
    expect(await prisma.persMagicItem.count({ where: { persId, magicItemId: bothId } })).toBe(1);
    expect(await toggleMagicItemForPers({ persId, magicItemId: bothId })).toEqual({ success: true, added: false });
    expect(await toggleMagicItemForPers({ persId, magicItemId: bothId })).toMatchObject({ success: false });
  });

  it("звичайна зброя й обладунок з основою: без магічних бонусів, профіль зберігається, у персонажа зʼявляються рядки", async () => {
    await signInAs("author");
    const persId = await createPers2014();
    const [longbow2024, leather2024] = await Promise.all([
      prisma.weapon.findFirstOrThrow({ where: { name: "LONGBOW", ruleset: "RULES_2024" } }),
      prisma.armor.findFirstOrThrow({ where: { name: "LEATHER", ruleset: "RULES_2024" } }),
    ]);
    const bow = {
      ...ITEM, name: "Блочний лук", itemType: "WEAPON", isMundane: true, baseWeaponId: String(longbow2024.weaponId),
      attackAbility: "DEX", damageFormula: "1к10+СПР", damageType: "PIERCING", extraDamage: [{ dice: "1к4", damageType: "FIRE" }], normalRange: "150", longRange: "600",
    };
    expect(await saveHomebrewItem(buildCreatureForm({ ...bow, damageFormula: "1к8 вогню" }))).toMatchObject({ success: false, fieldErrors: { damageFormula: expect.any(String) } });
    const savedBow = await saveHomebrewItem(buildCreatureForm(bow));
    const savedArmor = await saveHomebrewItem(buildCreatureForm({ ...ITEM, name: "Шкіра василіска", isMundane: true, baseArmorId: String(leather2024.armorId), armorBaseAC: "13" }));
    if (!savedBow.success || !savedArmor.success) throw new Error("не збережено");
    const [bowId, armorItemId] = [1_000_000 + savedBow.entryId, 1_000_000 + savedArmor.entryId];

    expect(await prisma.magicItem.findUniqueOrThrow({ where: { magicItemId: bowId } })).toMatchObject({
      isMundane: true, rarity: "COMMON", requiresAttunement: false, bonusToAC: null, bonusToSavingThrows: null, weaponBonus: null, baseWeaponId: longbow2024.weaponId,
      weaponProfile: { attackAbility: "DEX", damage: "1к10+СПР", damageType: "PIERCING", extraDamage: [{ count: 1, sides: 4, damageType: "FIRE" }], normalRange: 150, longRange: 600 },
    });
    expect(await loadHomebrewEditValues(savedBow.entryId)).toMatchObject({ values: { isMundane: true, damageFormula: "1к10+СПР", extraDamage: [{ dice: "1к4", damageType: "FIRE" }], normalRange: "150" } });

    await toggleMagicItemForPers({ persId, magicItemId: bowId });
    await toggleMagicItemForPers({ persId, magicItemId: armorItemId });
    const link = await prisma.persMagicItem.findFirstOrThrow({ where: { persId, magicItemId: bowId }, include: { weapon: { include: { weapon: true } } } });
    expect(link.weapon).toMatchObject({ overrideName: "Блочний лук", isMagical: false, weapon: { name: "LONGBOW", ruleset: "RULES_2014" } });
    expect(await prisma.persArmor.findFirstOrThrow({ where: { persId, overrideName: "Шкіра василіска" }, include: { armor: true } })).toMatchObject({ overrideBaseAC: 13, armor: { name: "LEATHER", ruleset: "RULES_2014" } });
  });
});

async function createPers2014(): Promise<number> {
  const [race, characterClass, background] = await Promise.all([raceByName(Races.HUMAN_2014), classByName(Classes.FIGHTER_2014), backgroundByName(BackgroundCategory.SOLDIER)]);
  const created = await createCharacter(minimalForm({ raceId: race.raceId, classId: characterClass.classId, backgroundId: background.backgroundId }));
  if ("error" in created) throw new Error(created.error);
  return created.persId;
}

function buildCreatureForm(values: object, image?: Blob, entryId?: number): FormData {
  const form = new FormData();
  form.set("values", JSON.stringify(values));
  if (image) form.set("image", image, "creature.png");
  if (entryId) form.set("entryId", String(entryId));
  return form;
}

async function makePng(): Promise<Blob> {
  const bytes = await sharp({ create: { width: 640, height: 480, channels: 3, background: "#335522" } }).png().toBuffer();
  return new Blob([new Uint8Array(bytes)], { type: "image/png" });
}
