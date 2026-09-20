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

import { deleteHomebrewEntry, listHomebrewEntries, loadHomebrewEditValues, loadHomebrewEntry, saveHomebrewCreature, saveHomebrewSpell } from "@/lib/actions/homebrew-actions";

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
});

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
