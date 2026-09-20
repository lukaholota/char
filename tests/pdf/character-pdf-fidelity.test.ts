/**
 * KR31.10 — друкований PDF несе те, що є на листі: майстерність зброї, підготовлені заклинання,
 * повні списки, слоти пакту окремо, вид із родоводом.
 */

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { readPdfFreeTextLabels, readPdfPageFields, type PdfPageFields } from "../helpers/read-pdf-page-fields";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));
vi.mock("@/server/pdf/featuresPdf", () => ({ generateFeaturesPdfBytes: vi.fn() }));

import { auth } from "@/lib/auth";
import { getCharacterFeaturesGrouped, getPersById } from "@/server/db/pers-actions";
import { generateCharacterPdfFromData } from "@/server/pdf/generateCharacterPdf";
import { generateCharacterPdfByTokenAction } from "@/app/char/share/[token]/print/actions";
import { weaponMasteryNames } from "@/lib/refs/weapon-mastery";
import { generateFeaturesPdfBytes } from "@/server/pdf/featuresPdf";
import { loadPrintableSpells } from "@/server/db/print-content";
import { PDFDocument } from "pdf-lib";
import type { CharacterPdfData, PrintSection } from "@/server/pdf/types";

vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 });

const EMAIL = "character-pdf-fidelity@test.local";
const SHARE_TOKEN = "character-pdf-fidelity-token";
const LEVEL_ONE_SPELL_COUNT = 14;
const PREPARED_COUNT = 3;

let persId = 0;
let pages: PdfPageFields[] = [];
let ownPdfBytes = new Uint8Array();
let levelOneSpellNames: string[] = [];
let levelOneSpellIds: number[] = [];

beforeAll(async () => {
  await resetUserData();
  persId = await createWarlockBardWithLongLists();
  vi.mocked(auth).mockResolvedValue({ user: { email: EMAIL } } as never);
  ownPdfBytes = await generateOwnPdf(["CHARACTER", "SPELL_SHEET"]);
  pages = await readPdfPageFields(ownPdfBytes);
});

afterAll(disconnectDatabase);

async function createWarlockBardWithLongLists(): Promise<number> {
  const [warlock, bard, elf, background] = await Promise.all([
    classByName("WARLOCK_2024"),
    classByName("BARD_2024"),
    raceByName("ELF_2024"),
    backgroundByName("SAILOR_2024"),
  ]);
  const [weapons, lineageOptions, levelOneSpells, cantrip] = await Promise.all([
    prisma.weapon.findMany({
      where: { ruleset: "RULES_2024", name: { in: ["LONGSWORD", "JAVELIN", "DAGGER", "LIGHT_CROSSBOW"] } },
      orderBy: { name: "asc" },
    }),
    prisma.raceChoiceOption.findMany({
      where: { raceId: elf.raceId, optionName: { in: ["Дроу", "Харизма"] } },
    }),
    prisma.spell.findMany({ where: { ruleset: "RULES_2024", level: 1 }, orderBy: { name: "asc" }, take: LEVEL_ONE_SPELL_COUNT }),
    prisma.spell.findFirstOrThrow({ where: { ruleset: "RULES_2024", level: 0 } }),
  ]);
  const bardFeatures = await prisma.classFeature.findMany({
    where: { classId: bard.classId, levelGranted: { lte: 3 } },
    select: { featureId: true },
  });
  levelOneSpellNames = levelOneSpells.map((spell) => spell.name);
  levelOneSpellIds = levelOneSpells.map((spell) => spell.spellId);
  const mastered = weapons.filter((weapon) => weapon.name === "LONGSWORD" || weapon.name === "JAVELIN");

  const user = await prisma.user.create({ data: { email: EMAIL, name: "Гравець" } });
  const pers = await prisma.pers.create({
    data: {
      userId: user.id,
      name: "Друкований",
      ruleset: "RULES_2024",
      shareToken: SHARE_TOKEN,
      classId: warlock.classId,
      raceId: elf.raceId,
      backgroundId: background.backgroundId,
      level: 8,
      currentHp: 50,
      maxHp: 50,
      str: 10, dex: 14, con: 14, int: 10, wis: 10, cha: 16,
      customEquipment: "Мотузка{{Rope}}",
      multiclasses: { create: [{ classId: bard.classId, classLevel: 3 }] },
      raceChoiceOptions: { connect: lineageOptions.map((option) => ({ optionId: option.optionId })) },
      weapons: { create: weapons.map((weapon) => ({ weaponId: weapon.weaponId })) },
      pers_weapon_mastery: { create: mastered.map((weapon) => ({ weapon_id: weapon.weaponId })) },
      features: { create: bardFeatures.map((entry) => ({ featureId: entry.featureId })) },
      persSpells: {
        create: [
          { spellId: cantrip.spellId, learnedAtLevel: 1 },
          ...levelOneSpells.map((spell, index) => ({
            spellId: spell.spellId,
            learnedAtLevel: 1,
            isPrepared: index < PREPARED_COUNT,
          })),
        ],
      },
    },
  });
  return pers.persId;
}

