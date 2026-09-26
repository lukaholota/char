/**
 * Лист 2024 — окремий бланк для персонажів редакції 2024, що вмикається перемикачем у модалці друку.
 * Поля створюються поверх растрового бланка, тож тест читає їх так само, як переглядач.
 */

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFRef, PDFStream, type PDFPage } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { readPdfPageFields, type PdfPageFields } from "../helpers/read-pdf-page-fields";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";
import { getCharacterFeaturesGrouped, getPersById } from "@/server/db/pers-actions";
import { generateCharacterPdfFromData } from "@/server/pdf/generateCharacterPdf";
import { weaponMasteryNames } from "@/lib/refs/weapon-mastery";
import type { CharacterPdfData, PrintConfig } from "@/server/pdf/types";

vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 });

const EMAIL = "character-sheet-2024@test.local";
const LEVELED_SPELL_COUNT = 39;
const PREPARED_COUNT = 3;

let pers2024Id = 0;
let pers2014Id = 0;
let spellNamesInOrder: string[] = [];
let preparedSpellNames: string[] = [];
let editablePages: PdfPageFields[] = [];

beforeAll(async () => {
  await resetUserData();
  const user = await prisma.user.create({ data: { email: EMAIL, name: "Гравець" } });
  pers2024Id = await createWarlockBardWithFeat(user.id);
  pers2014Id = await createFighter2014(user.id);
  vi.mocked(auth).mockResolvedValue({ user: { email: EMAIL } } as never);
  editablePages = await readPdfPageFields(await generatePdf(pers2024Id, { sections: ["CHARACTER", "DETAILS"], flattenCharacterSheet: false }));
});

afterAll(disconnectDatabase);

async function createWarlockBardWithFeat(userId: number): Promise<number> {
  const [warlock, bard, elf, background] = await Promise.all([
    classByName("WARLOCK_2024"),
    classByName("BARD_2024"),
    raceByName("ELF_2024"),
    backgroundByName("SAILOR_2024"),
  ]);
  const [weapons, lineageOptions, leveledSpells, cantrip, alert] = await Promise.all([
    prisma.weapon.findMany({
      where: { ruleset: "RULES_2024", name: { in: ["LONGSWORD", "JAVELIN", "DAGGER", "LIGHT_CROSSBOW", "SHORTBOW"] } },
      orderBy: { name: "asc" },
    }),
    prisma.raceChoiceOption.findMany({ where: { raceId: elf.raceId, optionName: { in: ["Дроу", "Харизма"] } } }),
    prisma.spell.findMany({ where: { ruleset: "RULES_2024", level: { in: [1, 2] } }, orderBy: [{ level: "asc" }, { name: "asc" }], take: LEVELED_SPELL_COUNT }),
    prisma.spell.findFirstOrThrow({ where: { ruleset: "RULES_2024", level: 0 }, orderBy: { name: "asc" } }),
    prisma.feat.findFirstOrThrow({ where: { name: "ALERT", ruleset: "RULES_2024" } }),
  ]);
  const bardFeatures = await prisma.classFeature.findMany({ where: { classId: bard.classId, levelGranted: { lte: 3 } }, select: { featureId: true } });
  preparedSpellNames = leveledSpells.slice(0, PREPARED_COUNT).map((spell) => spell.name);
  spellNamesInOrder = [cantrip, ...leveledSpells]
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, "uk"))
    .map((spell) => spell.name);

  const pers = await prisma.pers.create({
    data: {
      userId,
      name: "Двадцять Четвертий",
      ruleset: "RULES_2024",
      classId: warlock.classId,
      raceId: elf.raceId,
      backgroundId: background.backgroundId,
      level: 8,
      currentHp: 50,
      maxHp: 50,
      str: 12, dex: 14, con: 14, int: 10, wis: 10, cha: 16,
      alignment: "Хаотичний добрий",
      bonds: "Команда корабля",
      notes: "Винен капітанові 20 зм",
      gp: "150",
      sp: "0",
      additionalSaveProficiencies: ["WIS", "CHA"],
      multiclasses: { create: [{ classId: bard.classId, classLevel: 3 }] },
      raceChoiceOptions: { connect: lineageOptions.map((option) => ({ optionId: option.optionId })) },
      weapons: { create: weapons.map((weapon) => ({ weaponId: weapon.weaponId })) },
      pers_weapon_mastery: { create: weapons.filter((weapon) => weapon.name === "LONGSWORD" || weapon.name === "JAVELIN").map((weapon) => ({ weapon_id: weapon.weaponId })) },
      features: { create: bardFeatures.map((entry) => ({ featureId: entry.featureId })) },
      feats: { create: [{ featId: alert.featId }] },
      persSpells: {
        create: [
          { spellId: cantrip.spellId, learnedAtLevel: 1 },
          ...leveledSpells.map((spell, index) => ({ spellId: spell.spellId, learnedAtLevel: 1, isPrepared: index < PREPARED_COUNT })),
        ],
      },
    },
  });
  return pers.persId;
}

