import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { toEntitySlug } from "@/lib/slug-utils";
import { getAllWeapons, getWeaponByIdOrSlug } from "@/lib/weaponsData";
import { getAllArmors, getArmorByIdOrSlug } from "@/lib/armorData";
import { getAllInfusions, getInfusionByIdOrSlug } from "@/lib/infusionsData";
import { getAllInvocations, getInvocationByIdOrSlug } from "@/lib/invocationsData";
import {
  generateStaticParams as generateWeapons2014Params,
  generateMetadata as generateWeapons2014Metadata,
} from "@/app/weapons/[slug]/page";
import {
  generateStaticParams as generateWeapons2024Params,
  generateMetadata as generateWeapons2024Metadata,
} from "@/app/2024/weapons/[slug]/page";
import {
  generateStaticParams as generateArmor2014Params,
  generateMetadata as generateArmor2014Metadata,
} from "@/app/armor/[slug]/page";
import {
  generateStaticParams as generateArmor2024Params,
  generateMetadata as generateArmor2024Metadata,
} from "@/app/2024/armor/[slug]/page";
import {
  generateStaticParams as generateInfusions2014Params,
  generateMetadata as generateInfusions2014Metadata,
} from "@/app/infusions/[slug]/page";
import {
  generateStaticParams as generateInvocations2014Params,
  generateMetadata as generateInvocations2014Metadata,
} from "@/app/invocations/[slug]/page";
import {
  generateStaticParams as generateInvocations2024Params,
  generateMetadata as generateInvocations2024Metadata,
} from "@/app/2024/invocations/[slug]/page";
import sitemap from "@/app/sitemap";

describe("Entity Slug Utilities", () => {
  it("correctly converts English entity names to kebab-case slugs", () => {
    expect(toEntitySlug("Longsword")).toBe("longsword");
    expect(toEntitySlug("Hand Crossbow")).toBe("hand-crossbow");
    expect(toEntitySlug("Studded Leather")).toBe("studded-leather");
    expect(toEntitySlug("Armor of Shadows")).toBe("armor-of-shadows");
    expect(toEntitySlug("Thief of Five Fates")).toBe("thief-of-five-fates");
    expect(toEntitySlug("Replicate Magic Item")).toBe("replicate-magic-item");
    expect(toEntitySlug("Eldritch Spear")).toBe("eldritch-spear");
  });

  it("handles empty or special strings safely", () => {
    expect(toEntitySlug("")).toBe("");
    expect(toEntitySlug("  Greatsword  ")).toBe("greatsword");
    expect(toEntitySlug("Devil's Sight")).toBe("devils-sight");
  });
});

describe("Weapons SSG & Routing", () => {
  it("generates static params for all 2014 weapons", async () => {
    const params = await generateWeapons2014Params();
    const weapons = getAllWeapons("RULES_2014");
    expect(params.length).toBe(weapons.length);
    const slugs = params.map((p) => p.slug);
    expect(slugs.every((slug) => Number.isNaN(Number(slug)))).toBe(true);
    expect(slugs).toContain("longsword");
    expect(slugs).toContain("dagger");
    expect(slugs).toContain("shortbow");
  });

  it("generates static params for all 2024 weapons", async () => {
    const params = await generateWeapons2024Params();
    const weapons = getAllWeapons("RULES_2024");
    expect(params.length).toBe(weapons.length);
    const slugs = params.map((p) => p.slug);
    expect(slugs).toContain("longsword");
    expect(slugs).toContain("musket");
  });

  it("generates metadata for valid 2014 weapon and handles missing weapon", async () => {
    const meta = await generateWeapons2014Metadata({
      params: Promise.resolve({ slug: "longsword" }),
    });
    expect(meta.title).toContain("Довгий меч");
    expect(meta.title).toContain("[Longsword]");
    expect(meta.openGraph?.type).toBe("article");

    const notFoundMeta = await generateWeapons2014Metadata({
      params: Promise.resolve({ slug: "unknown-weapon" }),
    });
    expect(notFoundMeta.title).toBe("Зброю не знайдено");
  });

  it("generates metadata for 2024 weapon including mastery info", async () => {
    const meta = await generateWeapons2024Metadata({
      params: Promise.resolve({ slug: "longsword" }),
    });
    expect(meta.title).toContain("(2024)");
    expect(meta.title).toContain("Довгий меч");
    expect(meta.description).toContain("Майстерність");
  });

  it("resolves weapons by slug, numeric ID, code and Ukrainian name", () => {
    const bySlug = getWeaponByIdOrSlug("longsword", "RULES_2014");
    expect(bySlug).toBeDefined();
    expect(bySlug?.engName).toBe("Longsword");

    const byId = getWeaponByIdOrSlug(String(bySlug!.id), "RULES_2014");
    expect(byId?.engName).toBe("Longsword");

    const byCode = getWeaponByIdOrSlug("LONGSWORD", "RULES_2014");
    expect(byCode?.engName).toBe("Longsword");

    const byNameUa = getWeaponByIdOrSlug("Довгий меч", "RULES_2014");
    expect(byNameUa?.engName).toBe("Longsword");
  });
});

