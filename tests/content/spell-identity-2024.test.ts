// KR25.2 — стабільний ключ заклинання 2024. Номер каталогу 2024 — це позиція в масиві
// `data/2024/normalized/spells.json`, а в базі ті самі заклинання мають інші номери; тому
// адреса, на яку можна писати посилання, — слаг від `engName`. Номер лишається робочим заради
// вже проіндексованих і збережених адрес.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

import spells2024Json from "../../data/2024/normalized/spells.json";
import {
  buildSpellKey,
  buildSpells2024,
  getAllSpells,
  getSpellByIdOrSlug,
  type Raw2024Spell,
  type SpellData,
} from "@/lib/spellsData";
import { buildSpellHref, buildSpellLinkForSpell, buildSpellSlug, findSpellLinkInHref } from "@/lib/spell-link";
import spellPage2024, { generateMetadata as buildMetadata2024 } from "@/app/2024/spells/[spellId]/page";
import spellPage2014, { generateMetadata as buildMetadata2014 } from "@/app/spells/[spellId]/page";
import spellModal2024 from "@/app/2024/spells/@modal/(.)[spellId]/page";
import spellModal2014 from "@/app/spells/@modal/(.)[spellId]/page";
import { generateStaticParams as buildStaticParams2024 } from "@/app/2024/spells/[spellId]/page";
import { generateStaticParams as buildStaticParams2014 } from "@/app/spells/[spellId]/page";
import sitemap from "@/app/sitemap";

const RAW_2024 = spells2024Json as Raw2024Spell[];

function buildCanonicalHref(spell: SpellData): string {
  return buildSpellHref({ spellKey: buildSpellKey(spell), ruleset: "RULES_2024" });
}

function shuffleDeterministically<T>(list: T[]): T[] {
  const copy = [...list];
  let seed = 2024;
  for (let i = copy.length - 1; i > 0; i -= 1) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    const j = seed % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function findDuplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return entry === "generated" ? [] : listSourceFiles(path);
    return /\.(ts|tsx)$/.test(entry) ? [path] : [];
  });
}

const produceFlame = getAllSpells("RULES_2024").find((spell) => spell.engName === "Produce Flame")!;
const mageHand = getAllSpells("RULES_2014").find((spell) => spell.engName === "Mage Hand")!;

async function resolveParams<T>(page: (args: { params: Promise<{ spellId: string }> }) => Promise<T>, spellId: string) {
  return page({ params: Promise.resolve({ spellId }) });
}

describe("KR25.2 — ключ заклинання 2024 не залежить від порядку рядків у файлі", () => {
  it("пересортування spells.json не змінює жодної канонічної адреси", () => {
    const original = buildSpells2024(RAW_2024);
    const byEngName = new Map(original.map((spell) => [spell.engName, buildCanonicalHref(spell)]));

    for (const reordered of [[...RAW_2024].reverse(), shuffleDeterministically(RAW_2024)]) {
      const changed = buildSpells2024(reordered)
        .filter((spell) => buildCanonicalHref(spell) !== byEngName.get(spell.engName))
        .map((spell) => spell.engName);

      expect(changed).toEqual([]);
    }
  });

  it("англійські назви й слаги унікальні всередині кожної редакції", () => {
    const spells2014 = getAllSpells("RULES_2014");
    const spells2024 = getAllSpells("RULES_2024");

    expect(spells2014).toHaveLength(525);
    expect(spells2024).toHaveLength(391);

    for (const list of [spells2014, spells2024]) {
      expect(findDuplicates(list.map((spell) => spell.engName))).toEqual([]);
      expect(findDuplicates(list.map(buildSpellKey))).toEqual([]);
    }
  });

  /// Слаг і номер живуть в одному сегменті адреси, тож слаг не має виглядати як номер.
  it("жоден слаг не складається з самих цифр і не порожній", () => {
    for (const ruleset of ["RULES_2014", "RULES_2024"] as const) {
      const badSlugs = getAllSpells(ruleset)
        .map(buildSpellKey)
        .filter((slug) => slug === "" || /^\d+$/.test(slug));
      expect(badSlugs).toEqual([]);
    }
  });

  it("слаг — той самий, що в решти каталогів: `Melf's Acid Arrow` → `melfs-acid-arrow`", () => {
    expect(buildSpellSlug("Produce Flame")).toBe("produce-flame");
    expect(buildSpellSlug("Melf's Acid Arrow")).toBe("melfs-acid-arrow");
    expect(buildSpellSlug("Enlarge/Reduce")).toBe("enlarge-reduce");
  });
});