async function generateOwnPdf(sections: PrintSection[]): Promise<Uint8Array> {
  const pers = await getPersById(persId);
  const features = await getCharacterFeaturesGrouped(persId);
  if (!pers || !features) throw new Error("персонажа не завантажено");
  const data: CharacterPdfData = { pers, features, wildshapeForms: [] };
  return generateCharacterPdfFromData(data, { sections, flattenCharacterSheet: false });
}

function collectFilledFieldNames(fields: PdfPageFields): string[] {
  return Object.entries(fields)
    .filter(([, value]) => value !== "" && value !== false)
    .map(([name]) => name)
    .sort();
}

async function buildTwoPagePdfBytes(): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  document.addPage();
  document.addPage();
  return document.save();
}

function collectSpellSheetPages(): PdfPageFields[] {
  return pages.filter((fields) => "Spells 1015" in fields);
}

function collectPrintedSpellNames(): string[] {
  return collectSpellSheetPages().flatMap((fields) =>
    Object.entries(fields)
      .filter(([name, value]) => name.startsWith("Spells ") && typeof value === "string" && value !== "")
      .map(([, value]) => String(value)),
  );
}

describe("перша сторінка", () => {
  it("L15-print-01 — обрані види зброї з їхньою властивістю майстерності друкуються", () => {
    const attacks = String(pages[0]["AttacksSpellcasting"]);

    expect(attacks).toContain(`Довгий меч (${weaponMasteryNames.SAP})`);
    expect(attacks).toContain(`Метальний спис (${weaponMasteryNames.SLOW})`);
  });

  it("L15-print-11 — четверта різна зброя не зникає", () => {
    const printedWeaponText = [
      pages[0]["Wpn Name"],
      pages[0]["Wpn Name 2"],
      pages[0]["Wpn Name 3"],
      pages[0]["AttacksSpellcasting"],
    ].join("\n");

    for (const name of ["Довгий меч", "Метальний спис", "Кинджал", "Легкий арбалет"]) {
      expect(printedWeaponText).toContain(name);
    }
  });

  it("L15-print-07 — вид друкується разом із родоводом, а не голою назвою", () => {
    expect(String(pages[0]["Race "]).replace(/\s+/g, " ")).toBe("Ельф (Дроу)");
  });

  it("L15-print-07 — підпис поля на аркуші 2024 каже «Вид», а не «Раса»", async () => {
    const [firstPageLabels] = await readPdfFreeTextLabels(ownPdfBytes);

    expect(firstPageLabels).not.toContain("Раса");
    expect(firstPageLabels).toContain("Світогляд");
  });

  it("L15-print-12 — маркер оригіналу {{…}} не друкується сирим", () => {
    expect(pages[0]["Equipment"]).toBe("Мотузка");
  });

  it("L15-print-14 — перейменоване поле шаблона випадає з набору заповнених", () => {
    expect(collectFilledFieldNames(pages[0])).toMatchInlineSnapshot(`
      [
        "AC",
        "Acrobatics",
        "Animal",
        "Arcana",
        "Athletics",
        "AttacksSpellcasting",
        "Background",
        "CHA",
        "CHamod",
        "CON",
        "CONmod",
        "CharacterName",
        "ClassLevel",
        "DEX",
        "DEXmod ",
        "Deception ",
        "Equipment",
        "Features and Traits",
        "HDTotal",
        "HPMax",
        "History ",
        "INT",
        "INTmod",
        "Initiative",
        "Insight",
        "Intimidation",
        "Investigation ",
        "Medicine",
        "Nature",
        "Passive",
        "Perception ",
        "Performance",
        "Persuasion",
        "PlayerName",
        "ProfBonus",
        "ProficienciesLang",
        "Race ",
        "Religion",
        "ST Charisma",
        "ST Constitution",
        "ST Dexterity",
        "ST Intelligence",
        "ST Strength",
        "ST Wisdom",
        "STR",
        "STRmod",
        "SleightofHand",
        "Speed",
        "Stealth ",
        "Survival",
        "WIS",
        "WISmod",
        "Wpn Name",
        "Wpn Name 2",
        "Wpn Name 3",
        "Wpn1 AtkBonus",
        "Wpn1 Damage",
        "Wpn2 AtkBonus ",
        "Wpn2 Damage ",
        "Wpn3 AtkBonus  ",
        "Wpn3 Damage ",
        "XP",
      ]
    `);
  });
});

