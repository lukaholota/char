// KR6.3 — доказ, що серверний фільтр за ruleset реально виключає RULES_2024-рядки.
//
// Тестує реальні посіяні рядки RULES_2024 у базі проти функцій вибірки контенту.
import { afterAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase } from "../user-data";
import { findCharacterCreatorOptions } from "@/lib/content/creator-content";
import { getBaseEquipment } from "@/server/db/equipment-actions";
import { loadFightingStyleOptions } from "@/server/db/progression-content";
import { buildSpellsForGenerationQuery } from "../../scripts/generate-spells";
import { buildMagicItemsForGenerationQuery } from "../../scripts/generate-magic-items";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

afterAll(disconnectDatabase);

describe("KR6.3 — findCharacterCreatorOptions (файл, не база — KR22.5)", () => {
  it("виключає RULES_2024 рядки на кожній з 5 каталогових таблиць", async () => {
    const [race2024, class2024, bg2024, weapon2024, feat2024] = await Promise.all([
      prisma.race.findFirstOrThrow({ where: { ruleset: "RULES_2024" } }),
      prisma.class.findFirstOrThrow({ where: { ruleset: "RULES_2024" } }),
      prisma.background.findFirstOrThrow({ where: { ruleset: "RULES_2024" } }),
      prisma.weapon.findFirstOrThrow({ where: { ruleset: "RULES_2024" } }),
      prisma.feat.findFirstOrThrow({ where: { ruleset: "RULES_2024" } }),
    ]);

    const { races, classes, backgrounds, weapons, feats } = findCharacterCreatorOptions("RULES_2014");

    expect(races.some((r) => r.raceId === race2024.raceId)).toBe(false);
    expect(classes.some((c) => c.classId === class2024.classId)).toBe(false);
    expect(backgrounds.some((b) => b.backgroundId === bg2024.backgroundId)).toBe(false);
    expect(weapons.some((w) => w.weaponId === weapon2024.weaponId)).toBe(false);
    expect(feats.some((f) => f.featId === feat2024.featId)).toBe(false);
  });
});

describe("KR6.3 — levelup-content (клас/риса/інфузія каталоги при рівні)", () => {
  it("клас із RULES_2024 не потрапляє у loadLevelUpBaseContent", async () => {
    const class2024 = await prisma.class.findFirstOrThrow({ where: { ruleset: "RULES_2024" } });
    const { loadLevelUpBaseContent } = await import("@/server/db/levelup-content");
    const { classes } = await loadLevelUpBaseContent(-1);
    expect(classes.some((c) => c.classId === class2024.classId)).toBe(false);
  });

  it("риса з RULES_2024 не потрапляє у loadLevelUpBaseContent", async () => {
    const feat2024 = await prisma.feat.findFirstOrThrow({ where: { ruleset: "RULES_2024" } });
    const { loadLevelUpBaseContent } = await import("@/server/db/levelup-content");
    const { feats } = await loadLevelUpBaseContent(-1);
    expect(feats.some((f) => f.featId === feat2024.featId)).toBe(false);
  });

  // До KR22.5 цей тест перемикав редакцію рядка в базі й чекав, що вибірка його втратить. Після
  // переходу на файл база рівню більше нічого не каже, тож перевіряється сама гарантія: у
  // левелапі редакції немає жодної інфузії чужої редакції. Інфузій 2024 у грі й немає —
  // артифісера в PHB 2024 нема, тому каталог 2024 порожній, і це теж стверджується.
  it("інфузії левелапу належать своїй редакції", () => {
    const { infusions } = findCharacterCreatorOptions("RULES_2014");
    expect(infusions.length).toBeGreaterThan(0);
    expect(infusions.every((infusion) => infusion.ruleset === "RULES_2014")).toBe(true);

    expect(findCharacterCreatorOptions("RULES_2024").infusions).toHaveLength(0);
  });
});

describe("KR6.3 — getBaseEquipment", () => {
  it("зброя з RULES_2024 не потрапляє у список персонажа 2014", async () => {
    const weapon2024 = await prisma.weapon.findFirstOrThrow({ where: { ruleset: "RULES_2024" } });
    const result = await getBaseEquipment("RULES_2014");
    if (!result.success || !result.weapons || !result.armors) {
      throw new Error("getBaseEquipment failed: " + JSON.stringify(result));
    }

    expect(result.weapons.some((w) => w.weaponId === weapon2024.weaponId)).toBe(false);
  });
});

describe("KR6.3 — loadFightingStyleOptions", () => {
  it("бойовий стиль з RULES_2024 не потрапляє у список", async () => {
    const fixture = await prisma.fightingStyle.create({
      data: {
        name: "KR6.3 тестовий фікстур",
        engName: "KR6.3 test fixture — ruleset filter",
        description: "Тимчасовий рядок для controlled-red доказу, видаляється в кінці тесту.",
        ruleset: "RULES_2024",
      },
    });

    try {
      const options = await loadFightingStyleOptions();
      expect(options.some((o) => o.id === fixture.id)).toBe(false);
    } finally {
      await prisma.fightingStyle.delete({ where: { id: fixture.id } });
    }
  });
});

describe("KR6.3 — generate-spells.ts / generate-magic-items.ts (build-time SSG)", () => {
  it("buildSpellsForGenerationQuery виключає заклинання з RULES_2024", async () => {
    const spell2024 = await prisma.spell.findFirstOrThrow({ where: { ruleset: "RULES_2024" } });

    const spells = await prisma.spell.findMany(buildSpellsForGenerationQuery());
    expect(spells.some((s) => s.spellId === spell2024.spellId)).toBe(false);
  });

  /// Раніше тест на час перевірки перекидав справжній предмет 2014 у RULES_2024 і вертав
  /// назад. Після KR12.5 у таблиці лежить каталог 2024 з тими самими англійськими назвами
  /// (всі 445 із 445 збігаються з назвами 2014), тому таке перекидання падає на
  /// `UNIQUE (eng_name, ruleset)`. Тепер тест бере справжній рядок 2024 — так само, як
  /// сусідній тест на заклинання, — і нічого не мутує.
  it("buildMagicItemsForGenerationQuery виключає предмет з RULES_2024", async () => {
    const magicItem2024 = await prisma.magicItem.findFirstOrThrow({ where: { ruleset: "RULES_2024" } });

    const items = await prisma.magicItem.findMany(buildMagicItemsForGenerationQuery());
    expect(items.some((i) => i.magicItemId === magicItem2024.magicItemId)).toBe(false);
  });
});
