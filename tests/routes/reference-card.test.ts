import { expect, it, vi } from "vitest";
import { GET } from "@/app/api/reference-card/route";
import { readDraftArticle } from "@/lib/optimization/draft-reader";
import { hydrateArticleDocument } from "@/lib/optimization/hydration-catalog";
import { dropFetchedReferenceText, findReferenceCardTarget } from "@/lib/optimization/reference-card-target";

vi.mock("server-only", () => ({}));

const readCard = (href: string) => GET(new Request(`http://local/api/reference-card?${new URLSearchParams({ href })}`));

it.each(["bard-2014", "druid-2014", "wizard-2014"])("serves a catalog card for every card link in %s and leaves its text out of the page", async (slug) => {
  const draft = (await readDraftArticle(slug))!;
  const { contentReferences } = await hydrateArticleDocument({ article: draft.article, translations: [draft.revision] });
  const cardReferences = contentReferences.filter((reference) => findReferenceCardTarget(reference));
  expect(cardReferences.length).toBeGreaterThan(5);
  const responses = await Promise.all(cardReferences.map(async (reference) => [reference.href, (await readCard(reference.href)).status] as const));
  expect(responses.filter(([, status]) => status !== 200)).toEqual([]);
  expect(cardReferences.map(dropFetchedReferenceText).every((reference) => reference.description === undefined)).toBe(true);
}, 60_000);

it("answers subclass links with the whole class so the reader can go back to it", async () => {
  const response = await readCard("/classes?class=bard&subclass=college-of-valor");
  const card = await response.json();
  expect(card.catalog).toBe("class");
  expect(card.characterClass.subclasses.some((subclass: { slug: string }) => subclass.slug === "college-of-valor")).toBe(true);
  expect(response.headers.get("cache-control")).toContain("public");
});

it("rejects links that are not catalog cards", async () => {
  for (const href of ["/classes?class=monk&feature=martial-arts-1", "/classes?reference=archery", "/spells/fireball", "https://example.com/feats?feat=1", "/feats?feat=999999"]) {
    expect((await readCard(href)).status, href).toBe(404);
  }
});