describe("Armor SSG & Routing", () => {
  it("generates static params for all 2014 armors", async () => {
    const params = await generateArmor2014Params();
    const armors = getAllArmors("RULES_2014");
    expect(params.length).toBe(armors.length);
    const slugs = params.map((p) => p.slug);
    expect(slugs).toContain("leather");
    expect(slugs).toContain("shield");
  });

  it("generates static params for all 2024 armors", async () => {
    const params = await generateArmor2024Params();
    const armors = getAllArmors("RULES_2024");
    expect(params.length).toBe(armors.length);
    const slugs = params.map((p) => p.slug);
    expect(slugs).toContain("studded-leather-armor");
    expect(slugs).toContain("shield");
  });

  it("generates metadata for valid armor and handles missing armor", async () => {
    const meta = await generateArmor2014Metadata({
      params: Promise.resolve({ slug: "shield" }),
    });
    expect(meta.title).toContain("Щит");
    expect(meta.title).toContain("[Shield]");

    const notFoundMeta = await generateArmor2014Metadata({
      params: Promise.resolve({ slug: "quantum-force-field" }),
    });
    expect(notFoundMeta.title).toBe("Обладунок не знайдено");
  });

  it("generates metadata for 2024 armor and handles missing armor", async () => {
    const meta = await generateArmor2024Metadata({
      params: Promise.resolve({ slug: "shield" }),
    });
    expect(meta.title).toContain("(2024)");
    expect(meta.title).toContain("Щит");
  });

  it("resolves armor by slug, numeric ID, code and Ukrainian name", () => {
    const bySlug = getArmorByIdOrSlug("plate", "RULES_2014");
    expect(bySlug).toBeDefined();
    expect(bySlug?.engName).toBe("Plate");

    const byId = getArmorByIdOrSlug(String(bySlug!.id), "RULES_2014");
    expect(byId?.engName).toBe("Plate");

    const byNameUa = getArmorByIdOrSlug("Лати", "RULES_2014");
    expect(byNameUa?.engName).toBe("Plate");
  });
});

describe("Infusions SSG & Routing", () => {
  it("generates static params for all 2014 infusions", async () => {
    const params = await generateInfusions2014Params();
    const infusions = getAllInfusions();
    expect(params.length).toBe(infusions.length);
    const slugs = params.map((p) => p.slug);
    expect(slugs).toContain("enhanced-defense");
    expect(slugs).toContain("replicate-bag-of-holding");
  });

  it("generates metadata for valid infusion and handles missing infusion", async () => {
    const meta = await generateInfusions2014Metadata({
      params: Promise.resolve({ slug: "enhanced-defense" }),
    });
    expect(meta.title).toContain("Покращений захист");
    expect(meta.title).toContain("Вливання винахідника");

    const notFoundMeta = await generateInfusions2014Metadata({
      params: Promise.resolve({ slug: "non-existent-infusion" }),
    });
    expect(notFoundMeta.title).toBe("Вливання не знайдено");
  });

  it("resolves infusions by slug, numeric ID and Ukrainian name", () => {
    const bySlug = getInfusionByIdOrSlug("enhanced-defense");
    expect(bySlug).toBeDefined();
    expect(bySlug?.engName).toBe("Enhanced Defense");

    const byId = getInfusionByIdOrSlug(String(bySlug!.id));
    expect(byId?.engName).toBe("Enhanced Defense");

    const byNameUa = getInfusionByIdOrSlug("Покращений захист");
    expect(byNameUa?.engName).toBe("Enhanced Defense");
  });
});

