import { describe, expect, it } from "vitest";
import rules2014 from "@/lib/generated/rules-2014.json";
import rules2024 from "@/lib/generated/rules-2024.json";
import { listTocSubsections } from "@/components/rules/toc-sections";

describe("зміст правил", () => {
  it.each([
    rules2014.find((article) => article.slug === "conditions")!,
    rules2024.find((article) => article.slug === "concentration")!,
    rules2024.find((article) => article.slug === "area-of-effect")!,
  ])("не повторює батьківський заголовок $title і зберігає вихідні anchors", (article) => {
    const original = JSON.stringify(article);
    expect(article.subsections.some((section) => section.title === article.title)).toBe(true);
    expect(listTocSubsections(article).some((section) => section.title === article.title)).toBe(false);
    expect(JSON.stringify(article)).toBe(original);
  });
});