describe("KR25.2 — жодне місце в src/ не будує адресу з позиційного номера", () => {
  /// Позиційний номер дозволений лише там, де каталог його роздає; будь-який маршрут, компонент
  /// чи будівник адреси, що рахує `20000 + …`, — це нове джерело адреси, яка поїде після
  /// першого ж пересортування.
  const FILES_THAT_ASSIGN_CATALOG_NUMBERS = new Set([
    "src/lib/spellsData.ts",
    "src/lib/backgroundsData.ts",
    "src/lib/featsData.ts",
    "src/lib/weaponsData.ts",
  ]);

  it("`20000 + index` є лише в модулях каталогів", () => {
    const root = process.cwd();
    const offenders = listSourceFiles(join(root, "src"))
      .map((path) => relative(root, path))
      .filter((path) => !FILES_THAT_ASSIGN_CATALOG_NUMBERS.has(path))
      .filter((path) => /\b20000\s*\+/.test(readFileSync(join(root, path), "utf-8")));

    expect(offenders).toEqual([]);
  });
});

describe("KR25.2 — маршрути приймають і слаг, і номер", () => {
  it("getSpellByIdOrSlug знаходить одне й те саме заклинання за слагом, номером і назвою", () => {
    const bySlug = getSpellByIdOrSlug("produce-flame", "RULES_2024");
    const byNumber = getSpellByIdOrSlug(String(produceFlame.spellId), "RULES_2024");
    const byEngName = getSpellByIdOrSlug("Produce Flame", "RULES_2024");

    expect(bySlug?.spellId).toBe(produceFlame.spellId);
    expect(byNumber?.spellId).toBe(produceFlame.spellId);
    expect(byEngName?.spellId).toBe(produceFlame.spellId);
    expect(getSpellByIdOrSlug("mage-hand")?.spellId).toBe(mageHand.spellId);
    expect(getSpellByIdOrSlug("produce-flame", "RULES_2014")?.engName).toBe("Produce Flame");
    expect(getSpellByIdOrSlug("no-such-spell", "RULES_2024")).toBeUndefined();
  });

  it("/2024/spells/produce-flame і /2024/spells/<номер> — одне заклинання й один canonical", async () => {
    const bySlug = await resolveParams(buildMetadata2024, "produce-flame");
    const byNumber = await resolveParams(buildMetadata2024, String(produceFlame.spellId));

    expect(bySlug.title).toBe(`${produceFlame.name} — Замовляння (2024)`);
    expect(byNumber.title).toBe(bySlug.title);
    expect(bySlug.alternates?.canonical).toBe(byNumber.alternates?.canonical);
    await expect(resolveParams(spellPage2024, "produce-flame")).resolves.toBeTruthy();
    await expect(resolveParams(spellPage2024, "no-such-spell")).rejects.toThrow();
  });

  it("/spells/mage-hand і /spells/<номер> — одне заклинання 2014", async () => {
    const bySlug = await resolveParams(buildMetadata2014, "mage-hand");
    const byNumber = await resolveParams(buildMetadata2014, String(mageHand.spellId));

    expect(bySlug.title).toBe(byNumber.title);
    expect(bySlug.title).not.toBe("Заклинання не знайдено");
    expect(bySlug.alternates?.canonical).toBe(byNumber.alternates?.canonical);
    await expect(resolveParams(spellPage2014, "mage-hand")).resolves.toBeTruthy();
  });

  it("модалки каталогів відкривають заклинання за слагом у своїй редакції", async () => {
    const modal2024 = await resolveParams(spellModal2024, "produce-flame");
    const modal2014 = await resolveParams(spellModal2014, "mage-hand");

    expect(modal2024.props.spell).toMatchObject({ engName: "Produce Flame", ruleset: "RULES_2024" });
    expect(modal2014.props.spell).toMatchObject({ engName: "Mage Hand", ruleset: "RULES_2014" });
  });
});

