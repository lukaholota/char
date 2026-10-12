import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import FeatureDescriptionPage from "@/app/rules/features/[catalog]/[slug]/page";
import { readingReferenceHref } from "@/lib/optimization/reading-reference-href";

vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("404"); } }));
vi.mock("@/components/no-ai/ModeLink", () => ({ ModeLink: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("@/components/ui/FormattedDescription", () => ({ FormattedDescription: ({ content }: { content: string }) => <p>{content}</p> }));

it("opens the complete Kenku forgery rules with their source", async () => {
  const page = await FeatureDescriptionPage({ params: Promise.resolve({ catalog: "races", slug: "expert-forgery" }) });
  const rendered = renderToStaticMarkup(page);
  expect(rendered).toContain("відтворювати почерк і вироби інших істот");
  expect(rendered).toContain("на всі перевірки для створення підробок або копій наявних предметів");
  expect(rendered).toContain("с. 109");
  expect(rendered).not.toContain("Аналіз RPGbot");
});

it("prefers the reviewed source-complete Roving rules over the older duplicate seed", async () => {
  const page = await FeatureDescriptionPage({ params: Promise.resolve({ catalog: "classes", slug: "deft-explorer-roving" }) });
  const rendered = renderToStaticMarkup(page);
  expect(rendered.match(/<section /g)).toHaveLength(1);
  expect(rendered).toContain("5 футів");
  expect(rendered).toContain("Джерело");
  expect(rendered).not.toContain("Спритний дослідник");
});

it.each(["classes", "races", "feats"])("maps supplemental %s links to a complete reading page", (catalog) => {
  expect(readingReferenceHref(`/${catalog}?reference=expert-forgery`)).toBe(`/rules/features/${catalog}/expert-forgery`);
});

it.each(["/races/kenku", "/classes/monk/features/ki", "/magic-items?reference=armblade", "/races?reference=expert-forgery&ruleset=RULES_2024", "https://example.com/classes?reference=ki"])("preserves the existing target %s", (href) => {
  expect(readingReferenceHref(href)).toBe(href);
});

it.each([
  { catalog: "magic-items", slug: "expert-forgery" },
  { catalog: "races", slug: "missing-feature" },
  { catalog: "constructor", slug: "expert-forgery" },
])("rejects unsupported or unknown feature addresses: %j", async (params) => {
  await expect(FeatureDescriptionPage({ params: Promise.resolve(params) })).rejects.toThrow("404");
});