async function createFighter2014(userId: number): Promise<number> {
  const [fighter, human, soldier] = await Promise.all([classByName("FIGHTER_2014"), raceByName("HUMAN_2014"), backgroundByName("SOLDIER")]);
  const pers = await prisma.pers.create({
    data: {
      userId,
      name: "Старий Воїн",
      ruleset: "RULES_2014",
      classId: fighter.classId,
      raceId: human.raceId,
      backgroundId: soldier.backgroundId,
      level: 3,
      currentHp: 28,
      maxHp: 28,
      str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 10,
      gp: "25",
    },
  });
  return pers.persId;
}

async function generatePdf(persId: number, config: Omit<PrintConfig, "sheetLayout">): Promise<Uint8Array> {
  const pers = await getPersById(persId);
  const features = await getCharacterFeaturesGrouped(persId);
  if (!pers || !features) throw new Error("персонажа не завантажено");
  const data: CharacterPdfData = { pers, features, wildshapeForms: [] };
  return generateCharacterPdfFromData(data, { ...config, sheetLayout: "SHEET_2024" });
}

const mainPage = () => editablePages[0];
const withoutEnglishOriginal = (name: string) => name.replace(/\s*\[[^\]]*\]$/, "");
const magicPage = () => editablePages[1];

function collectPrintedSpellNames(): string[] {
  return editablePages.flatMap((fields) =>
    Object.entries(fields)
      .filter(([name, value]) => /^(spellPage\d+_)?spell\d+_name$/.test(name) && value !== "")
      .map(([, value]) => String(value)),
  );
}

describe("сторінки листа 2024", () => {
  it("лист персонажа — дві сторінки й продовження таблиці заклинань, подробиці — ще дві", () => {
    expect(editablePages).toHaveLength(5);
    expect(editablePages[2]).toHaveProperty("spellPage2_spell1_name");
    expect(editablePages[3]).toHaveProperty("goals");
    expect(editablePages[4]).toHaveProperty("notes1");
  });

  it("без «Бланку подробиць» друкуються лише сторінки персонажа", async () => {
    const pages = await readPdfPageFields(await generatePdf(pers2024Id, { sections: ["CHARACTER"], flattenCharacterSheet: false }));

    expect(pages).toHaveLength(3);
  });

  it("класичний «Лист заклинань» не додається — таблиця вже на другій сторінці", async () => {
    const pages = await readPdfPageFields(await generatePdf(pers2024Id, { sections: ["CHARACTER", "SPELL_SHEET"], flattenCharacterSheet: false }));

    expect(pages.some((fields) => "Spells 1015" in fields)).toBe(false);
  });

  it("персонаж 2014 друкується класичним листом, навіть якщо попросили 2024", async () => {
    const pages = await readPdfPageFields(await generatePdf(pers2014Id, { sections: ["CHARACTER"], flattenCharacterSheet: false }));

    expect(pages[0]).toHaveProperty("CharacterName", "Старий Воїн");
  });

  it("класичний лист теж друкує монети, а нульові лишає порожніми", async () => {
    const pages = await readPdfPageFields(await generatePdf(pers2014Id, { sections: ["CHARACTER"], flattenCharacterSheet: false }));

    expect(pages[0]).toMatchObject({ GP: "25", CP: "", SP: "" });
  });
});

describe("перша сторінка", () => {
  it("шапка несе імʼя, класи з рівнями, вид із родоводом і рівень", () => {
    expect(mainPage()).toMatchObject({
      characterName: "Двадцять Четвертий",
      level: "8",
      species: "Ельф (Дроу)",
    });
    expect(String(mainPage().className)).toMatch(/Чорнокнижник 5 \/ Бард 3/);
  });

  it("володіння ряткидками позначені кружечками", () => {
    expect(mainPage().WIS_saveProficient).toBe(true);
    expect(mainPage().CHA_saveProficient).toBe(true);
    expect(mainPage().STR_saveProficient).toBe(false);
  });

  it("зброя з майстерністю несе її назву в примітках, пʼята зброя переходить в «Атаки та чарування»", () => {
    const rows = [1, 2, 3, 4].map((row) => ({ name: String(mainPage()[`weapon${row}_name`]), notes: String(mainPage()[`weapon${row}_notes`]) }));
    const javelin = rows.find((row) => row.name === "Метальний спис");

    expect(javelin?.notes).toContain(weaponMasteryNames.SLOW);
    expect(String(mainPage().attacksAndSpellcasting)).toContain("Ще зброя:");
  });

  it("риса з «Рис» не дублюється серед здібностей класу", () => {
    const classFeatures = `${mainPage().classFeaturesLeft}\n${mainPage().classFeaturesRight}\n${editablePages[3].additionalFeatures}`;

    expect(String(mainPage().feats)).toMatch(/Пильн/);
    expect(classFeatures).not.toMatch(/Пильн/);
    expect(classFeatures).toContain("Бардське натхнення");
  });
});

