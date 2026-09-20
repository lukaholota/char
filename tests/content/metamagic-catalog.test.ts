import { describe, expect, it } from "vitest";
import { getAllMetamagic, getMetamagicByIdOrSlug } from "@/lib/metamagicData";
import { describeMetamagicCost } from "@/lib/metamagic-cost";
import {
  generateMetadata as generateMetamagic2014Metadata,
  generateStaticParams as generateMetamagic2014Params,
} from "@/app/metamagic/[slug]/page";
import {
  generateMetadata as generateMetamagic2024Metadata,
  generateStaticParams as generateMetamagic2024Params,
} from "@/app/2024/metamagic/[slug]/page";
import sourceSlice from "../fixtures/5etools/metamagic-2014-slice.json";

const SOURCE_BY_5ETOOLS_CODE: Record<string, string> = { PHB: "PHB", TCE: "TCOE" };

describe("O35 — каталог метамагії", () => {
  it("має по 10 варіантів у кожній редакції", () => {
    expect(getAllMetamagic("RULES_2014")).toHaveLength(10);
    expect(getAllMetamagic("RULES_2024")).toHaveLength(10);
  });

  it("бере джерело 2014 з книги, де варіант надруковано", () => {
    const expected = Object.fromEntries(
      sourceSlice.optionalfeature.map((option) => [option.name, SOURCE_BY_5ETOOLS_CODE[option.source]])
    );
    const actual = Object.fromEntries(getAllMetamagic("RULES_2014").map((option) => [option.engName, option.source]));

    expect(actual).toEqual(expected);
  });

  it("тримає ціну редакції: Heightened 3 у 2014 і 2 у 2024, Twinned 2014 — за рівнем заклинання", () => {
    expect(getMetamagicByIdOrSlug("heightened-spell", "RULES_2014")?.cost).toBe(3);
    expect(getMetamagicByIdOrSlug("heightened-spell", "RULES_2024")?.cost).toBe(2);
    expect(getMetamagicByIdOrSlug("twinned-spell", "RULES_2014")?.isCostSpellLevel).toBe(true);
    expect(getMetamagicByIdOrSlug("twinned-spell", "RULES_2024")?.isCostSpellLevel).toBe(false);
  });

  it("підписує ціну з правильною формою слова", () => {
    expect(describeMetamagicCost({ cost: 1, isCostSpellLevel: false })).toBe("1 очко чародійства");
    expect(describeMetamagicCost({ cost: 2, isCostSpellLevel: false })).toBe("2 очки чародійства");
    expect(describeMetamagicCost({ cost: 5, isCostSpellLevel: false })).toBe("5 очок чародійства");
    expect(describeMetamagicCost({ cost: 1, isCostSpellLevel: true })).toBe("Очки чародійства = рівень заклинання");
  });

  it("знаходить варіант за слагом, id і українською назвою", () => {
    const bySlug = getMetamagicByIdOrSlug("quickened-spell", "RULES_2014");
    expect(bySlug?.nameUa).toBe("Пришвидшене заклинання");
    expect(getMetamagicByIdOrSlug(String(bySlug?.id), "RULES_2014")?.engName).toBe("Quickened Spell");
    expect(getMetamagicByIdOrSlug("Пришвидшене заклинання", "RULES_2024")?.engName).toBe("Quickened Spell");
  });

  it("будує статичну сторінку на кожен варіант обох редакцій", async () => {
    expect((await generateMetamagic2014Params()).map((param) => param.slug)).toContain("seeking-spell");
    expect(await generateMetamagic2024Params()).toHaveLength(10);
  });

  it("дає сторінці назву й редакцію в метаданих, а невідомому слагу — «не знайдено»", async () => {
    const meta2014 = await generateMetamagic2014Metadata({ params: Promise.resolve({ slug: "subtle-spell" }) });
    const meta2024 = await generateMetamagic2024Metadata({ params: Promise.resolve({ slug: "subtle-spell" }) });
    const missing = await generateMetamagic2014Metadata({ params: Promise.resolve({ slug: "no-such-spell" }) });

    expect(meta2014.title).toBe("Приховане заклинання [Subtle Spell] — Метамагія");
    expect(meta2024.title).toContain("(2024)");
    expect(meta2024.alternates?.canonical).toContain("/2024/metamagic/subtle-spell");
    expect(missing.title).toBe("Метамагію не знайдено");
  });
});
