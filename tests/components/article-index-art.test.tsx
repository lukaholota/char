// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { NoAiModeProvider } from "@/components/no-ai/NoAiModeProvider";
import { ArticleIndex } from "@/components/optimization/ArticleIndex";
import type { DraftSummary } from "@/lib/optimization/article-view";

const mocks = vi.hoisted(() => ({ pathname: "/rules/optimization" }));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname, useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }), useSearchParams: () => new URLSearchParams() }));

afterEach(() => { cleanup(); window.history.replaceState({}, "", "/"); mocks.pathname = "/rules/optimization"; });

function buildSummary(slug: string, titleUk: string, imageSrc: string | null): DraftSummary {
  return { articleId: `rpgbot-${slug}`, slug, ruleset: "RULES_2014", titleUk, titleEn: titleUk, topics: ["Бард", "підклас"], revisionStatus: "draft", sectionCount: 3, ratingCount: 2, imageSrc } as DraftSummary;
}

function renderIndexAt(pathname: string) {
  mocks.pathname = pathname;
  window.history.replaceState({}, "", pathname);
  const summaries = [buildSummary("bard-glamour-2014", "Колегія гламуру", "/images/subclasses/bard-glamour.webp"), buildSummary("bard-spells-2014", "Заклинання Барда", null)];
  return render(<NoAiModeProvider><ArticleIndex ruleset="RULES_2014" summaries={summaries} ruleCategories={[]} /></NoAiModeProvider>);
}

function findCardImageUrls(container: HTMLElement): string[] {
  return [...container.querySelectorAll("li img")].map((image) => decodeURIComponent(image.getAttribute("src") ?? ""));
}

describe("арт на картках статей RPGbot", () => {
  it("малює арт підкласу лише на картці, у якої він є", () => {
    const { container } = renderIndexAt("/rules/optimization");
    expect(findCardImageUrls(container)).toEqual([expect.stringContaining("/images/subclasses/bard-glamour.webp")]);
  });

  it("без ШІ лишає старий вигляд карток", () => {
    const { container } = renderIndexAt("/no-ai/rules/optimization");
    expect(findCardImageUrls(container)).toEqual([]);
  });
});
