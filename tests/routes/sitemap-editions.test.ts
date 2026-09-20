import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { getAllArmors } from "@/lib/armorData";
import { getAllBackgrounds } from "@/lib/backgroundsData";
import { getAllCreatures } from "@/lib/bestiaryData";
import { getAllInvocations } from "@/lib/invocationsData";
import { getAllMagicItems } from "@/lib/magicItemsData";
import { getAllMetamagic } from "@/lib/metamagicData";
import { toEntitySlug } from "@/lib/slug-utils";
import { getAllWeapons } from "@/lib/weaponsData";

const SITE = "https://char.holota.family";
const urls = new Set(sitemap().map((entry) => entry.url));

describe("KR31.11 / L18-release-readiness-05 — sitemap несе редакцію 2024 так само, як 2014", () => {
  it.each(["", "/magic-items", "/weapons", "/armor", "/invocations", "/metamagic", "/feats", "/bestiary", "/backgrounds", "/races", "/classes"])(
    "каталог 2024%s є в sitemap",
    (catalogPath) => {
      expect(urls).toContain(`${SITE}/2024${catalogPath}`);
    },
  );

  it("кожна окрема сторінка 2024 є в sitemap", () => {
    const expected = [
      ...getAllMagicItems("RULES_2024").map((item) => `/2024/magic-items/${item.magicItemId}`),
      ...getAllWeapons("RULES_2024").map((weapon) => `/2024/weapons/${toEntitySlug(weapon.engName)}`),
      ...getAllArmors("RULES_2024").map((armor) => `/2024/armor/${toEntitySlug(armor.engName)}`),
      ...getAllInvocations("RULES_2024").map((invocation) => `/2024/invocations/${toEntitySlug(invocation.engName)}`),
      ...getAllMetamagic("RULES_2024").map((metamagic) => `/2024/metamagic/${toEntitySlug(metamagic.engName)}`),
      ...getAllCreatures("RULES_2024").map((creature) => `/2024/bestiary/${toEntitySlug(creature.nameEng)}`),
      ...getAllBackgrounds("RULES_2024").map((background) => `/2024/backgrounds/${background.slug}`),
    ];

    expect(expected.length).toBeGreaterThan(500);
    expect(expected.filter((path) => !urls.has(`${SITE}${path}`))).toEqual([]);
  });

  it("сторінки 2014 лишаються на місці", () => {
    expect(urls).toContain(`${SITE}/weapons/${toEntitySlug(getAllWeapons("RULES_2014")[0].engName)}`);
    expect(urls).toContain(`${SITE}/magic-items/${getAllMagicItems()[0].magicItemId}`);
  });
});