describe("Invocations SSG & Routing", () => {
  it("generates static params for all 2014 invocations", async () => {
    const params = await generateInvocations2014Params();
    const invocations = getAllInvocations("RULES_2014");
    expect(params.length).toBe(invocations.length);
    const slugs = params.map((p) => p.slug);
    expect(slugs).toContain("agonizing-blast");
    expect(slugs).toContain("armor-of-shadows");
  });

  it("generates static params for all 2024 invocations", async () => {
    const params = await generateInvocations2024Params();
    const invocations = getAllInvocations("RULES_2024");
    expect(params.length).toBe(invocations.length);
    const slugs = params.map((p) => p.slug);
    expect(slugs).toContain("agonizing-blast");
  });

  it("generates metadata for valid invocation and handles missing invocation", async () => {
    const meta = await generateInvocations2014Metadata({
      params: Promise.resolve({ slug: "agonizing-blast" }),
    });
    expect(meta.title).toContain("Мучливий вибух");
    expect(meta.title).toContain("Таємнича відозва");

    const notFoundMeta = await generateInvocations2014Metadata({
      params: Promise.resolve({ slug: "random-fake-invocation" }),
    });
    expect(notFoundMeta.title).toBe("Відозву не знайдено");
  });

  it("generates metadata for 2024 invocation and handles missing invocation", async () => {
    const meta = await generateInvocations2024Metadata({
      params: Promise.resolve({ slug: "agonizing-blast" }),
    });
    expect(meta.title).toContain("(2024)");
    expect(meta.title).toContain("Мучливий вибух");
  });

  it("resolves invocations by slug, numeric ID and Ukrainian name", () => {
    const bySlug = getInvocationByIdOrSlug("devils-sight", "RULES_2014");
    expect(bySlug).toBeDefined();
    expect(bySlug?.engName).toBe("Devil's Sight");

    const byId = getInvocationByIdOrSlug(String(bySlug!.id), "RULES_2014");
    expect(byId?.engName).toBe("Devil's Sight");

    const byNameUa = getInvocationByIdOrSlug("Зір диявола", "RULES_2014");
    expect(byNameUa?.engName).toBe("Devil's Sight");
  });
});

describe("Sitemap Completeness", () => {
  it("contains all individual SSG URLs for weapons, armor, infusions, and invocations", () => {
    const items = sitemap();
    const urls = items.map((i) => i.url);

    expect(urls).toContain("https://char.holota.family/weapons/longsword");
    expect(urls).toContain("https://char.holota.family/armor/shield");
    expect(urls).toContain("https://char.holota.family/infusions/enhanced-defense");
    expect(urls).toContain("https://char.holota.family/invocations/agonizing-blast");

    const weapons2014 = getAllWeapons("RULES_2014");
    for (const w of weapons2014) {
      expect(urls).toContain(`https://char.holota.family/weapons/${toEntitySlug(w.engName)}`);
    }

    const armors2014 = getAllArmors("RULES_2014");
    for (const a of armors2014) {
      expect(urls).toContain(`https://char.holota.family/armor/${toEntitySlug(a.engName)}`);
    }

    const infusions = getAllInfusions();
    for (const inf of infusions) {
      expect(urls).toContain(`https://char.holota.family/infusions/${toEntitySlug(inf.engName)}`);
    }

    const invocations2014 = getAllInvocations("RULES_2014");
    for (const inv of invocations2014) {
      expect(urls).toContain(`https://char.holota.family/invocations/${toEntitySlug(inv.engName)}`);
    }
  });
});