describe("KR25.2 — канонічна адреса, статичні сторінки й sitemap на слагу (П1: варіант А)", () => {
  it("canonical веде на слаг незалежно від того, слагом чи номером зайшли", async () => {
    const byNumber = await resolveParams(buildMetadata2024, String(produceFlame.spellId));
    const bySlug2014 = await resolveParams(buildMetadata2014, String(mageHand.spellId));

    expect(byNumber.alternates?.canonical).toBe("https://char.holota.family/2024/spells/produce-flame");
    expect(bySlug2014.alternates?.canonical).toBe("https://char.holota.family/spells/mage-hand");
  });

  it("generateStaticParams обох редакцій віддає слаги, а не номери", async () => {
    for (const [buildParams, count] of [[buildStaticParams2024, 391], [buildStaticParams2014, 525]] as const) {
      const keys = (await buildParams()).map((entry) => entry.spellId);
      expect(keys).toHaveLength(count);
      expect(keys.filter((key) => /^\d+$/.test(key))).toEqual([]);
      expect(new Set(keys).size).toBe(count);
    }
  });

  it("sitemap містить заклинання обох редакцій за слагом і жодного за номером", () => {
    const urls = sitemap().map((entry) => entry.url);

    expect(urls).toContain("https://char.holota.family/spells/mage-hand");
    expect(urls).toContain("https://char.holota.family/2024/spells/produce-flame");
    expect(urls.filter((url) => /\/spells\/\d+$/.test(url))).toEqual([]);
    for (const spell of getAllSpells("RULES_2024")) {
      expect(urls).toContain(`https://char.holota.family/2024/spells/${buildSpellKey(spell)}`);
    }
  });
});

describe("KR25.2 — посилання зі слагом розпізнається й будується тим самим модулем", () => {
  it("адреса зі слагом розпізнається в обох редакціях", () => {
    expect(findSpellLinkInHref("/2024/spells/produce-flame")).toEqual({ spellKey: "produce-flame", ruleset: "RULES_2024" });
    expect(findSpellLinkInHref("/spells/mage-hand")).toEqual({ spellKey: "mage-hand", ruleset: "RULES_2014" });
    expect(findSpellLinkInHref("/no-ai/2024/spells/produce-flame")?.ruleset).toBe("RULES_2024");
    expect(findSpellLinkInHref("/2024/spells")).toBeNull();
    expect(findSpellLinkInHref("/2024/classes/wizard")).toBeNull();
  });

  it("рядок заклинання 2024 дає слаг, рядок 2014 — номер, і адреса будується з ключа", () => {
    const link2024 = buildSpellLinkForSpell({ spellId: 1700, engName: "Produce Flame", ruleset: "RULES_2024" });
    const link2014 = buildSpellLinkForSpell({ spellId: mageHand.spellId, engName: "Mage Hand", ruleset: "RULES_2014" });

    expect(buildSpellHref(link2024)).toBe("/2024/spells/produce-flame");
    expect(buildSpellHref(link2014)).toBe(`/spells/${mageHand.spellId}`);
    expect(findSpellLinkInHref(buildSpellHref(link2024))).toEqual(link2024);
  });
});
