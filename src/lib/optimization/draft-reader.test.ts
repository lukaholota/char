import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildArticleOutline, resolveArticleLink } from "./article-view";
import { findTranslatedArticleSlug, listDraftRevisions, listDraftSummaries, readDraftArticle } from "./draft-reader";
import { joinLeadingMarkers } from "./inline-view";
import { findGlossaryMarkers } from "@/lib/refs/glossary-marker";
import type { ContentBlock, InlineNode } from "./types";
import { readSliceArticle } from "./slice-reader";

describe("читання приватних чернеток", () => {
  it("видає порожній список, коли теки з чернетками немає", async () => {
    const missing = { draftsDirectory: join(tmpdir(), "no-such-drafts-directory"), coverageLedgerPath: join(tmpdir(), "no-ledger.json") };
    await expect(listDraftSummaries(missing)).resolves.toEqual([]);
    await expect(readDraftArticle("monk-2014", missing)).resolves.toBeNull();
  });

  it("перелічує чернетки обох редакцій із кількістю розділів і оцінок", async () => {
    const summaries = await listDraftSummaries();
    expect(summaries.filter((summary) => summary.ruleset === "RULES_2014").length).toBeGreaterThanOrEqual(11);
    expect(summaries.filter((summary) => summary.ruleset === "RULES_2024").length).toBeGreaterThan(0);
    const monk = summaries.find((summary) => summary.slug === "monk-2014")!;
    expect(monk).toMatchObject({ revisionStatus: "draft", ratingCount: 134 });
    expect(monk.sectionCount).toBeGreaterThan(20);
  });

  it("повертає null для невідомої адреси", async () => {
    await expect(readDraftArticle("no-such-article")).resolves.toBeNull();
  });

  it.each(["druid-taldorei-circle-of-the-blighted-2014", "bard-taldorei-college-of-tragedy-2014", "cleric-taldorei-blood-domain-2014",
    "barbarian-juggernaut-2014", "wizard-blood-magic-2014", "barbarian-lightning-vessel-2014", "druid-steinhardts-circle-of-symbiosis-2014",
    "fighter-buccaneer-2014", "warlock-protean-2014", "wizard-valdas-gastronomy-2014", "paladin-oath-of-veneration-2014"])("excludes rejected homebrew guide: %s", async (slug) => {
    expect((await listDraftSummaries()).some((summary) => summary.slug === slug)).toBe(false);
    expect(await readDraftArticle(slug)).toBeNull();
    expect(await readSliceArticle(slug, "RULES_2014")).toBeNull();
    const draft = (await readDraftArticle("barbarian-subclasses-2014"))!;
    expect([...draft.linkTargets.values()].some((target) => target.slug === slug)).toBe(false);
  });

  it("читає статтю з оцінками, джерелом і мапою посилань на інші чернетки", async () => {
    const draft = (await readDraftArticle("monk-2014"))!;
    expect(draft.article.status).toBe("unpublished");
    expect(draft.ratings).toHaveLength(134);
    expect(draft.sourceUrl).toBe("https://rpgbot.net/dnd5/characters/classes/monk/");
    expect(draft.sourceRevision.authors).toEqual(['T.E. "RPGBOT" Kamstra']);
    expect(draft.linkTargets.get("https://rpgbot.net/dnd5/characters/classes/monk/subclasses/")?.slug).toBe("monk-subclasses-2014");
  });

  it("веде посилання за старою адресою RPGbot на перекладений гайд, якому manifest записав цю адресу", async () => {
    const alias = "https://rpgbot.net/dnd5/characters/classes/ranger/subclasses/dnd-5e-beast-master-ranger-handbook/";
    const draft = (await readDraftArticle("ranger-subclasses-2014"))!;
    expect(resolveArticleLink(alias, draft.linkTargets)).toEqual({ href: "/rules/optimization/ranger-beast-master-2014", isExternal: false });
    expect(draft.sourceUrl).toBe("https://rpgbot.net/dnd5/characters/classes/ranger/subclasses/");
    await expect(findTranslatedArticleSlug(alias, "RULES_2014")).resolves.toBe("ranger-beast-master-2014");
    await expect(findTranslatedArticleSlug(alias, "RULES_2024")).resolves.toBeNull();
  });

  it("публічна стаття 2014 не перенаправляє читача на закритий переклад 2024", async () => {
    const article = (await readDraftArticle("monk-2014"))!;
    const source = "https://rpgbot.net/2024-dnd/classes/monk/";
    expect(resolveArticleLink(source, article.linkTargets)).toEqual({ href: source, isExternal: true });
    expect([...article.linkTargets.values()].every((target) => target.ruleset === "RULES_2014")).toBe(true);
  });

  it("веде кожне посилання з якорем у розділ, який є на сторінці-цілі", async () => {
    const draft = (await readDraftArticle("monk-2014"))!;
    const hrefs = draft.revision.sections.flatMap((entry) => entry.blocks).flatMap(collectLinkHrefs);
    const resolved = hrefs.map((href) => resolveArticleLink(href, draft.linkTargets)).filter((link) => !link.isExternal && link.href.includes("#"));
    expect(resolved.length).toBeGreaterThanOrEqual(10);
    for (const link of resolved) {
      const [path, sectionId] = link.href.split("#");
      const target = (await readDraftArticle(path.split("/").pop()!))!;
      expect(buildArticleOutline(target.revision.sections).some((entry) => entry.sectionId === sectionId), link.href).toBe(true);
    }
  });

  it("кожен маркер оригіналу в чернетках покриває хоч одне слово, а не друкує англійську в тексті", async () => {
    const empty: string[] = [];
    for (const { slug, revision } of await listDraftRevisions()) {
      const groups = revision.sections.flatMap((section) => section.blocks).flatMap(collectInlineGroups);
      for (const group of groups) {
        for (const node of joinLeadingMarkers(group)) {
          for (const marker of findGlossaryMarkers(node.text)) {
            if (marker.term === "") empty.push(`${slug}: «${node.text.slice(0, 70)}» → ${marker.original}`);
          }
        }
      }
    }
    expect(empty).toEqual([]);
  }, 60_000);
});

function collectInlineGroups(block: ContentBlock): InlineNode[][] {
  if (block.type === "list") return block.items;
  if (block.type === "table") return [...block.headers, ...block.rows.flat()];
  return block.type === "paragraph" || block.type === "heading" ? [block.content] : [];
}

function collectLinkHrefs(block: ContentBlock): string[] {
  return collectInlineGroups(block).flatMap((cell) => cell.flatMap((node) => (node.type === "link" ? [node.href] : [])));
}
