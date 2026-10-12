import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it.each([
  ["bard-subclasses", "rpgbot-2d802ce63a7ef073-68bdc96f4239820f", "taldorei-college-of-tragedy"],
  ["artificer-subclasses", "rpgbot-947cab41d3f40d80-b8a04f01283a419c", "forge-adept"],
])("%s omits only the excluded guide promotion and preserves immutable source evidence", (slug, revisionId, guideSlug) => {
  const immutableSource = readFileSync(`data/rpgbot/staging/${revisionId}.json`, "utf8");
  const scopedSource = JSON.parse(readFileSync(`data/rpgbot/authoring/${slug}-2014.source.json`, "utf8"));
  const article = JSON.parse(readFileSync(`data/rpgbot/uk/rpgbot-${slug}-2014.json`, "utf8"));
  const source = JSON.parse(immutableSource);
  const omittedBlock = "block-section-beyond-the-pale-2";
  expect(immutableSource).toContain(guideSlug);
  expect(JSON.stringify(article.translations.at(-1))).not.toContain(guideSlug);
  expect(JSON.stringify(scopedSource.sections)).not.toContain(guideSlug);
  expect(scopedSource.provenance.ownerScopeOverride.omitted).toEqual([
    expect.objectContaining({ blockId: omittedBlock, sourceHref: expect.stringContaining(guideSlug) }),
  ]);
  const expectedSections = structuredClone(source.sections);
  const section = expectedSections.find((entry: { sectionId: string }) => entry.sectionId === "section-beyond-the-pale");
  section.blocks = section.blocks.filter((entry: { blockId: string }) => entry.blockId !== omittedBlock);
  expect(scopedSource.sections).toEqual(expectedSections);
  expect(article.translations.at(-1).sections.find((entry: { sectionId: string }) => entry.sectionId === "section-beyond-the-pale").blocks)
    .toHaveLength(section.blocks.length);
  expect(article.ratings.some((entry: { targetBlockId: string }) => entry.targetBlockId === omittedBlock)).toBe(false);
});