describe("лист заклинань", () => {
  it("L15-print-05 — усі 14 заклинань першого рівня доїжджають, навіть понад 12 рядків шаблона", () => {
    const printed = collectPrintedSpellNames();

    for (const name of levelOneSpellNames) expect(printed).toContain(name);
  });

  it("L15-print-02 — підготовлені заклинання позначені, непідготовлені — ні", () => {
    const [firstPage] = collectSpellSheetPages();

    expect(firstPage["Spells 1015"]).toBe(levelOneSpellNames[0]);
    expect(firstPage["Check Box 251"]).toBe(true);
    expect(firstPage["Spells 1023"]).toBe(levelOneSpellNames[1]);
    expect(firstPage["Check Box 309"]).toBe(true);
    expect(firstPage["Spells 1025"]).toBe(levelOneSpellNames[3]);
    expect(firstPage["Check Box 3011"]).toBe(false);
  });

  it("L15-print-14 — перейменоване поле листа заклинань випадає з набору заповнених", () => {
    const [firstPage] = collectSpellSheetPages();

    expect(collectFilledFieldNames(firstPage)).toMatchInlineSnapshot(`
      [
        "Check Box 251",
        "Check Box 3010",
        "Check Box 309",
        "SlotsRemaining 21",
        "SlotsTotal 19",
        "SlotsTotal 20",
        "SlotsTotal 21",
        "SpellAtkBonus 2",
        "SpellSaveDC  2",
        "Spellcasting Class 2",
        "SpellcastingAbility 2",
        "Spells 1014",
        "Spells 1015",
        "Spells 1023",
        "Spells 1024",
        "Spells 1025",
        "Spells 1026",
        "Spells 1027",
        "Spells 1028",
        "Spells 1029",
        "Spells 1030",
        "Spells 1031",
        "Spells 1032",
        "Spells 1033",
      ]
    `);
  });

  it("L15-print-06 — слоти пакту підписані окремо від звичайних", () => {
    const [firstPage] = collectSpellSheetPages();

    expect(firstPage["SlotsTotal 19"]).toBe("4");
    expect(`${firstPage["SlotsTotal 21"]} ${firstPage["SlotsRemaining 21"]}`).toMatch(/пакт/i);
  });
});

describe("друк за посиланням", () => {
  it("лист заклинань спільного персонажа несе ті самі заклинання, що й власний", async () => {
    const shared = await generateCharacterPdfByTokenAction(SHARE_TOKEN, {
      sections: ["SPELL_SHEET"],
      flattenCharacterSheet: false,
    });
    const sharedPages = await readPdfPageFields(Buffer.from(shared.data, "base64"));

    expect(sharedPages[0]["Spells 1015"]).toBe(levelOneSpellNames[0]);
  });
});

describe("сторінка «Здібності»", () => {
  it("L15-print-09 — фічі 2024 розкладаються за типом дії й несуть лічильник застосувань", async () => {
    const features = await getCharacterFeaturesGrouped(persId);
    const inspiration = features?.bonusActions.find((item) => item.name.includes("Бардське натхнення"));

    expect(inspiration?.usesPer).toBeTypeOf("number");
  });
});

describe("опис заклинань", () => {
  it("L15-print-08 — джерело друкується українською назвою книги, а не enum", async () => {
    const [spell] = await loadPrintableSpells(levelOneSpellIds.slice(0, 1));

    expect(spell.source).toBe("Книга Гравця (2024)");
  });
});

describe("збій секції", () => {
  it("L15-print-10 — секція, що впала двічі, стає видимою сторінкою-заглушкою", async () => {
    vi.mocked(generateFeaturesPdfBytes).mockReset().mockRejectedValue(new Error("браузер упав"));

    const failed = await PDFDocument.load(await generateOwnPdf(["FEATURES"]));

    expect(generateFeaturesPdfBytes).toHaveBeenCalledTimes(2);
    expect(failed.getPageCount()).toBe(1);
  });

  it("L15-print-10 — друга спроба рятує секцію, і заглушки немає", async () => {
    const twoPages = await buildTwoPagePdfBytes();
    vi.mocked(generateFeaturesPdfBytes).mockReset().mockRejectedValueOnce(new Error("браузер упав")).mockResolvedValue(twoPages);

    const recovered = await PDFDocument.load(await generateOwnPdf(["FEATURES"]));

    expect(generateFeaturesPdfBytes).toHaveBeenCalledTimes(2);
    expect(recovered.getPageCount()).toBe(2);
  });
});