describe("сторінка чарів", () => {
  it("чаротворча характеристика й слоти пакту друкуються", () => {
    expect(magicPage().spellcastingAbility).toBe("Харизма");
    expect(String(magicPage().spellSlots3)).toMatch(/пакт/);
  });

  it("усі заклинання доїжджають і стоять за рівнем, а потім за назвою", () => {
    expect(collectPrintedSpellNames().map(withoutEnglishOriginal)).toEqual(spellNamesInOrder.map(withoutEnglishOriginal));
  });

  it("англійський оригінал лишається в назві, поки вона читається, і відпадає лише в задовгій", () => {
    const printed = collectPrintedSpellNames();

    expect(printed.some((name) => name.includes("["))).toBe(true);
    expect(printed.some((name, index) => name !== spellNamesInOrder[index])).toBe(true);
  });

  it("підготовлене заклинання позначене в примітках", () => {
    const notesByName = new Map(
      editablePages.flatMap((fields) =>
        Object.entries(fields)
          .filter(([name, value]) => /_name$/.test(name) && /spell\d+_name$/.test(name) && value !== "")
          .map(([name, value]) => [withoutEnglishOriginal(String(value)), String(fields[name.replace(/_name$/, "_notes")])]),
      ),
    );
    const unprepared = spellNamesInOrder.find((name, index) => index > 0 && !preparedSpellNames.includes(name));

    for (const name of preparedSpellNames) expect(notesByName.get(withoutEnglishOriginal(name))).toContain("підг.");
    expect(notesByName.get(withoutEnglishOriginal(String(unprepared)))).not.toContain("підг.");
  });

  it("світогляд і привʼязаності з листа потрапляють на бланк", () => {
    expect(magicPage().alignment).toBe("Хаотичний добрий");
    expect(String(magicPage().backstory)).toContain("Привʼязаності: Команда корабля");
    expect(editablePages[4].notes1).toBe("Винен капітанові 20 зм");
  });

  it("монети друкуються, а нульові клітинки лишаються порожніми", () => {
    expect(magicPage()).toMatchObject({ coin_gp: "150", coin_sp: "", coin_cp: "" });
  });
});

describe("редагування", () => {
  it("редагований PDF тримає поля в AcroForm, а не лише віджети", async () => {
    const document = await PDFDocument.load(await generatePdf(pers2024Id, { sections: ["CHARACTER"], flattenCharacterSheet: false }));
    const names = document.getForm().getFields().map((field) => field.getName());

    expect(names).toContain("characterName");
    expect(names).toContain("spellPage2_spell1_name");
  });

  it("звичайний PDF плаский — полів у ньому немає", async () => {
    const document = await PDFDocument.load(await generatePdf(pers2024Id, { sections: ["CHARACTER", "DETAILS"], flattenCharacterSheet: true }));

    expect(document.getForm().getFields()).toHaveLength(0);
    expect(document.getPageCount()).toBe(5);
  });

  it("у плаского PDF сторінки не посилаються на видалені віджети", async () => {
    const document = await PDFDocument.load(await generatePdf(pers2024Id, { sections: ["CHARACTER"], flattenCharacterSheet: true }));
    const danglingAnnotations = document.getPages().flatMap((page) => {
      const annotations = page.node.lookupMaybe(PDFName.of("Annots"), PDFArray);
      return annotations ? annotations.asArray().filter((entry) => entry instanceof PDFRef && !document.context.lookup(entry)) : [];
    });

    expect(danglingAnnotations).toEqual([]);
  });
});

describe("портрет на бланку подробиць", () => {
  beforeAll(async () => {
    const webp = await sharp({ create: { width: 64, height: 64, channels: 3, background: { r: 170, g: 60, b: 40 } } }).webp().toBuffer();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array(webp))));
    await prisma.pers.updateMany({ where: { persId: { in: [pers2024Id, pers2014Id] } }, data: { portraitKey: "portraits/test/face" } });
  });

  afterAll(async () => {
    vi.unstubAllGlobals();
    await prisma.pers.updateMany({ where: { persId: { in: [pers2024Id, pers2014Id] } }, data: { portraitKey: null } });
  });

  it("класичний бланк ставить портрет у рамку «Зовнішність персонажа»", async () => {
    const document = await PDFDocument.load(await generatePdf(pers2014Id, { sections: ["DETAILS"], flattenCharacterSheet: true }));

    expect(countPageImages(document.getPage(0))).toBe(1);
  });

  it("бланк 2024 ставить портрет у рамку «Портрет»", async () => {
    const document = await PDFDocument.load(await generatePdf(pers2024Id, { sections: ["DETAILS"], flattenCharacterSheet: true }));

    expect(countPageImages(document.getPage(0))).toBe(2);
  });

  it("без портрета рамка лишається порожньою", async () => {
    await prisma.pers.update({ where: { persId: pers2014Id }, data: { portraitKey: null } });
    const document = await PDFDocument.load(await generatePdf(pers2014Id, { sections: ["DETAILS"], flattenCharacterSheet: true }));

    expect(countPageImages(document.getPage(0))).toBe(0);
  });
});

function countPageImages(page: PDFPage): number {
  const xObjects = page.node.Resources()?.lookupMaybe(PDFName.of("XObject"), PDFDict);
  return (xObjects?.values() ?? []).filter((ref) => page.doc.context.lookupMaybe(ref, PDFStream)?.dict.get(PDFName.of("Subtype")) === PDFName.of("Image")).length;
}
